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
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use ProtoneMedia\LaravelFFMpeg\Exporters\EncodingException;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;
use Throwable;

class StoreVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $filePath;

    protected string $path;

    public function __construct(string $filePath, string $path)
    {
        $this->filePath = $filePath;
        $this->path = $path;
    }

    public function handle(): void
    {
        if (empty($this->filePath) || ! Storage::disk('local')->exists($this->filePath)) {
            Log::error('File path is null, empty, or does not exist', ['filePath' => $this->filePath]);
            return;
        }

        $tempDir = storage_path('app/temp/');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0755, true)) {
            Log::error('Failed to create temp directory', ['directory' => $tempDir]);
            return;
        }
        $tempFile = $tempDir.uniqid('video_', true).'.mp4';

        try {
            $videoData = Storage::disk('local')->get($this->filePath);
            file_put_contents($tempFile, $videoData);

            $media = FFMpeg::fromDisk('local')->open($this->filePath);

            $media->export()
                ->inFormat((new X264)->setKiloBitrate(400)->setAudioKiloBitrate(64))
                ->resize(512, 288)
                ->save($tempFile);

            $screenshotContents = $media->getFrameFromSeconds(1)
                ->export()
                ->getFrameContents();

            $filename = pathinfo($this->path, PATHINFO_FILENAME).'.mp4';
            $dirPath = pathinfo($this->path, PATHINFO_DIRNAME);

            try {
                $processedFilePath = retry(3, function () use ($tempFile, $filename, $dirPath) {
                    return Storage::disk('s3')->putFileAs($dirPath, new File($tempFile), $filename);
                }, 1000);

                Storage::disk('s3')->setVisibility($processedFilePath, 'public');
            } catch (Throwable $e) {
                Mail::raw(
                    $this->filePath.'" failed to upload to S3. Error: '.$e->getMessage(),
                    function ($message) {
                        $message->to('adamjbailey7@gmail.com')
                            ->subject('S3 Upload Failure');
                    }
                );
                Log::error('Failed to upload video to S3', [
                    'exception' => $e->getMessage(),
                    'filePath' => $this->filePath,
                    'path' => $this->path,
                ]);
                throw $e;
            }

            if ($screenshotContents) {
                $screenshotFilename = pathinfo($this->path, PATHINFO_FILENAME).'_poster.jpg';
                $screenshotPath = $dirPath.'/'.$screenshotFilename;

                retry(3, function () use ($screenshotPath, $screenshotContents) {
                    Storage::disk('s3')->put($screenshotPath, $screenshotContents, 'public');
                }, 1000);
            } else {
                Log::error('Screenshot contents were not generated');
            }

        } catch (EncodingException $e) {
            Log::error('FFMPEG encoding failed', [
                'error_output' => $e->getErrorOutput(),
                'command' => $e->getCommand(),
                'filePath' => $this->filePath,
                'path' => $this->path,
            ]);
            $this->fail($e);
        } catch (S3Exception $e) {
            Log::error('S3 operation failed', [
                'exception' => $e->getMessage(),
                'filePath' => $this->filePath,
                'path' => $this->path,
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
        return [(new WithoutOverlapping)->expireAfter(180)];
    }
}
