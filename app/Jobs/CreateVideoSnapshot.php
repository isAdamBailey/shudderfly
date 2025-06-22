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
    public $memory = 1024; // 1GB

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
        // Check system resources before processing
        $freeSpace = disk_free_space(storage_path('app'));
        $memoryUsage = memory_get_usage(true);
        $peakMemoryUsage = memory_get_peak_usage(true);

        Log::info('System resource check for CreateVideoSnapshot', [
            'video_url' => $this->videoUrl,
            'time_in_seconds' => $this->timeInSeconds,
            'attempt' => $this->attempts(),
            'freeSpace' => $freeSpace,
            'memoryUsage' => $memoryUsage,
            'memoryUsageMB' => round($memoryUsage / 1024 / 1024, 2),
            'peakMemoryUsage' => $peakMemoryUsage,
            'peakMemoryUsageMB' => round($peakMemoryUsage / 1024 / 1024, 2),
        ]);

        // Simple memory check - fail if using more than 500MB
        if ($memoryUsage > (500 * 1024 * 1024)) {
            Log::error('Memory usage too high for video snapshot creation', [
                'memoryUsageMB' => round($memoryUsage / 1024 / 1024, 2),
                'peakMemoryUsageMB' => round($peakMemoryUsage / 1024 / 1024, 2),
                'limitMB' => 500,
                'attempt' => $this->attempts(),
            ]);
            throw new \RuntimeException('Memory usage too high for video snapshot creation');
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

            // Check if video file is corrupted by trying to get basic info
            $fullVideoPath = storage_path('app/'.$tempVideoPath);
            if (! file_exists($fullVideoPath)) {
                throw new \Exception("Video file not found at expected path: {$fullVideoPath}");
            }

            // Validate video file format using file command
            $fileInfo = shell_exec("file " . escapeshellarg($fullVideoPath) . " 2>/dev/null");
            Log::info('Video file validation', [
                'file_info' => trim($fileInfo ?? 'unknown'),
                'file_size' => $videoSize,
                'file_path' => $fullVideoPath,
            ]);

            // Check temp directory space and permissions
            $tempDirSpace = disk_free_space($tempDir);
            $requiredSpace = $videoSize * 2; // Need at least 2x video size for processing
            
            if ($tempDirSpace < $requiredSpace) {
                throw new \Exception("Insufficient space in temp directory: available=" . round($tempDirSpace / 1024 / 1024, 2) . "MB, required=" . round($requiredSpace / 1024 / 1024, 2) . "MB");
            }

            Log::info('Temp directory check', [
                'temp_dir' => $tempDir,
                'available_space_mb' => round($tempDirSpace / 1024 / 1024, 2),
                'required_space_mb' => round($requiredSpace / 1024 / 1024, 2),
                'writable' => is_writable($tempDir),
                'permissions' => substr(sprintf('%o', fileperms($tempDir)), -4),
            ]);

            // Extract frame using FFmpeg
            try {
                // Check if FFmpeg is available
                $ffmpegBinary = config('laravel-ffmpeg.ffmpeg.binaries');
                $ffprobeBinary = config('laravel-ffmpeg.ffprobe.binaries');
                
                // Test if FFmpeg binaries are available
                $ffmpegAvailable = shell_exec("which {$ffmpegBinary} 2>/dev/null");
                $ffprobeAvailable = shell_exec("which {$ffprobeBinary} 2>/dev/null");
                
                if (!$ffmpegAvailable || !$ffprobeAvailable) {
                    throw new \Exception("FFmpeg binaries not found: ffmpeg=" . ($ffmpegAvailable ? 'available' : 'not found') . ", ffprobe=" . ($ffprobeAvailable ? 'available' : 'not found'));
                }
                
                $ffmpeg = FFMpeg::fromDisk('local');
                $media = $ffmpeg->open($tempVideoPath);

                // Get video duration first
                $duration = $media->getDurationInSeconds();

                // Validate video file and get stream information
                try {
                    $videoStream = $media->getVideoStream();
                    if (!$videoStream) {
                        throw new \Exception('No video stream found in file');
                    }
                    
                    $width = $videoStream->get('width');
                    $height = $videoStream->get('height');
                    $codec = $videoStream->get('codec_name');
                    
                    Log::info('Video stream information', [
                        'width' => $width,
                        'height' => $height,
                        'codec' => $codec,
                        'duration' => $duration,
                        'video_path' => $tempVideoPath,
                    ]);
                    
                    if (!$width || !$height) {
                        throw new \Exception('Invalid video dimensions');
                    }
                } catch (\Throwable $streamError) {
                    Log::error('Failed to get video stream information', [
                        'error' => $streamError->getMessage(),
                        'video_path' => $tempVideoPath,
                        'video_size' => Storage::disk('local')->size($tempVideoPath),
                    ]);
                    throw $streamError;
                }

                // Validate timestamp with more precision
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

                // Log FFmpeg operation details
                Log::info('Starting FFmpeg snapshot extraction', [
                    'video_path' => $tempVideoPath,
                    'image_path' => $tempImagePath,
                    'timestamp' => $timestamp,
                    'duration' => $duration,
                    'video_size' => Storage::disk('local')->size($tempVideoPath),
                    'ffmpeg_binary' => $ffmpegBinary,
                    'ffprobe_binary' => $ffprobeBinary,
                ]);

                // Try primary FFmpeg method
                $snapshotCreated = false;
                try {
                    // Set a timeout for the FFmpeg operation
                    set_time_limit(300); // 5 minutes timeout
                    
                    $media->getFrameFromSeconds($timestamp)
                        ->export()
                        ->accurate()
                        ->save($tempImagePath);
                    $snapshotCreated = true;
                } catch (\Throwable $ffmpegError) {
                    Log::warning('Primary FFmpeg method failed, trying fallback', [
                        'ffmpeg_error' => $ffmpegError->getMessage(),
                        'video_path' => $tempVideoPath,
                        'image_path' => $tempImagePath,
                    ]);
                    
                    // Try fallback method using direct FFmpeg command with timeout
                    $fullVideoPath = storage_path('app/'.$tempVideoPath);
                    $fullImagePath = storage_path('app/'.$tempImagePath);
                    
                    $ffmpegCommand = sprintf(
                        'timeout 300 %s -i %s -ss %.3f -vframes 1 -q:v 2 -y %s 2>&1',
                        escapeshellarg($ffmpegBinary),
                        escapeshellarg($fullVideoPath),
                        $timestamp,
                        escapeshellarg($fullImagePath)
                    );
                    
                    $output = [];
                    $returnCode = 0;
                    exec($ffmpegCommand, $output, $returnCode);
                    $outputString = implode("\n", $output);
                    
                    if ($returnCode === 0 && file_exists($fullImagePath) && filesize($fullImagePath) > 0) {
                        $snapshotCreated = true;
                        Log::info('Fallback FFmpeg method succeeded', [
                            'command' => $ffmpegCommand,
                            'output' => $outputString,
                            'file_size' => filesize($fullImagePath),
                        ]);
                    } else {
                        Log::error('Fallback FFmpeg method also failed', [
                            'command' => $ffmpegCommand,
                            'output' => $outputString,
                            'return_code' => $returnCode,
                            'file_exists' => file_exists($fullImagePath),
                            'file_size' => file_exists($fullImagePath) ? filesize($fullImagePath) : 0,
                        ]);
                        throw $ffmpegError; // Re-throw the original error
                    }
                }

                // Verify snapshot quality
                if (!$snapshotCreated || !Storage::disk('local')->exists($tempImagePath)) {
                    // Check if the file exists in the filesystem directly
                    $fullImagePath = storage_path('app/'.$tempImagePath);
                    $fileExists = file_exists($fullImagePath);
                    $fileSize = $fileExists ? filesize($fullImagePath) : 0;
                    
                    Log::error('Snapshot file verification failed', [
                        'snapshot_created' => $snapshotCreated,
                        'storage_exists' => Storage::disk('local')->exists($tempImagePath),
                        'file_exists' => $fileExists,
                        'file_size' => $fileSize,
                        'full_path' => $fullImagePath,
                        'temp_dir_contents' => array_slice(scandir(storage_path('app/temp')), 0, 10), // First 10 files
                        'video_path' => $tempVideoPath,
                        'image_path' => $tempImagePath,
                    ]);
                    
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

                Log::info('FFmpeg snapshot extraction completed successfully', [
                    'image_path' => $tempImagePath,
                    'file_size' => $fileSize,
                    'mime_type' => $mimeType,
                ]);

            } catch (\Throwable $e) {
                Log::error('FFmpeg snapshot creation failed', [
                    'exception' => $e->getMessage(),
                    'exception_class' => get_class($e),
                    'exception_trace' => $e->getTraceAsString(),
                    'video_url' => $this->videoUrl,
                    'time' => $this->timeInSeconds,
                    'temp_video_path' => $tempVideoPath,
                    'temp_image_path' => $tempImagePath,
                    'video_exists' => Storage::disk('local')->exists($tempVideoPath),
                    'video_size' => Storage::disk('local')->exists($tempVideoPath) ? Storage::disk('local')->size($tempVideoPath) : 0,
                    'memory_usage' => [
                        'current' => memory_get_usage(true) / 1024 / 1024 .'MB',
                        'peak' => memory_get_peak_usage(true) / 1024 / 1024 .'MB',
                        'limit' => ini_get('memory_limit'),
                    ],
                    'disk_free_space' => disk_free_space(storage_path('app')) / 1024 / 1024 .'MB',
                    'temp_dir_writable' => is_writable($tempDir),
                    'temp_dir_permissions' => substr(sprintf('%o', fileperms($tempDir)), -4),
                    'ffmpeg_binary' => config('laravel-ffmpeg.ffmpeg.binaries'),
                    'ffprobe_binary' => config('laravel-ffmpeg.ffprobe.binaries'),
                    'ffmpeg_timeout' => config('laravel-ffmpeg.timeout'),
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
            CleanupTempSnapshot::dispatch(null, $tempVideoPath, null);

            // Upload temp image to S3 first
            $tempS3Path = "temp/snapshots/temp_{$timestamp}_{$random}.jpg";
            Storage::disk('s3')->put($tempS3Path, Storage::disk('local')->get($tempImagePath), 'private');

            // Dispatch StoreImage job with S3 path
            StoreImage::dispatch('s3://'.$tempS3Path, $mediaPath)
                ->chain([
                    new CleanupTempSnapshot($tempS3Path, null, $tempImagePath),
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
            CleanupTempSnapshot::dispatch(null, $tempVideoPath ?? null, $tempImagePath ?? null);

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

        // Clean up any temp files that might have been created
        CleanupTempSnapshot::dispatch();
    }
}
