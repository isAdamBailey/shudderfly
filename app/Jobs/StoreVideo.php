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
use App\Filters\CustomFrameFilter;

class StoreVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $video;

    protected $path;

    /**
     * Create a new job instance.
     */
    public function __construct(string $video, string $path)
    {
        $this->video = $video;
        $this->path = $path;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $tempFile = storage_path('app/temp/').uniqid('video_', true).'.mp4';
        $screenshotFile = storage_path('app/temp/').'screenshot_%03d.webp';

        try {
            $videoData = Storage::disk('local')->get($this->video);
            file_put_contents($tempFile, $videoData);

            FFMpeg::fromDisk('local')
                ->open($this->video)
                ->export()
                ->inFormat((new X264)->setKiloBitrate(400)->setAudioKiloBitrate(64))
                ->resize(512, 288)
                ->save($tempFile);

            // Capture a screenshot
//            FFMpeg::fromDisk('local')
//                ->open($this->video)
//                ->getFrameFromSeconds(1)
//                ->export()
//                ->toDisk('local')
//                ->save('temp/'.basename($screenshotFile));

//            $frame = FFMpeg::fromDisk('local')
//                ->open($this->video)
//                ->getFrameFromSeconds(1);
//            $frame->addFilter(new CustomFrameFilter());
//            $frame->export()
//                ->toDisk('local')
//                ->save('temp/'.basename($screenshotFile));

            $screenshotFilePath = 'temp/screenshot_'.uniqid().'.webp';
            FFMpeg::fromDisk('local')
                ->open($this->video)
                ->getFrameFromSeconds(1)
                ->export()
                ->toDisk('local')
                ->save($screenshotFilePath);

            Log::info('Screenshot file path: ' . storage_path('app/'.$screenshotFilePath));

            if (file_exists(storage_path('app/'.$screenshotFilePath))) {
                $screenshotFilename = pathinfo($this->path, PATHINFO_FILENAME).'.webp';
                $screenshotPath = Storage::disk('s3')->putFileAs(
                    pathinfo($this->path, PATHINFO_DIRNAME),
                    new File(storage_path('app/'.$screenshotFilePath)),
                    $screenshotFilename
                );
                Storage::disk('s3')->setVisibility($screenshotPath, 'public');
            } else {
                throw new \Exception('Screenshot file does not exist');
            }

            $filename = pathinfo($this->path, PATHINFO_FILENAME).'.mp4';
            $processedFilePath = Storage::disk('s3')->putFileAs(
                pathinfo($this->path, PATHINFO_DIRNAME),
                new File($tempFile),
                $filename
            );
            Storage::disk('s3')->setVisibility($processedFilePath, 'public');
        } catch (\Exception $e) {
            Log::error('FFmpeg failed: '.$e->getMessage());
        } finally {
            if (file_exists($tempFile)) {
                @unlink($tempFile);
            }
            if (file_exists($screenshotFile)) {
                @unlink($screenshotFile);
            }
            Storage::disk('local')->delete($this->video);
        }
    }
}
