<?php

namespace App\Jobs;

use App\Models\Book;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;

class CreateVideoSnapshot implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 300; // 5 minutes

    /**
     * The maximum amount of memory the job should use.
     *
     * @var int
     */
    public $memory = 2048; // 2GB

    /**
     * Delete the job if its models no longer exist.
     *
     * @var bool
     */
    public $deleteWhenMissingModels = true;

    /**
     * Get the unique ID for the job.
     *
     * @return string
     */
    public function uniqueId()
    {
        return $this->videoUrl.'_'.$this->timeInSeconds.'_'.$this->book->id;
    }

    /**
     * The number of seconds after which the job's unique lock will be released.
     *
     * @var int
     */
    public $uniqueFor = 300; // 5 minutes

    /**
     * Get the middleware the job should pass through.
     *
     * @return array
     */
    public function middleware()
    {
        return [new WithoutOverlapping($this->uniqueId())];
    }

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
            try {
                $ffmpeg = FFMpeg::fromDisk('local');
                
                // Configure FFmpeg with memory limits
                $ffmpeg->getFFMpegDriver()
                    ->addOption('-memory_limit', '256M')
                    ->addOption('-max_memory', '512M');

                $ffmpeg->open($tempVideoPath)
                    ->getFrameFromSeconds($this->timeInSeconds)
                    ->export()
                    ->save($tempImagePath);

                // Verify snapshot was created and has content
                if (! Storage::disk('local')->exists($tempImagePath)) {
                    throw new \Exception('Snapshot file was not created');
                }

                $fileSize = Storage::disk('local')->size($tempImagePath);
                if ($fileSize === 0) {
                    throw new \Exception('Snapshot file was created but is empty');
                }

                // Verify the file is a valid image
                $fullPath = storage_path('app/' . $tempImagePath);
                $mimeType = mime_content_type($fullPath);
                if (! Str::startsWith($mimeType, 'image/')) {
                    throw new \Exception("Invalid snapshot file type: {$mimeType}");
                }

            } catch (\Throwable $e) {
                Log::error('FFmpeg snapshot creation failed', [
                    'exception' => $e->getMessage(),
                    'video_url' => $this->videoUrl,
                    'time' => $this->timeInSeconds,
                    'temp_video_path' => $tempVideoPath,
                    'temp_image_path' => $tempImagePath,
                    'video_exists' => Storage::disk('local')->exists($tempVideoPath),
                    'video_size' => Storage::disk('local')->exists($tempVideoPath) ? Storage::disk('local')->size($tempVideoPath) : 0,
                    'ffprobe_data' => $this->getVideoMetadata($tempVideoPath),
                    'memory_usage' => [
                        'current' => memory_get_usage(true) / 1024 / 1024 . 'MB',
                        'peak' => memory_get_peak_usage(true) / 1024 / 1024 . 'MB',
                        'limit' => ini_get('memory_limit'),
                    ],
                    'disk_free_space' => disk_free_space(storage_path('app')) / 1024 / 1024 . 'MB',
                ]);
                throw new \Exception('Failed to create snapshot: ' . $e->getMessage());
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

            // Upload temp image to S3 first
            $tempS3Path = "temp/snapshots/temp_{$timestamp}_{$random}.jpg";
            Storage::disk('s3')->put($tempS3Path, Storage::disk('local')->get($tempImagePath), 'private');

            // Clean up local temp image since it's now in S3
            if (Storage::disk('local')->exists($tempImagePath)) {
                Storage::disk('local')->delete($tempImagePath);
            }

            // Dispatch StoreImage job with S3 path
            StoreImage::dispatch('s3://'.$tempS3Path, $mediaPath)
                ->chain([
                    new CleanupTempSnapshot($tempS3Path),
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

    /**
     * Get video metadata using FFprobe
     */
    private function getVideoMetadata(string $videoPath): array
    {
        try {
            $ffprobe = FFMpeg::open($videoPath);
            return [
                'duration' => $ffprobe->getDurationInSeconds(),
                'dimensions' => $ffprobe->getVideoStream()->getDimensions(),
                'codec' => $ffprobe->getVideoStream()->get('codec_name'),
                'format' => $ffprobe->getFormat(),
            ];
        } catch (\Throwable $e) {
            return ['error' => $e->getMessage()];
        }
    }
}
