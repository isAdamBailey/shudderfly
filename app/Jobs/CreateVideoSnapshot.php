<?php

namespace App\Jobs;

use App\Models\Book;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;

class CreateVideoSnapshot implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $videoUrl;

    protected float $timeInSeconds;

    protected Book $book;

    public function __construct(
        string $videoUrl,
        float $timeInSeconds,
        Book $book
    ) {
        $this->videoUrl = $videoUrl;
        $this->timeInSeconds = $timeInSeconds;
        $this->book = $book;
    }

    public function handle(): void
    {
        $tempDir = storage_path('app/temp');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $tempVideoPath = null;
        $tempImagePath = null;

        try {
            $timestamp = now()->format('Ymd_His');
            $random = Str::random(8);

            $tempVideoPath = "temp/temp_video_{$timestamp}_{$random}.mp4";
            $tempImagePath = "temp/snapshot_{$timestamp}_{$random}.jpg";

            // Download video to temp file
            $videoContent = file_get_contents($this->videoUrl);
            if ($videoContent === false) {
                throw new \Exception("Failed to download video from URL: {$this->videoUrl}");
            }

            if (! Storage::disk('local')->put($tempVideoPath, $videoContent)) {
                throw new \Exception('Failed to save video to temp file');
            }

            // Extract frame using FFmpeg
            FFMpeg::fromDisk('local')
                ->open($tempVideoPath)
                ->getFrameFromSeconds($this->timeInSeconds)
                ->export()
                ->save($tempImagePath);

            // Verify snapshot was created
            if (! Storage::disk('local')->exists($tempImagePath)) {
                throw new \Exception('Failed to create snapshot image');
            }

            // Include timestamp in final filename
            $mediaPath = 'books/'.$this->book->slug."/snapshot_{$timestamp}_{$random}.webp";

            // Create the page first
            $page = $this->book->pages()->create([
                'content' => '<p>This is a screenshot of one of the videos in this book.</p>',
                'media_path' => $mediaPath,
            ]);

            // Clean up video file as we don't need it anymore
            if (Storage::disk('local')->exists($tempVideoPath)) {
                Storage::disk('local')->delete($tempVideoPath);
            }

            // Dispatch StoreImage job
            StoreImage::dispatch($tempImagePath, $mediaPath)
                ->chain([
                    // Only delete the temp image after StoreImage completes
                    new class($tempImagePath) implements ShouldQueue
                    {
                        use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

                        private $pathToDelete;

                        public function __construct($pathToDelete)
                        {
                            $this->pathToDelete = $pathToDelete;
                        }

                        public function handle()
                        {
                            if (Storage::disk('local')->exists($this->pathToDelete)) {
                                Storage::disk('local')->delete($this->pathToDelete);
                            }
                        }
                    },
                ]);

        } catch (\Exception $e) {
            Log::error('Error creating video snapshot', [
                'exception' => $e->getMessage(),
                'video_url' => $this->videoUrl,
                'time' => $this->timeInSeconds,
                'temp_video_path' => $tempVideoPath ?? null,
                'temp_image_path' => $tempImagePath ?? null,
            ]);

            // Clean up files in case of error
            if ($tempVideoPath && Storage::disk('local')->exists($tempVideoPath)) {
                Storage::disk('local')->delete($tempVideoPath);
            }
            if ($tempImagePath && Storage::disk('local')->exists($tempImagePath)) {
                Storage::disk('local')->delete($tempImagePath);
            }

            throw $e;
        }
    }
}
