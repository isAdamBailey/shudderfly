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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CreateVideoSnapshot implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     */
    public $timeout = 600;

    /**
     * Delete the job if its models no longer exist.
     */
    public $deleteWhenMissingModels = true;

    /**
     * The number of seconds after which the job's unique lock will be released.
     */
    public $uniqueFor = 600;

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

    /**
     * Get the unique ID for the job.
     */
    public function uniqueId(): string
    {
        return 'video_snapshot_'.md5($this->videoUrl.'_'.$this->timeInSeconds.'_'.$this->book->id.'_'.$this->user->id);
    }

    /**
     * Get the middleware the job should pass through.
     */
    public function middleware(): array
    {
        return [
            (new WithoutOverlapping($this->uniqueId()))
                ->expireAfter(600)
                ->releaseAfter(300),
        ];
    }

    /**
     * Calculate the number of seconds to wait before retrying the job.
     */
    public function backoff(): array
    {
        // Exponential backoff: 1, 2, 4 minutes (3 tries = 2 retries)
        return [60, 120, 240];
    }

    public function handle(): void
    {
        // Validate that models still exist
        if (! $this->book->exists || ! $this->user->exists) {
            Log::warning('Models no longer exist, skipping job', [
                'book_exists' => $this->book->exists,
                'user_exists' => $this->user->exists,
                'book_id' => $this->book->id ?? 'null',
                'user_id' => $this->user->id ?? 'null',
            ]);

            return;
        }

        $tempVideoPath = null;
        $tempImagePath = null;
        $successfulTimestamp = null;
        $tempS3Path = null;

        try {
            // Ensure temp directory exists and is writable
            $tempDir = storage_path('app/temp');
            if (! is_dir($tempDir) && ! mkdir($tempDir, 0755, true)) {
                throw new \RuntimeException("Failed to create temp directory: {$tempDir}");
            }

            if (! is_writable($tempDir)) {
                throw new \RuntimeException("Temp directory is not writable: {$tempDir}");
            }

            $timestamp = now()->format('Ymd_His');
            $random = Str::random(8);

            $tempVideoPath = "temp/temp_video_{$timestamp}_{$random}.mp4";
            $tempImagePath = "temp/snapshot_{$timestamp}_{$random}.jpg";

            // Download video to temp file
            $videoContent = file_get_contents($this->videoUrl);
            if ($videoContent === false) {
                throw new \RuntimeException("Failed to download video from URL: {$this->videoUrl}");
            }

            // Save video file and verify it exists and has content
            if (! Storage::disk('local')->put($tempVideoPath, $videoContent)) {
                throw new \RuntimeException('Failed to save video to temp file');
            }

            $videoSize = Storage::disk('local')->size($tempVideoPath);
            if ($videoSize === 0) {
                throw new \RuntimeException('Downloaded video file is empty');
            }

            // Check if video file exists
            $fullVideoPath = storage_path('app/'.$tempVideoPath);
            if (! file_exists($fullVideoPath)) {
                throw new \RuntimeException("Video file not found at expected path: {$fullVideoPath}");
            }

            // Check temp directory space
            $tempDirSpace = disk_free_space($tempDir);
            $requiredSpace = $videoSize * 2;

            if ($tempDirSpace < $requiredSpace) {
                throw new \RuntimeException('Insufficient space in temp directory: available='.round($tempDirSpace / 1024 / 1024, 2).'MB, required='.round($requiredSpace / 1024 / 1024, 2).'MB');
            }

            // Extract frame using FFmpeg
            try {
                // Check if FFmpeg is available
                $ffmpegBinary = config('laravel-ffmpeg.ffmpeg.binaries');
                $ffprobeBinary = config('laravel-ffmpeg.ffprobe.binaries');

                // Test if FFmpeg binaries are available
                $ffmpegAvailable = shell_exec("which {$ffmpegBinary} 2>/dev/null");
                $ffprobeAvailable = shell_exec("which {$ffprobeBinary} 2>/dev/null");

                if (! $ffmpegAvailable || ! $ffprobeAvailable) {
                    throw new \RuntimeException('FFmpeg binaries not found: ffmpeg='.($ffmpegAvailable ? 'available' : 'not found').', ffprobe='.($ffprobeAvailable ? 'available' : 'not found'));
                }

                // Get video duration using ffprobe
                $durationCommand = sprintf(
                    '%s -v quiet -show_entries format=duration -of csv=p=0 %s',
                    escapeshellarg($ffprobeBinary),
                    escapeshellarg($fullVideoPath)
                );

                $duration = (float) shell_exec($durationCommand);

                if ($duration <= 0) {
                    throw new \RuntimeException('Invalid video duration: '.$duration);
                }

                // Validate timestamp with more precision
                $requestedTimestamp = (float) $this->timeInSeconds;

                // If timestamp is beyond duration, use the last frame
                if ($requestedTimestamp >= $duration) {
                    $requestedTimestamp = max(0, $duration - 0.1);
                }

                // Ensure timestamp is not negative
                if ($requestedTimestamp < 0) {
                    $originalTimestamp = $requestedTimestamp;
                    $requestedTimestamp = 0.1;
                    Log::warning('Negative timestamp adjusted to beginning of video', [
                        'original_timestamp' => $originalTimestamp,
                        'adjusted_timestamp' => $requestedTimestamp,
                        'minimum_seconds' => 0.1,
                    ]);
                }

                // Ensure timestamp is not too close to the end of the video
                if ($requestedTimestamp >= $duration) {
                    $originalTimestamp = $requestedTimestamp;
                    $requestedTimestamp = max(0, $duration - 0.1);
                    Log::warning('Timestamp adjusted to avoid end of video', [
                        'original_timestamp' => $originalTimestamp,
                        'adjusted_timestamp' => $requestedTimestamp,
                        'video_duration' => $duration,
                        'buffer_seconds' => 0.1,
                    ]);
                }

                // Ensure timestamp is not too close to the beginning
                if ($requestedTimestamp < 0.1) {
                    $originalTimestamp = $requestedTimestamp;
                    $requestedTimestamp = 0.1;
                    Log::warning('Timestamp adjusted to avoid beginning of video', [
                        'original_timestamp' => $originalTimestamp,
                        'adjusted_timestamp' => $requestedTimestamp,
                        'minimum_seconds' => 0.1,
                    ]);
                }

                // Generate screenshot using the same logic as StoreVideo
                $fullImagePath = storage_path('app/'.$tempImagePath);

                // Ensure the output directory exists
                $outputDir = dirname($fullImagePath);
                if (! is_dir($outputDir)) {
                    mkdir($outputDir, 0755, true);
                }

                // Try multiple timestamps for better success rate
                $screenshotTimestamps = [$requestedTimestamp, 1.0, 0.5, 2.0, 0.1];
                $snapshotCreated = false;

                foreach ($screenshotTimestamps as $timestamp) {
                    try {
                        // Ensure timestamp is within video bounds
                        if ($timestamp >= $duration) {
                            $timestamp = max(0, $duration - 0.1);
                        }
                        if ($timestamp < 0.1) {
                            $timestamp = 0.1;
                        }

                        $ffmpegCommand = sprintf(
                            'timeout 60 %s -i %s -ss %.3f -vframes 1 -q:v 2 -y %s 2>&1',
                            escapeshellarg($ffmpegBinary),
                            escapeshellarg($fullVideoPath),
                            $timestamp,
                            escapeshellarg($fullImagePath)
                        );

                        $returnCode = 0;
                        exec($ffmpegCommand, $output, $returnCode);

                        if ($returnCode === 0 && file_exists($fullImagePath) && filesize($fullImagePath) > 0) {
                            $snapshotCreated = true;
                            $successfulTimestamp = $timestamp;
                            break;
                        }
                    } catch (\Throwable $timestampError) {
                        Log::warning('Failed to generate snapshot at timestamp', [
                            'timestamp' => $timestamp,
                            'error' => $timestampError->getMessage(),
                        ]);

                        continue;
                    }
                }

                if (! $snapshotCreated) {
                    Log::error('FFmpeg screenshot generation failed for all timestamps', [
                        'requested_timestamp' => $requestedTimestamp,
                        'tried_timestamps' => $screenshotTimestamps,
                        'video_duration' => $duration,
                        'video_path' => $fullVideoPath,
                    ]);
                    throw new \RuntimeException('FFmpeg screenshot generation failed for all attempted timestamps');
                }

                // Verify snapshot quality
                if (! file_exists($fullImagePath)) {
                    throw new \RuntimeException('Snapshot file was not created');
                }

                $fileSize = filesize($fullImagePath);
                if ($fileSize === 0) {
                    throw new \RuntimeException('Snapshot file was created but is empty');
                }

                // Verify the file is a valid image
                $mimeType = mime_content_type($fullImagePath);
                if (! Str::startsWith($mimeType, 'image/')) {
                    throw new \RuntimeException("Invalid snapshot file type: {$mimeType}");
                }

                // Include successful timestamp in final filename
                $mediaPath = 'books/'.$this->book->slug."/snapshot_{$successfulTimestamp}_{$random}.webp";

                // Clean up local temp video immediately (no extra job)
                try {
                    if ($tempVideoPath && Storage::disk('local')->exists($tempVideoPath)) {
                        Storage::disk('local')->delete($tempVideoPath);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Failed to delete local temp video during snapshot creation', [
                        'path' => $tempVideoPath,
                        'exception' => $e->getMessage(),
                    ]);
                }

                // Upload temp image to S3 first using streaming to avoid memory issues
                $tempS3Path = "temp/snapshots/temp_{$timestamp}_{$random}.jpg";
                $fileStream = fopen($fullImagePath, 'r');

                if ($fileStream === false) {
                    throw new \RuntimeException("Failed to open file stream for: {$fullImagePath}");
                }

                try {
                    Storage::disk('s3')->put($tempS3Path, $fileStream, 'private');
                } finally {
                    // Only close the stream if it's still valid
                    if (is_resource($fileStream)) {
                        fclose($fileStream);
                    }
                }

                // Dispatch StoreImage job (StoreImage will remove its S3 source on success)
                try {
                    StoreImage::dispatch('s3://'.$tempS3Path, $mediaPath);
                } catch (\Exception $dispatchError) {
                    Log::error('Failed to dispatch StoreImage job', [
                        'exception' => $dispatchError->getMessage(),
                        'temp_s3_path' => $tempS3Path,
                        'media_path' => $mediaPath,
                    ]);
                    // Clean up the S3 temp file and local image since dispatch failed
                    try {
                        if ($tempS3Path && Storage::disk('s3')->exists($tempS3Path)) {
                            Storage::disk('s3')->delete($tempS3Path);
                        }
                    } catch (\Throwable $cleanupError) {
                        Log::warning('Failed to delete temp S3 file after dispatch error', [
                            'path' => $tempS3Path,
                            'exception' => $cleanupError->getMessage(),
                        ]);
                    }
                    try {
                        if ($tempImagePath && Storage::disk('local')->exists($tempImagePath)) {
                            Storage::disk('local')->delete($tempImagePath);
                        }
                    } catch (\Throwable $cleanupError) {
                        Log::warning('Failed to delete local temp image after dispatch error', [
                            'path' => $tempImagePath,
                            'exception' => $cleanupError->getMessage(),
                        ]);
                    }
                    throw $dispatchError;
                }

                // Local temp image no longer needed after successful S3 upload and dispatch
                try {
                    if ($tempImagePath && Storage::disk('local')->exists($tempImagePath)) {
                        Storage::disk('local')->delete($tempImagePath);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Failed to delete local temp image during snapshot creation', [
                        'path' => $tempImagePath,
                        'exception' => $e->getMessage(),
                    ]);
                }

                // Only create database entry after successful S3 upload and job dispatch
                DB::transaction(function () use ($mediaPath) {
                    // Create the page first
                    $page = $this->book->pages()->create([
                        'content' => "<p><strong>{$this->user->name}</strong> took this screenshot from <strong><a href='/pages/{$this->pageId}'>this video</a></strong>.</p>",
                        'media_path' => $mediaPath,
                    ]);

                    // Set as cover image if book doesn't have one
                    if (! $this->book->cover_page) {
                        $this->book->update(['cover_page' => $page->id]);
                    }
                });

                // Refresh models to ensure we have latest data
                $this->book->refresh();

            } catch (\Throwable $e) {
                Log::error('FFmpeg snapshot creation failed', [
                    'exception' => $e->getMessage(),
                    'exception_class' => get_class($e),
                    'exception_trace' => $e->getTraceAsString(),
                    'video_url' => $this->videoUrl,
                    'time' => $this->timeInSeconds,
                    'temp_video_path' => $tempVideoPath,
                    'temp_image_path' => $tempImagePath,
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
                throw new \RuntimeException('Failed to create snapshot: '.$e->getMessage());
            }

        } catch (\Exception $e) {
            Log::error('Error creating video snapshot', [
                'exception' => $e->getMessage(),
                'video_url' => $this->videoUrl,
                'time' => $this->timeInSeconds,
                'temp_video_path' => $tempVideoPath ?? null,
                'temp_image_path' => $tempImagePath ?? null,
            ]);

            // Inline cleanup on error to avoid extra jobs
            try {
                if ($tempVideoPath && Storage::disk('local')->exists($tempVideoPath)) {
                    Storage::disk('local')->delete($tempVideoPath);
                }
            } catch (\Throwable $cleanupError) {
                Log::warning('Failed to delete local temp video after error', [
                    'path' => $tempVideoPath,
                    'exception' => $cleanupError->getMessage(),
                ]);
            }

            try {
                if ($tempImagePath && Storage::disk('local')->exists($tempImagePath)) {
                    Storage::disk('local')->delete($tempImagePath);
                }
            } catch (\Throwable $cleanupError) {
                Log::warning('Failed to delete local temp image after error', [
                    'path' => $tempImagePath,
                    'exception' => $cleanupError->getMessage(),
                ]);
            }

            try {
                if ($tempS3Path && Storage::disk('s3')->exists($tempS3Path)) {
                    Storage::disk('s3')->delete($tempS3Path);
                }
            } catch (\Throwable $cleanupError) {
                Log::warning('Failed to delete temp S3 file after error', [
                    'path' => $tempS3Path,
                    'exception' => $cleanupError->getMessage(),
                ]);
            }

            throw $e;
        }
    }
}
