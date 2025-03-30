<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DeleteOldMedia implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected ?string $mediaPath;
    protected ?string $posterPath;

    public function __construct(?string $mediaPath = null, ?string $posterPath = null)
    {
        $this->mediaPath = $mediaPath;
        $this->posterPath = $posterPath;
    }

    public function handle(): void
    {
        if ($this->mediaPath && Storage::disk('s3')->exists($this->mediaPath)) {
            try {
                Storage::disk('s3')->delete($this->mediaPath);
            } catch (\Exception $e) {
                Log::error('Failed to delete old media file', [
                    'path' => $this->mediaPath,
                    'exception' => $e->getMessage(),
                ]);
            }
        }

        if ($this->posterPath && Storage::disk('s3')->exists($this->posterPath)) {
            try {
                Storage::disk('s3')->delete($this->posterPath);
            } catch (\Exception $e) {
                Log::error('Failed to delete old poster file', [
                    'path' => $this->posterPath,
                    'exception' => $e->getMessage(),
                ]);
            }
        }
    }
} 