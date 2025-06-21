<?php

namespace App\Jobs;

use App\Models\Book;
use App\Models\User;
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
    public $timeout = 600; // Increased to 10 minutes

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
    public $uniqueFor = 600; // Increased to 10 minutes

    /**
     * Get the middleware the job should pass through.
     *
     * @return array
     */
    public function middleware()
    {
        return [new WithoutOverlapping($this->uniqueId())];
    }

    public function retryAfter()
    {
        // Exponential backoff: 1 minute, 2 minutes, 4 minutes, 8 minutes, 16 minutes
        return [60, 120, 240, 480, 960];
    }

    public function backoff()
    {
        // Use exponential backoff for retries
        return [60, 120, 240, 480, 960];
    }

    protected string $videoUrl;

    protected float $timeInSeconds;

    protected Book $book;

    protected User $user;

    protected int $pageId;

    public function __construct(
        string $videoUrl,
        float $timeInSeconds,
        Book $book,
        User $user,
        int $pageId
    ) {
        $this->videoUrl = $videoUrl;
        $this->timeInSeconds = $timeInSeconds;
        $this->book = $book;
        $this->user = $user;
        $this->pageId = $pageId;
    }

    public function handle(): void
    {
        Log::info('Starting CreateVideoSnapshot job', [
            'video_url' => $this->videoUrl,
            'time_in_seconds' => $this->timeInSeconds,
            'book_id' => $this->book->id,
            'user_id' => $this->user->id,
            'page_id' => $this->pageId,
            'attempt' => $this->attempts(),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'disk_free_space' => disk_free_space(storage_path('app')),
            'disk_total_space' => disk_total_space(storage_path('app')),
        ]);

        // Check system resources before processing
        $freeSpace = disk_free_space(storage_path('app'));
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = $this->getMemoryLimitInBytes();

        Log::info('System resource check for CreateVideoSnapshot', [
            'freeSpace' => $freeSpace,
            'memoryUsage' => $memoryUsage,
            'memoryLimit' => $memoryLimit,
            'availableMemory' => $memoryLimit - $memoryUsage,
        ]);

        // Check if we have enough memory available (at least 512MB)
        if (($memoryLimit - $memoryUsage) < (512 * 1024 * 1024)) {
            Log::error('Insufficient memory for video snapshot creation', [
                'availableMemory' => $memoryLimit - $memoryUsage,
                'required' => 512 * 1024 * 1024,
                'attempt' => $this->attempts(),
            ]);
            throw new \RuntimeException('Insufficient memory for video snapshot creation');
        }

        $tempVideoPath = null;
        $tempImagePath = null;

        try {
            // Ensure temp directory exists and is writable
            $tempDir = storage_path('app/temp');
            if (! is_dir($tempDir)) {
                if (! mkdir($tempDir, 0755, true)) {
                    throw new \Exception("Failed to create temp directory: {$tempDir}");
                }
            }

            if (! is_writable($tempDir)) {
                throw new \Exception("Temp directory is not writable: {$tempDir}");
            }

            $timestamp = now()->format('Ymd_His');
            $random = Str::random(8);

            $tempVideoPath = "temp/temp_video_{$timestamp}_{$random}.mp4";
            $tempImagePath = "temp/snapshot_{$timestamp}_{$random}.jpg";

            // Download video to temp file
            $videoContent = file_get_contents($this->videoUrl);
            if ($videoContent === false) {
                throw new \Exception("Failed to download video from URL: {$this->videoUrl}");
            }

            // Save video file and verify it exists and has content
            if (! Storage::disk('local')->put($tempVideoPath, $videoContent)) {
                throw new \Exception('Failed to save video to temp file');
            }

            $videoSize = Storage::disk('local')->size($tempVideoPath);
            if ($videoSize === 0) {
                throw new \Exception('Downloaded video file is empty');
            }

            $fullVideoPath = storage_path('app/'.$tempVideoPath);
            if (! file_exists($fullVideoPath)) {
                throw new \Exception("Video file not found at expected path: {$fullVideoPath}");
            }

            // Extract frame using FFmpeg
            try {
                $ffmpeg = FFMpeg::fromDisk('local');
                $media = $ffmpeg->open($tempVideoPath);

                // Get video duration and validate timestamp with more precision
                $duration = $media->getDurationInSeconds();
                $timestamp = (float) $this->timeInSeconds;

                // If timestamp is beyond duration, use the last frame
                if ($timestamp >= $duration) {
                    $timestamp = max(0, $duration - 0.1); // Get frame slightly before end
                    Log::info('Adjusted timestamp to end of video', [
                        'original_timestamp' => $this->timeInSeconds,
                        'adjusted_timestamp' => $timestamp,
                        'duration' => $duration,
                    ]);
                }

                // Ensure timestamp is not negative
                if ($timestamp < 0) {
                    throw new \Exception(sprintf(
                        'Invalid negative timestamp %.3f',
                        $timestamp
                    ));
                }

                // Use accurate frame seeking
                $frameContents = $media->getFrameFromSeconds($timestamp)
                    ->export()
                    ->accurate()
                    ->getFrameContents();

                // Save the frame contents to the temp image file
                if (! Storage::disk('local')->put($tempImagePath, $frameContents)) {
                    throw new \Exception('Failed to save frame contents to temp file');
                }

                // Verify snapshot quality
                if (! Storage::disk('local')->exists($tempImagePath)) {
                    throw new \Exception('Snapshot file was not created');
                }

                $fileSize = Storage::disk('local')->size($tempImagePath);
                if ($fileSize === 0) {
                    throw new \Exception('Snapshot file was created but is empty');
                }

                // Verify the file is a valid image
                $fullPath = storage_path('app/'.$tempImagePath);
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
                        'current' => memory_get_usage(true) / 1024 / 1024 .'MB',
                        'peak' => memory_get_peak_usage(true) / 1024 / 1024 .'MB',
                        'limit' => ini_get('memory_limit'),
                    ],
                    'disk_free_space' => disk_free_space(storage_path('app')) / 1024 / 1024 .'MB',
                    'temp_dir_writable' => is_writable($tempDir),
                    'temp_dir_permissions' => substr(sprintf('%o', fileperms($tempDir)), -4),
                ]);
                throw new \Exception('Failed to create snapshot: '.$e->getMessage());
            }

            // Include timestamp in final filename
            $mediaPath = 'books/'.$this->book->slug."/snapshot_{$timestamp}_{$random}.webp";

            // Create the page first
            $page = $this->book->pages()->create([
                'content' => "<p>{$this->user->name} took this screenshot from <a href='/pages/{$this->pageId}'>this video</a>.</p>",
                'media_path' => $mediaPath,
            ]);

            // Set as cover image if book doesn't have one
            if (! $this->book->cover_page) {
                $this->book->update(['cover_page' => $page->id]);
            }

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
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('CreateVideoSnapshot job failed permanently', [
            'video_url' => $this->videoUrl,
            'time_in_seconds' => $this->timeInSeconds,
            'book_id' => $this->book->id,
            'user_id' => $this->user->id,
            'page_id' => $this->pageId,
            'exception' => $exception->getMessage(),
            'exception_class' => get_class($exception),
            'trace' => $exception->getTraceAsString(),
            'final_attempt' => $this->attempts(),
            'memory_usage' => memory_get_usage(true),
            'peak_memory_usage' => memory_get_peak_usage(true),
        ]);

        // Clean up any temporary files that might have been created
        $tempDir = storage_path('app/temp/');
        if (is_dir($tempDir)) {
            $tempFiles = glob($tempDir.'temp_video_*.mp4');
            foreach ($tempFiles as $tempFile) {
                if (file_exists($tempFile) && (time() - filemtime($tempFile)) > 3600) { // Older than 1 hour
                    @unlink($tempFile);
                    Log::info('Cleaned up old temp video file', ['file' => $tempFile]);
                }
            }

            $tempImageFiles = glob($tempDir.'snapshot_*.jpg');
            foreach ($tempImageFiles as $tempFile) {
                if (file_exists($tempFile) && (time() - filemtime($tempFile)) > 3600) { // Older than 1 hour
                    @unlink($tempFile);
                    Log::info('Cleaned up old temp snapshot file', ['file' => $tempFile]);
                }
            }
        }
    }

    /**
     * Get video metadata using FFprobe
     */
    private function getVideoMetadata(string $videoPath): array
    {
        try {
            $ffprobe = FFMpeg::fromDisk('local')->open($videoPath);

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

    /**
     * Get the memory limit in bytes.
     */
    private function getMemoryLimitInBytes(): int
    {
        $memoryLimit = ini_get('memory_limit');
        if (strtolower($memoryLimit) === 'off') {
            return PHP_INT_MAX; // Unlimited if memory_limit is 'off'
        }

        // Remove the 'M' or 'G' suffix if present
        $memoryLimit = rtrim($memoryLimit, 'M');
        $memoryLimit = rtrim($memoryLimit, 'G');

        // Convert to bytes
        $memoryLimit = (int) $memoryLimit;
        if (strtolower(substr($memoryLimit, -1)) === 'g') {
            return $memoryLimit * 1024 * 1024 * 1024;
        }
        if (strtolower(substr($memoryLimit, -1)) === 'm') {
            return $memoryLimit * 1024 * 1024;
        }

        return $memoryLimit * 1024; // Default to bytes if no suffix
    }
}
