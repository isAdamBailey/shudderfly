<?php

namespace App\Jobs;

use FFMpeg\Format\Video\X264;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\File;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;

class StoreVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $filePath;
    protected string $path;

    /**
     * Create a new job instance.
     */
    public function __construct(string $filePath, string $path)
    {
        $this->filePath = $filePath;
        $this->path = $path;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $tempFile = storage_path('app/temp/').uniqid('video_', true).'.mp4';

        try {
            Log::info('StoreVideo job started', ['filePath' => $this->filePath, 'path' => $this->path]);

            $videoData = Storage::disk('local')->get($this->filePath);
            Log::info('Video data retrieved from local storage');

            file_put_contents($tempFile, $videoData);
            Log::info('Temporary video file saved', ['tempFile' => $tempFile]);

            FFMpeg::fromDisk('local')
                ->open($this->filePath)
                ->export()
                ->inFormat((new X264)->setKiloBitrate(400)->setAudioKiloBitrate(64))
                ->resize(512, 288)
                ->save($tempFile);
            Log::info('Video processed and saved', ['tempFile' => $tempFile]);

            $screenshotContents = FFMpeg::fromDisk('local')
                ->open($this->filePath)
                ->getFrameFromSeconds(1)
                ->export()
                ->getFrameContents();
            Log::info('Screenshot captured');

            if ($screenshotContents) {
                $screenshotFilename = pathinfo($this->path, PATHINFO_FILENAME).'_poster.jpg';
                $screenshotPath = pathinfo($this->path, PATHINFO_DIRNAME).'/'.$screenshotFilename;
                Storage::disk('s3')->put($screenshotPath, $screenshotContents, 'public');
                Log::info('Screenshot saved to S3', ['screenshotPath' => $screenshotPath]);
            } else {
                Log::error('Screenshot contents were not generated');
            }

            $filename = pathinfo($this->path, PATHINFO_FILENAME).'.mp4';
            $processedFilePath = Storage::disk('s3')->putFileAs(
                pathinfo($this->path, PATHINFO_DIRNAME),
                new File($tempFile),
                $filename
            );
            Storage::disk('s3')->setVisibility($processedFilePath, 'public');
            Log::info('Processed video saved to S3', ['processedFilePath' => $processedFilePath]);
        } catch (\Exception $e) {
            Log::error('FFmpeg failed', ['exception' => $e->getMessage(), 'filePath' => $this->filePath, 'path' => $this->path]);
        } finally {
            if (file_exists($tempFile)) {
                @unlink($tempFile);
                Log::info('Temporary file deleted', ['tempFile' => $tempFile]);
            }
            Storage::disk('local')->delete($this->filePath);
            Log::info('Original file deleted from local storage', ['filePath' => $this->filePath]);
        }
    }
}
