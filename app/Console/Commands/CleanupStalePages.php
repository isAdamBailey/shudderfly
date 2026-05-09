<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Models\Page;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupStalePages extends Command
{
    private const MAX_URL_DECODE_ATTEMPTS = 3;

    protected $signature = 'pages:cleanup-stale';

    protected $description = 'Delete unread pages older than 30 days and remove empty books';

    public function handle(): int
    {
        $cutoffDate = now()->subDays(30);
        $bookIds = [];
        $deletedPages = 0;
        $deletedAssets = 0;

        Page::query()
            ->where('read_count', 0)
            ->where('created_at', '<', $cutoffDate)
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

        $this->info("Deleted {$deletedPages} stale page(s).");
        $this->info("Deleted {$deletedAssets} page asset(s) from s3.");
        $this->info("Deleted {$deletedBooks} empty book(s).");

        return Command::SUCCESS;
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

        for ($attempt = 0; $attempt < self::MAX_URL_DECODE_ATTEMPTS; $attempt++) {
            $decoded = urldecode($resolvedPath);
            if ($decoded === $resolvedPath) {
                break;
            }

            $resolvedPath = $decoded;
        }

        $resolvedPath = trim($resolvedPath);

        if (str_contains($resolvedPath, '?')) {
            $resolvedPath = (string) strstr($resolvedPath, '?', true);
        }

        return ltrim($resolvedPath, '/');
    }
}
