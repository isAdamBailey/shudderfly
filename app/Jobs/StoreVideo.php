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

    public int $timeout = 1800;

    public int $memory = 4096;

    public function retryAfter()
    {
        return [60, 300];
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
        Log::info('Starting StoreVideo job', [
            'filePath' => $this->filePath,
            'path' => $this->path,
            'book_id' => $this->book?->id,
            'page_id' => $this->page?->id,
            'attempt' => $this->attempts(),
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

        $freeSpace = disk_free_space(storage_path('app'));
        $fileSize = Storage::disk('local')->size($this->filePath);
        
        if ($freeSpace < ($fileSize * 3)) {
            Log::error('Insufficient disk space for video processing', [
                'freeSpace' => $freeSpace,
                'fileSize' => $fileSize,
                'required' => $fileSize * 3,
            ]);
            $this->fail(new \RuntimeException('Insufficient disk space for video processing'));
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

            $videoStream = $media->getVideoStream();
            if (!$videoStream) {
                throw new \RuntimeException('No video stream found in file');
            }
            
            $width = $videoStream->get('width');
            $height = $videoStream->get('height');
            
            if (!$width || !$height) {
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
                    'attempt' => $this->attempts(),
                ]);

                if ($exitCode === 137 || strpos($errorOutput, 'signal 9') !== false) {
                    throw new \RuntimeException('FFmpeg process was killed due to system resource constraints. Please try with a smaller video or lower quality settings.');
                }

                throw new \RuntimeException('FFmpeg processing failed: '.$errorOutput);
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
                    if (!$result) {
                        throw new \RuntimeException('S3 upload returned false');
                    }
                    return $result;
                }, 2000);

                Storage::disk('s3')->setVisibility($processedFilePath, 'public');

                if ($screenshotContents) {
                    retry(3, function () use ($posterPath, $screenshotContents) {
                        $result = Storage::disk('s3')->put($posterPath, $screenshotContents, 'public');
                        if (!$result) {
                            throw new \RuntimeException('S3 poster upload returned false');
                        }
                    }, 2000);
                }

                if ($this->page) {
                    $this->page->update([
                        'content' => $this->content,
                        'media_path' => $processedFilePath,
                        'media_poster' => $posterPath,
                        'video_link' => $this->videoLink,
                    ]);
                } elseif ($this->book) {
                    $this->book->pages()->create([
                        'content' => $this->content,
                        'media_path' => $processedFilePath,
                        'media_poster' => $posterPath,
                        'video_link' => $this->videoLink,
                    ]);
                }

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

    public function middleware(): array
    {
        return [(new WithoutOverlapping($this->filePath))->expireAfter(600)];
    }

    public function failed(Throwable $exception): void
    {
        Log::error('StoreVideo job failed permanently', [
            'filePath' => $this->filePath,
            'path' => $this->path,
            'exception' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}
