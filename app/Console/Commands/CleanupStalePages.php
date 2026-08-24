<?php

namespace App\Console\Commands;

use App\Mail\StalePagesCleanupMail;
use App\Models\Book;
use App\Models\Page;
use App\Support\SuperAdmins;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Throwable;

class CleanupStalePages extends Command
{
    private const MAX_URL_DECODE_ATTEMPTS = 3;

    /**
     * Pages scoring below this are considered stale. `read_count` is a weighted
     * popularity score, not a view tally — IncrementPageReadCount adds at least
     * 1.0 per view (more for newer pages), so for the 30-day-old pages this
     * command looks at, a score under 2 means the page was viewed at most once.
     */
    private const READ_SCORE_THRESHOLD = 2;

    protected $signature = 'pages:cleanup-stale';

    protected $description = 'Delete barely read pages older than 30 days, remove empty books, and email a report';

    public function handle(): int
    {
        $startedAt = microtime(true);
        $cutoffDate = now()->subDays(30);
        $bookIds = [];
        $deletedPages = 0;
        $deletedAssets = 0;

        Page::query()
            ->where('read_count', '<', self::READ_SCORE_THRESHOLD)
            ->where('created_at', '<', $cutoffDate)
            ->whereNotIn('id', Book::query()->whereNotNull('cover_page')->select('cover_page'))
            ->select(['id', 'book_id', 'media_path', 'media_poster'])
            ->chunkById(100, function ($pages) use (&$bookIds, &$deletedPages, &$deletedAssets) {
                foreach ($pages as $page) {
                    $bookIds[$page->book_id] = true;

                    $deletedAssets += $this->deletePageAsset($page->getRawOriginal('media_path'));
                    $deletedAssets += $this->deletePageAsset($page->getRawOriginal('media_poster'));

                    $page->delete();
                    $deletedPages++;
                }
            });

        $deletedBooks = 0;

        if ($bookIds !== []) {
            Book::query()
                ->whereIn('id', array_keys($bookIds))
                ->whereDoesntHave('pages')
                ->select(['id'])
                ->chunkById(100, function ($books) use (&$deletedBooks) {
                    foreach ($books as $book) {
                        $book->delete();
                        $deletedBooks++;
                    }
                });
        }

        $duration = round(microtime(true) - $startedAt, 2);

        $this->info("Deleted {$deletedPages} stale page(s).");
        $this->info("Deleted {$deletedAssets} page asset(s) from s3.");
        $this->info("Deleted {$deletedBooks} empty book(s).");
        $this->info("Completed in {$duration} second(s).");

        $this->mailReport([
            'readScoreThreshold' => self::READ_SCORE_THRESHOLD,
            'cutoffDate' => $cutoffDate->toDayDateTimeString(),
            'deletedPages' => $deletedPages,
            'deletedAssets' => $deletedAssets,
            'deletedBooks' => $deletedBooks,
            'duration' => $duration,
        ]);

        return Command::SUCCESS;
    }

    /**
     * @param  array<string, mixed>  $report
     */
    private function mailReport(array $report): void
    {
        // Maintenance reports go to super admins only.
        $recipients = SuperAdmins::recipients();

        if ($recipients->isEmpty()) {
            $this->warn('No super admin users found; skipping report email.');

            return;
        }

        // The deletions have already happened by now, so a mail failure must
        // not abort the command or skip the remaining recipients.
        foreach ($recipients as $recipient) {
            try {
                Mail::to($recipient->email)->send(new StalePagesCleanupMail($report));

                $this->info("Report emailed to {$recipient->email}.");
            } catch (Throwable $e) {
                report($e);

                $this->error("Failed to email report to {$recipient->email}: {$e->getMessage()}");
            }
        }
    }

    private function deletePageAsset(?string $storedValue): int
    {
        $path = $this->resolveS3KeyFromMediaPath($storedValue);

        if ($path === '') {
            return 0;
        }

        return Storage::disk('s3')->delete($path) ? 1 : 0;
    }

    private function resolveS3KeyFromMediaPath(?string $mediaPath): string
    {
        if (! is_string($mediaPath) || $mediaPath === '') {
            return '';
        }

        $resolvedPath = trim($mediaPath);

        if (
            ! preg_match('/^https?:\/\//i', $resolvedPath)
            && preg_match('/^[^\/]+\.[^\/]+\//', $resolvedPath)
        ) {
            $resolvedPath = 'https://'.$resolvedPath;
        }

        if (preg_match('/^https?:\/\//i', $resolvedPath)) {
            $parsedPath = parse_url($resolvedPath, PHP_URL_PATH);
            if (is_string($parsedPath) && $parsedPath !== '') {
                $resolvedPath = $parsedPath;
            }
        }

        // Some stored media URLs can be percent-encoded more than once.
        for ($attempt = 0; $attempt < self::MAX_URL_DECODE_ATTEMPTS; $attempt++) {
            $decoded = urldecode($resolvedPath);
            if ($decoded === $resolvedPath) {
                break;
            }

            $resolvedPath = $decoded;
        }

        $resolvedPath = trim($resolvedPath);

        if (str_contains($resolvedPath, '?')) {
            [$resolvedPath] = explode('?', $resolvedPath, 2);
        }

        return ltrim($resolvedPath, '/');
    }
}
