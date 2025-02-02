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

    private string $pathToDelete;

    public function __construct(string $pathToDelete)
    {
        $this->pathToDelete = $pathToDelete;
    }

    public function handle(): void
    {
        // Delete the specific temp file - remove s3:// prefix if present
        $pathToDelete = str_replace('s3://', '', $this->pathToDelete);
        try {
            if (Storage::disk('s3')->exists($pathToDelete)) {
                $deleted = Storage::disk('s3')->delete($pathToDelete);
                if (!$deleted) {
                    Log::warning("Failed to delete temp file", [
                        'path' => $pathToDelete
                    ]);
                }
            } else {
                Log::warning("Temp file not found for deletion", [
                    'path' => $pathToDelete
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Error deleting temp file", [
                'path' => $pathToDelete,
                'exception' => $e->getMessage()
            ]);
        }

        // List all files in the temp/snapshots directory
        $tempFiles = Storage::disk('s3')->files('temp/snapshots');
        
        // Delete any files older than 24 hours
        foreach ($tempFiles as $file) {
            try {
                $lastModified = Storage::disk('s3')->lastModified($file);
                if ($lastModified && (time() - $lastModified) > 86400) {
                    Storage::disk('s3')->delete($file);
                }
            } catch (\Exception $e) {
                Log::warning("Failed to cleanup temp file: {$file}", [
                    'exception' => $e->getMessage()
                ]);
            }
        }

        // Try to delete the directory if it's empty
        try {
            $remainingFiles = Storage::disk('s3')->files('temp/snapshots');
            if (empty($remainingFiles)) {
                Storage::disk('s3')->deleteDirectory('temp/snapshots');
            }
        } catch (\Exception $e) {
            Log::warning("Failed to cleanup temp directory", [
                'exception' => $e->getMessage()
            ]);
        }
    }
} 