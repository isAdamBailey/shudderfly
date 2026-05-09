<?php

namespace App\Console\Commands;

use App\Models\Book;
use App\Models\Page;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CleanupStalePages extends Command
{
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
        if (! is_string($storedValue) || $storedValue === '') {
            return 0;
        }

        $path = $storedValue;
        if (Str::startsWith($storedValue, 'https://')) {
            $parsedPath = parse_url($storedValue, PHP_URL_PATH);
            if (! is_string($parsedPath) || $parsedPath === '') {
                return 0;
            }

            $path = ltrim($parsedPath, '/');
        }

        return Storage::disk('s3')->delete($path) ? 1 : 0;
    }
}
