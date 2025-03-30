<?php

namespace App\Jobs;

use Aws\S3\Exception\S3Exception;
use FFMpeg\Format\Video\X264;
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
use App\Models\Book;

class StoreVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $filePath;
    protected string $path;
    protected ?Book $book;
    protected ?string $content;
    protected ?string $videoLink;

    public int $tries = 3;
    public int $maxExceptions = 3;
    public int $timeout = 600;
    public int $memory = 4096;

    public function __construct(string $filePath, string $path, ?Book $book = null, ?string $content = null, ?string $videoLink = null)
    {
        $this->filePath = $filePath;
        $this->path = $path;
        $this->book = $book;
        $this->content = $content;
        $this->videoLink = $videoLink;
    }

    public function handle(): void
    {
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

            $media->export()
                ->inFormat((new X264)
                    ->setKiloBitrate(300)
                    ->setAudioKiloBitrate(64))
                ->resize(512, 288)
                ->save($tempFile);

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

                // Create the page if book is provided
                if ($this->book) {
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
            ]);
            $this->fail($e);
        } catch (S3Exception $e) {
            Log::error('S3 operation failed', [
                'exception' => $e->getMessage(),
                'filePath' => $this->filePath,
                'path' => $this->path,
                'trace' => $e->getTraceAsString(),
            ]);
            $this->fail($e);
        } catch (Throwable $e) {
            Log::error('Unexpected error occurred', [
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'filePath' => $this->filePath,
                'path' => $this->path,
            ]);
            $this->fail($e);
        } finally {
            if (file_exists($tempFile)) {
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
