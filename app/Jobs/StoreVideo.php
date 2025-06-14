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

    public int $timeout = 5000;

    public int $memory = 4096;

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
        Log::info('Starting StoreVideo job', [
            'filePath' => $this->filePath,
            'path' => $this->path,
            'book_id' => $this->book?->id,
            'page_id' => $this->page?->id,
        ]);

        if (empty($this->filePath) || ! Storage::disk('local')->exists($this->filePath)) {
            Log::error('Video file not found or path is empty', [
                'filePath' => $this->filePath,
                'exists' => Storage::disk('local')->exists($this->filePath),
            ]);
            $this->fail(new \RuntimeException('Video file not found or path is empty'));

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
            $videoData = Storage::disk('local')->get($this->filePath);
            if (! $videoData) {
                throw new \RuntimeException('Failed to read video data from storage');
            }

            if (! file_put_contents($tempFile, $videoData)) {
                throw new \RuntimeException('Failed to write video data to temp file');
            }

            $media = FFMpeg::fromDisk('local')->open($this->filePath);

            // Get video properties for resizing decision
            $videoStream = $media->getVideoStream();
            $width = $videoStream->get('width');
            $height = $videoStream->get('height');

            // Check for rotation metadata
            $rotation = $videoStream->get('rotate') ?? 0;

            // Determine if video needs resizing and calculate appropriate dimensions
            $isPortrait = $height > $width;

            // Build rotation filter based on metadata
            $rotationFilter = '';
            if ($rotation == 90 || $rotation == -270) {
                $rotationFilter = 'transpose=1,'; // 90 degrees clockwise
            } elseif ($rotation == 180 || $rotation == -180) {
                $rotationFilter = 'transpose=2,transpose=2,'; // 180 degrees
            } elseif ($rotation == 270 || $rotation == -90) {
                $rotationFilter = 'transpose=2,'; // 90 degrees counter-clockwise
            }

            if ($isPortrait) {
                // For portrait videos, limit height to 1280 and width proportionally
                if ($height > 1280 || $width > 720) {
                    $videoFilter = $rotationFilter.'scale=-2:1280:force_original_aspect_ratio=decrease:force_divisible_by=2';
                } else {
                    $videoFilter = $rotationFilter.'scale=trunc(iw/2)*2:trunc(ih/2)*2';
                }
            } else {
                // For landscape videos, limit width to 1280 and height proportionally
                if ($width > 1280 || $height > 720) {
                    $videoFilter = $rotationFilter.'scale=1280:-2:force_original_aspect_ratio=decrease:force_divisible_by=2';
                } else {
                    $videoFilter = $rotationFilter.'scale=trunc(iw/2)*2:trunc(ih/2)*2';
                }
            }

            // Use raw FFmpeg command for guaranteed compression
            $videoBitrate = 800; // Fixed lower bitrate for consistent compression
            $audioBitrate = 96;  // Fixed audio bitrate

            // Build FFmpeg command with aggressive compression
            $ffmpegParams = [
                // Input
                '-i', storage_path('app/'.$this->filePath),

                // Force re-encoding with compression
                '-c:v', 'libx264',                  // Force H.264 video codec
                '-c:a', 'aac',                      // Force AAC audio codec
                '-b:v', $videoBitrate.'k',        // Video bitrate
                '-b:a', $audioBitrate.'k',        // Audio bitrate
                '-preset', 'medium',                // Balance speed vs compression
                '-crf', '28',                       // Constant rate factor
                '-profile:v', 'main',               // H.264 profile
                '-level', '3.1',                    // H.264 level

                // Apply video filters
                '-vf',
                $videoFilter,

                // Remove privacy metadata and rotation
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

                // Output optimization
                '-movflags', '+faststart',
                '-avoid_negative_ts', 'make_zero',
                '-f', 'mp4',
                '-y',                               // Overwrite output file
                $tempFile,
            ];

            // Remove null values from params
            $ffmpegParams = array_filter($ffmpegParams, function ($value) {
                return $value !== null;
            });

            Log::info('Starting FFmpeg processing', [
                'params' => $ffmpegParams,
                'filePath' => $this->filePath,
            ]);

            // Create process with array of arguments
            $process = new \Symfony\Component\Process\Process(['ffmpeg', ...$ffmpegParams]);
            $process->setTimeout(5000);
            $process->run();

            if (! $process->isSuccessful()) {
                Log::error('FFmpeg processing failed', [
                    'error' => $process->getErrorOutput(),
                    'output' => $process->getOutput(),
                    'exitCode' => $process->getExitCode(),
                ]);
                throw new \RuntimeException('FFmpeg processing failed: '.$process->getErrorOutput());
            }

            Log::info('FFmpeg processing completed successfully', [
                'filePath' => $this->filePath,
                'output' => $process->getOutput(),
            ]);

            $screenshotContents = $media->getFrameFromSeconds(0.5)
                ->export()
                ->getFrameContents();

            $filename = pathinfo($this->path, PATHINFO_FILENAME).'.mp4';
            $dirPath = pathinfo($this->path, PATHINFO_DIRNAME);
            $posterPath = $dirPath.'/'.pathinfo($this->path, PATHINFO_FILENAME).'_poster.jpg';

            try {
                $processedFilePath = retry(3, function () use ($tempFile, $filename, $dirPath) {
                    return Storage::disk('s3')->putFileAs($dirPath, new File($tempFile), $filename);
                }, 1000);

                Storage::disk('s3')->setVisibility($processedFilePath, 'public');

                if ($screenshotContents) {
                    retry(3, function () use ($posterPath, $screenshotContents) {
                        Storage::disk('s3')->put($posterPath, $screenshotContents, 'public');
                    }, 1000);
                }

                if ($this->page) {
                    // Update existing page
                    $this->page->update([
                        'content' => $this->content,
                        'media_path' => $processedFilePath,
                        'media_poster' => $posterPath,
                        'video_link' => $this->videoLink,
                    ]);
                } elseif ($this->book) {
                    // Create new page
                    $this->book->pages()->create([
                        'content' => $this->content,
                        'media_path' => $processedFilePath,
                        'media_poster' => $posterPath,
                        'video_link' => $this->videoLink,
                    ]);
                }
            } catch (Throwable $e) {
                Log::error('Failed to upload video to S3', [
                    'exception' => $e->getMessage(),
                    'filePath' => $this->filePath,
                    'path' => $this->path,
                    'trace' => $e->getTraceAsString(),
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
            ]);
            $this->fail($e);
        } catch (Throwable $e) {
            Log::error('Unexpected error occurred', [
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'filePath' => $this->filePath,
                'path' => $this->path,
                'memory_usage' => memory_get_usage(true),
                'peak_memory_usage' => memory_get_peak_usage(true),
            ]);
            $this->fail($e);
        } finally {
            Log::info('StoreVideo job cleanup', [
                'filePath' => $this->filePath,
                'tempFile' => $tempFile ?? null,
                'memory_usage' => memory_get_usage(true),
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

    public function middleware(): array
    {
        return [(new WithoutOverlapping($this->filePath))->expireAfter(600)];
    }
}
