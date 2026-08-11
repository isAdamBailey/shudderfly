<?php

namespace App\Console\Commands;

use FilesystemIterator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;

class CleanupTempStorage extends Command
{
    /**
     * Scratch directories on the local disk used by the media jobs (StoreVideo,
     * StoreImage, CreateVideoSnapshot, StoreSoundAudio, GenerateCollagePdf) and
     * by uploads staged from PageController/SoundsController before a job picks
     * them up. Both trees are walked recursively — StoreSoundAudio's sources land
     * in tmp/sounds/ and GenerateCollagePdf works in temp/collage-{id}/.
     */
    private const TEMP_DIRECTORIES = ['temp', 'tmp'];

    /**
     * Uploads sit in these directories while their job waits in the queue, so the
     * default cutoff has to outlast a plausible worker outage or SQS backlog.
     * Deleting a staged source under a pending job loses the upload permanently.
     */
    private const DEFAULT_HOURS = 72;

    protected $signature = 'storage:cleanup-temp {--hours= : Delete temp files older than this many hours (default 72)} {--dry-run : List what would be deleted without deleting}';

    protected $description = 'Delete stale files left behind in the local temp storage directories';

    public function handle(): int
    {
        $hours = max(1, (int) ($this->option('hours') ?: self::DEFAULT_HOURS));
        $dryRun = (bool) $this->option('dry-run');
        $cutoff = time() - ($hours * 3600);

        $deletedFiles = 0;
        $deletedDirectories = 0;
        $deletedBytes = 0;

        foreach (self::TEMP_DIRECTORIES as $directory) {
            $root = Storage::disk('local')->path($directory);

            if (! is_dir($root)) {
                continue;
            }

            foreach ($this->collectEntries($root) as [$path, $modifiedAt]) {
                if ($modifiedAt > $cutoff) {
                    continue;
                }

                if (is_dir($path)) {
                    if (! $this->isEmptyDirectory($path)) {
                        continue;
                    }

                    if ($dryRun) {
                        $this->line('Would remove empty directory '.$path);
                        $deletedDirectories++;
                    } elseif (@rmdir($path)) {
                        $deletedDirectories++;
                    } else {
                        $this->warn('Failed to remove directory '.$path);
                    }

                    continue;
                }

                if (! is_file($path)) {
                    continue;
                }

                $size = @filesize($path) ?: 0;

                if ($dryRun) {
                    $this->line('Would delete '.$path.' ('.$this->formatBytes($size).')');
                    $deletedFiles++;
                    $deletedBytes += $size;

                    continue;
                }

                if (@unlink($path)) {
                    $deletedFiles++;
                    $deletedBytes += $size;
                } elseif (file_exists($path)) {
                    $this->warn('Failed to delete '.$path);
                }
            }
        }

        $verb = $dryRun ? 'Would delete' : 'Deleted';
        $this->info("{$verb} {$deletedFiles} temp file(s) older than {$hours}h, freeing ".$this->formatBytes($deletedBytes).'.');

        if ($deletedDirectories > 0) {
            $this->info("{$verb} {$deletedDirectories} empty temp directory(ies).");
        }

        return Command::SUCCESS;
    }

    /**
     * Walk $root child-first, pairing each entry with its modification time.
     *
     * Times are captured up front, before anything is deleted: removing a file
     * bumps its parent directory's mtime, so a directory read after its contents
     * were cleared would always look freshly modified and never be pruned.
     *
     * @return list<array{0: string, 1: int}>
     */
    private function collectEntries(string $root): array
    {
        $entries = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        $collected = [];

        foreach ($entries as $entry) {
            /** @var SplFileInfo $entry */
            $path = $entry->getPathname();

            // Stat directly rather than trusting the iterator's cache: a running
            // job may have removed the file since the directory was read.
            $modifiedAt = @filemtime($path);

            if ($modifiedAt !== false) {
                $collected[] = [$path, $modifiedAt];
            }
        }

        return $collected;
    }

    private function isEmptyDirectory(string $path): bool
    {
        return ! (new FilesystemIterator($path, FilesystemIterator::SKIP_DOTS))->valid();
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).'KB';
        }

        return round($bytes / 1024 / 1024, 1).'MB';
    }
}
