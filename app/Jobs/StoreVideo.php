<?php

namespace App\Jobs;

use App\Models\Book;
use App\Models\Page;
use Aws\S3\Exception\S3Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\File;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use ProtoneMedia\LaravelFFMpeg\Exporters\EncodingException;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;
use Throwable;

class StoreVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $filePath;

    protected string $path;

    protected ?Book $book;

    protected ?string $content;

    protected ?string $videoLink;

    protected ?Page $page;

    public int $tries = 3;

    public int $maxExceptions = 3;

    public int $timeout = 1800;

    public int $memory = 1024; // 1GB to match the memory check requirement

    public function retryAfter()
    {
        // Exponential backoff: 2 minutes, 5 minutes, 10 minutes, 20 minutes, 40 minutes
        return [120, 300, 600, 1200, 2400];
    }

    public function backoff()
    {
        // Use exponential backoff for retries
        return [120, 300, 600, 1200, 2400];
    }

    public function __construct(string $filePath, string $path, ?Book $book = null, ?string $content = null, ?string $videoLink = null, ?Page $page = null)
    {
        $this->filePath = $filePath;
        $this->path = $path;
        $this->book = $book;
        $this->content = $content;
        $this->videoLink = $videoLink;
        $this->page = $page;
    }

    public function handle(): void
    {
        // Validate that models still exist if provided
        if ($this->book && ! $this->book->exists) {
            Log::warning('Book model no longer exists, skipping job', [
                'book_id' => $this->book->id ?? 'null',
                'filePath' => $this->filePath,
            ]);

            return;
        }

        if ($this->page && ! $this->page->exists) {
            Log::warning('Page model no longer exists, skipping job', [
                'page_id' => $this->page->id ?? 'null',
                'filePath' => $this->filePath,
            ]);

            return;
        }

        Log::info('Starting StoreVideo job', [
            'filePath' => $this->filePath,
            'path' => $this->path,
            'book_id' => $this->book?->id,
            'page_id' => $this->page?->id,
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

        Log::info('System resource check', [
            'freeSpace' => $freeSpace,
            'memoryUsage' => $memoryUsage,
            'memoryLimit' => $memoryLimit,
            'availableMemory' => $memoryLimit - $memoryUsage,
        ]);

        if (empty($this->filePath) || ! Storage::disk('local')->exists($this->filePath)) {
            Log::error('Video file not found or path is empty', [
                'filePath' => $this->filePath,
                'exists' => Storage::disk('local')->exists($this->filePath),
                'attempt' => $this->attempts(),
            ]);
            $this->fail(new \RuntimeException('Video file not found or path is empty'));

            return;
        }

        $fileSize = Storage::disk('local')->size($this->filePath);
        $requiredSpace = $fileSize * 4; // Increased buffer for processing

        if ($freeSpace < $requiredSpace) {
            Log::error('Insufficient disk space for video processing', [
                'freeSpace' => $freeSpace,
                'fileSize' => $fileSize,
                'required' => $requiredSpace,
                'attempt' => $this->attempts(),
            ]);
            $this->fail(new \RuntimeException('Insufficient disk space for video processing'));

            return;
        }

        // Check if we have enough memory available
        if (($memoryLimit - $memoryUsage) < (1024 * 1024 * 1024)) { // Less than 1GB available
            Log::error('Insufficient memory for video processing', [
                'availableMemory' => $memoryLimit - $memoryUsage,
                'required' => 1024 * 1024 * 1024,
                'attempt' => $this->attempts(),
            ]);
            $this->fail(new \RuntimeException('Insufficient memory for video processing'));

            return;
        }

        $tempDir = storage_path('app/temp/');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0755, true)) {
            Log::error('Failed to create temp directory', ['directory' => $tempDir]);
            $this->fail(new \RuntimeException('Failed to create temp directory'));

            return;
        }

        $tempFile = $tempDir.uniqid('video_', true).'.mp4';

        try {
            // Use streaming to avoid loading entire file into memory
            $sourcePath = storage_path('app/'.$this->filePath);
            if (! file_exists($sourcePath)) {
                throw new \RuntimeException('Source video file not found: '.$sourcePath);
            }

            // Copy file using streams to avoid memory issues
            $sourceStream = fopen($sourcePath, 'r');
            $destStream = fopen($tempFile, 'w');

            if (! $sourceStream || ! $destStream) {
                throw new \RuntimeException('Failed to open file streams for copying');
            }

            $copied = stream_copy_to_stream($sourceStream, $destStream);
            fclose($sourceStream);
            fclose($destStream);

            if ($copied === false) {
                throw new \RuntimeException('Failed to copy video file to temp location');
            }

            $media = FFMpeg::fromDisk('local')->open($this->filePath);

            $videoStream = $media->getVideoStream();
            if (! $videoStream) {
                throw new \RuntimeException('No video stream found in file');
            }

            $width = $videoStream->get('width');
            $height = $videoStream->get('height');

            if (! $width || ! $height) {
                throw new \RuntimeException('Invalid video dimensions');
            }

            $rotation = $videoStream->get('rotate') ?? 0;

            $isPortrait = $height > $width;

            $rotationFilter = '';
            if ($rotation == 90 || $rotation == -270) {
                $rotationFilter = 'transpose=1,';
            } elseif ($rotation == 180 || $rotation == -180) {
                $rotationFilter = 'transpose=2,transpose=2,';
            } elseif ($rotation == 270 || $rotation == -90) {
                $rotationFilter = 'transpose=2,';
            }

            if ($isPortrait) {
                if ($height > 960 || $width > 540) {
                    $videoFilter = $rotationFilter.'scale=-2:960:force_original_aspect_ratio=decrease:force_divisible_by=2';
                } else {
                    $videoFilter = $rotationFilter.'scale=trunc(iw/2)*2:trunc(ih/2)*2';
                }
            } else {
                if ($width > 960 || $height > 540) {
                    $videoFilter = $rotationFilter.'scale=960:-2:force_original_aspect_ratio=decrease:force_divisible_by=2';
                } else {
                    $videoFilter = $rotationFilter.'scale=trunc(iw/2)*2:trunc(ih/2)*2';
                }
            }

            $videoBitrate = 600;
            $audioBitrate = 64;

            $ffmpegParams = [
                '-i', storage_path('app/'.$this->filePath),
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-b:v', $videoBitrate.'k',
                '-b:a', $audioBitrate.'k',
                '-preset', 'faster',
                '-crf', '30',
                '-profile:v', 'baseline',
                '-level', '3.0',
                '-vf',
                $videoFilter,
                '-metadata', 'location=',
                '-metadata', 'location-eng=',
                '-metadata', 'GPS_COORDINATES=',
                '-metadata', 'make=',
                '-metadata', 'model=',
                '-metadata', 'software=',
                '-metadata', 'creation_time=',
                '-metadata', 'date=',
                '-metadata', 'comment=',
                '-metadata', 'description=',
                '-metadata', 'artist=',
                '-metadata', 'author=',
                '-metadata', 'copyright=',
                '-metadata:s:v:0', 'rotate=0',
                '-movflags', '+faststart',
                '-avoid_negative_ts', 'make_zero',
                '-f', 'mp4',
                '-y',
                $tempFile,
            ];

            $ffmpegParams = array_filter($ffmpegParams, function ($value) {
                return $value !== null;
            });

            Log::info('Starting FFmpeg processing', [
                'params' => $ffmpegParams,
                'filePath' => $this->filePath,
                'attempt' => $this->attempts(),
            ]);

            $process = new \Symfony\Component\Process\Process(['ffmpeg', ...$ffmpegParams]);
            $process->setTimeout(1800);
            $process->setIdleTimeout(1800);
            $process->setOptions([
                'create_new_console' => true,
                'create_process_group' => true,
            ]);

            $process->run(function ($type, $buffer) {
                // Empty callback to keep process alive
            });

            if (! $process->isSuccessful()) {
                $errorOutput = $process->getErrorOutput();
                $exitCode = $process->getExitCode();

                Log::error('FFmpeg processing failed', [
                    'error' => $errorOutput,
                    'output' => $process->getOutput(),
                    'exitCode' => $exitCode,
                    'command' => $process->getCommandLine(),
                    'memory_usage' => memory_get_usage(true),
                    'peak_memory_usage' => memory_get_peak_usage(true),
                    'attempt' => $this->attempts(),
                ]);

                if ($exitCode === 137 || strpos($errorOutput, 'signal 9') !== false) {
                    throw new \RuntimeException('FFmpeg process was killed due to system resource constraints (OOM). Please try with a smaller video or lower quality settings.');
                }

                if ($exitCode === 124 || strpos($errorOutput, 'timeout') !== false) {
                    throw new \RuntimeException('FFmpeg process timed out. The video may be too large or complex to process.');
                }

                if (strpos($errorOutput, 'Invalid data found') !== false) {
                    throw new \RuntimeException('Invalid video file format or corrupted video data.');
                }

                if (strpos($errorOutput, 'No such file or directory') !== false) {
                    throw new \RuntimeException('FFmpeg binary not found or input file missing.');
                }

                throw new \RuntimeException('FFmpeg processing failed (exit code: '.$exitCode.'): '.$errorOutput);
            }

            Log::info('FFmpeg processing completed successfully', [
                'filePath' => $this->filePath,
                'output' => $process->getOutput(),
                'attempt' => $this->attempts(),
            ]);

            $screenshotContents = null;
            try {
                $screenshotContents = $media->getFrameFromSeconds(0.5)
                    ->export()
                    ->getFrameContents();
            } catch (Throwable $e) {
                Log::warning('Failed to generate screenshot, continuing without poster', [
                    'error' => $e->getMessage(),
                    'filePath' => $this->filePath,
                ]);
            }

            $filename = pathinfo($this->path, PATHINFO_FILENAME).'.mp4';
            $dirPath = pathinfo($this->path, PATHINFO_DIRNAME);
            $posterPath = $dirPath.'/'.pathinfo($this->path, PATHINFO_FILENAME).'_poster.jpg';

            try {
                $processedFilePath = retry(3, function () use ($tempFile, $filename, $dirPath) {
                    $result = Storage::disk('s3')->putFileAs($dirPath, new File($tempFile), $filename);
                    if (! $result) {
                        throw new \RuntimeException('S3 upload returned false');
                    }

                    return $result;
                }, 2000);

                Storage::disk('s3')->setVisibility($processedFilePath, 'public');

                if ($screenshotContents) {
                    retry(3, function () use ($posterPath, $screenshotContents) {
                        $result = Storage::disk('s3')->put($posterPath, $screenshotContents, 'public');
                        if (! $result) {
                            throw new \RuntimeException('S3 poster upload returned false');
                        }
                    }, 2000);
                }

                // Use database transaction for data consistency
                DB::transaction(function () use ($processedFilePath, $posterPath) {
                    if ($this->page) {
                        $this->page->update([
                            'content' => $this->content,
                            'media_path' => $processedFilePath,
                            'media_poster' => $posterPath,
                            'video_link' => $this->videoLink,
                        ]);
                    } elseif ($this->book) {
                        $page = $this->book->pages()->create([
                            'content' => $this->content,
                            'media_path' => $processedFilePath,
                            'media_poster' => $posterPath,
                            'video_link' => $this->videoLink,
                        ]);

                        // Set as cover page if book doesn't have one
                        if (! $this->book->cover_page) {
                            $this->book->update(['cover_page' => $page->id]);
                        }
                    }
                });

                Log::info('StoreVideo job completed successfully', [
                    'filePath' => $this->filePath,
                    'processedFilePath' => $processedFilePath,
                    'attempt' => $this->attempts(),
                ]);

            } catch (Throwable $e) {
                Log::error('Failed to upload video to S3', [
                    'exception' => $e->getMessage(),
                    'filePath' => $this->filePath,
                    'path' => $this->path,
                    'trace' => $e->getTraceAsString(),
                    'attempt' => $this->attempts(),
                ]);
                throw $e;
            }

        } catch (EncodingException $e) {
            Log::error('FFMPEG encoding failed', [
                'error_output' => $e->getErrorOutput(),
                'command' => $e->getCommand(),
                'filePath' => $this->filePath,
                'path' => $this->path,
                'trace' => $e->getTraceAsString(),
                'memory_usage' => memory_get_usage(true),
                'peak_memory_usage' => memory_get_peak_usage(true),
                'attempt' => $this->attempts(),
            ]);
            $this->fail($e);
        } catch (S3Exception $e) {
            Log::error('S3 operation failed', [
                'exception' => $e->getMessage(),
                'filePath' => $this->filePath,
                'path' => $this->path,
                'trace' => $e->getTraceAsString(),
                'memory_usage' => memory_get_usage(true),
                'peak_memory_usage' => memory_get_peak_usage(true),
                'attempt' => $this->attempts(),
            ]);

            // Retry S3 operations as they might be temporary
            if ($this->attempts() < $this->tries) {
                throw $e;
            }
            $this->fail($e);
        } catch (Throwable $e) {
            Log::error('Unexpected error occurred', [
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'filePath' => $this->filePath,
                'path' => $this->path,
                'memory_usage' => memory_get_usage(true),
                'peak_memory_usage' => memory_get_peak_usage(true),
                'attempt' => $this->attempts(),
            ]);

            // Retry unexpected errors unless we've hit max attempts
            if ($this->attempts() < $this->tries) {
                throw $e;
            }
            $this->fail($e);
        } finally {
            Log::info('StoreVideo job cleanup', [
                'filePath' => $this->filePath,
                'tempFile' => $tempFile ?? null,
                'memory_usage' => memory_get_usage(true),
                'attempt' => $this->attempts(),
            ]);

            if (isset($tempFile) && file_exists($tempFile)) {
                if (! @unlink($tempFile)) {
                    Log::warning("Failed to delete temp file: $tempFile");
                }
            }

            if (Storage::disk('local')->exists($this->filePath)) {
                Storage::disk('local')->delete($this->filePath);
            }
        }
    }

    private function getMemoryLimitInBytes(): int
    {
        $memoryLimit = ini_get('memory_limit');
        if ($memoryLimit === '-1') {
            return PHP_INT_MAX; // No limit
        }

        $unit = strtolower(substr($memoryLimit, -1));
        $value = (int) substr($memoryLimit, 0, -1);

        switch ($unit) {
            case 'g':
                return $value * 1024 * 1024 * 1024;
            case 'm':
                return $value * 1024 * 1024;
            case 'k':
                return $value * 1024;
            default:
                return $value;
        }
    }

    public function middleware(): array
    {
        return [
            (new WithoutOverlapping($this->getUniqueId()))
                ->expireAfter(1800) // Release lock after 30 minutes
                ->releaseAfter(900), // Release lock after 15 minutes if job is still running
        ];
    }

    /**
     * Get the unique ID for the job.
     */
    private function getUniqueId(): string
    {
        return 'store_video_'.md5($this->filePath.'_'.$this->path);
    }

    public function failed(Throwable $exception): void
    {
        Log::error('StoreVideo job failed permanently', [
            'filePath' => $this->filePath,
            'path' => $this->path,
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
            $tempFiles = glob($tempDir.'video_*.mp4');
            foreach ($tempFiles as $tempFile) {
                if (file_exists($tempFile) && (time() - filemtime($tempFile)) > 3600) { // Older than 1 hour
                    @unlink($tempFile);
                    Log::info('Cleaned up old temp file', ['file' => $tempFile]);
                }
            }
        }

        // Clean up the original uploaded file if it still exists
        if (Storage::disk('local')->exists($this->filePath)) {
            Storage::disk('local')->delete($this->filePath);
            Log::info('Cleaned up original uploaded file', ['filePath' => $this->filePath]);
        }
    }
}
