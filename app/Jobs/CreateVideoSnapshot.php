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

        try {
            $timestamp = now()->format('Ymd_His');
            $random = Str::random(8);

            $tempVideoPath = "temp/temp_video_{$timestamp}_{$random}.mp4";
            $tempImagePath = "temp/snapshot_{$timestamp}_{$random}.jpg";

            // Download video to temp file
            Storage::disk('local')->put($tempVideoPath, file_get_contents($this->videoUrl));

            // Extract frame using FFmpeg
            FFMpeg::fromDisk('local')
                ->open($tempVideoPath)
                ->getFrameFromSeconds($this->timeInSeconds)
                ->export()
                ->save($tempImagePath);

            if (Storage::disk('local')->exists($tempImagePath)) {
                // Include timestamp in final filename
                $mediaPath = 'books/'.$this->book->slug."/snapshot_{$timestamp}_{$random}.webp";

                // Pass the relative path that StoreImage expects
                StoreImage::dispatch($tempImagePath, $mediaPath);

                // Create the page
                $this->book->pages()->create([
                    'content' => '<p>This is a screenshot of one of the videos in this book.</p>',
                    'media_path' => $mediaPath,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Error creating video snapshot', [
                'exception' => $e->getMessage(),
                'video_url' => $this->videoUrl,
                'time' => $this->timeInSeconds,
            ]);
            throw $e;
        } finally {
            // Cleanup temp files using Storage facade
            Storage::disk('local')->delete($tempVideoPath);
            Storage::disk('local')->delete($tempImagePath);
        }
    }
}
