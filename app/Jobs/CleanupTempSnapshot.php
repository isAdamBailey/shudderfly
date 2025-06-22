<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CleanupTempSnapshot implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private ?string $s3PathToDelete;

    private ?string $localVideoPath;

    private ?string $localImagePath;

    public function __construct(
        ?string $s3PathToDelete = null,
        ?string $localVideoPath = null,
        ?string $localImagePath = null
    ) {
        $this->s3PathToDelete = $s3PathToDelete;
        $this->localVideoPath = $localVideoPath;
        $this->localImagePath = $localImagePath;
    }

    public function handle(): void
    {
        // Clean up S3 temp file if specified
        if ($this->s3PathToDelete) {
            $this->cleanupS3File($this->s3PathToDelete);
        }

        // Clean up local temp files if specified
        if ($this->localVideoPath) {
            $this->cleanupLocalFile($this->localVideoPath, 'video');
        }

        if ($this->localImagePath) {
            $this->cleanupLocalFile($this->localImagePath, 'image');
        }

        // Clean up old temp files
        $this->cleanupOldTempFiles();
    }

    private function cleanupS3File(string $pathToDelete): void
    {
        // Remove s3:// prefix if present
        $pathToDelete = str_replace('s3://', '', $pathToDelete);

        try {
            if (Storage::disk('s3')->exists($pathToDelete)) {
                $deleted = Storage::disk('s3')->delete($pathToDelete);
                if (! $deleted) {
                    Log::warning('Failed to delete S3 temp file', [
                        'path' => $pathToDelete,
                    ]);
                }
            } else {
                Log::warning('S3 temp file not found for deletion', [
                    'path' => $pathToDelete,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error deleting S3 temp file', [
                'path' => $pathToDelete,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    private function cleanupLocalFile(string $filePath, string $type): void
    {
        try {
            if (Storage::disk('local')->exists($filePath)) {
                $deleted = Storage::disk('local')->delete($filePath);
                if (! $deleted) {
                    Log::warning("Failed to delete local temp {$type} file", [
                        'path' => $filePath,
                    ]);
                }
            } else {
                Log::warning("Local temp {$type} file not found for deletion", [
                    'path' => $filePath,
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Error deleting local temp {$type} file", [
                'path' => $filePath,
                'exception' => $e->getMessage(),
            ]);
        }
    }

    private function cleanupOldTempFiles(): void
    {
        // Clean up old S3 temp files
        try {
            $tempFiles = Storage::disk('s3')->files('temp/snapshots');
            foreach ($tempFiles as $file) {
                $lastModified = Storage::disk('s3')->lastModified($file);
                if ($lastModified && (time() - $lastModified) > 86400) { // 24 hours
                    Storage::disk('s3')->delete($file);
                }
            }
        } catch (\Exception $e) {
            Log::warning('Failed to cleanup old S3 temp files', [
                'exception' => $e->getMessage(),
            ]);
        }

        // Clean up old local temp files
        $tempDir = storage_path('app/temp');
        if (is_dir($tempDir)) {
            try {
                $tempVideoFiles = glob($tempDir.'/temp_video_*.mp4');
                foreach ($tempVideoFiles as $tempFile) {
                    if (file_exists($tempFile) && (time() - filemtime($tempFile)) > 3600) { // 1 hour
                        @unlink($tempFile);
                    }
                }

                $tempImageFiles = glob($tempDir.'/snapshot_*.jpg');
                foreach ($tempImageFiles as $tempFile) {
                    if (file_exists($tempFile) && (time() - filemtime($tempFile)) > 3600) { // 1 hour
                        @unlink($tempFile);
                    }
                }
            } catch (\Exception $e) {
                Log::warning('Failed to cleanup old local temp files', [
                    'exception' => $e->getMessage(),
                ]);
            }
        }

        // Try to delete empty S3 directory
        try {
            $remainingFiles = Storage::disk('s3')->files('temp/snapshots');
            if (empty($remainingFiles)) {
                Storage::disk('s3')->deleteDirectory('temp/snapshots');
            }
        } catch (\Exception $e) {
            Log::warning('Failed to cleanup S3 temp directory', [
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
