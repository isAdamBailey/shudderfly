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
     *
     * @return void
     */
    public function handle()
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'video').'.mp4';

        try {
            $videoData = Storage::disk('local')->get($this->video);
            file_put_contents($tempFile, $videoData);

            FFMpeg::fromDisk('local')
                ->open($this->video)
                ->export()
                ->inFormat((new X264)->setKiloBitrate(400)->setAudioKiloBitrate(64))
                ->resize(512, 288)
                ->save($tempFile);

            $path_parts = pathinfo($this->path);
            $directory = $path_parts['dirname'];
            $filename = pathinfo($path_parts['basename'], PATHINFO_FILENAME).'.mp4';
            $processedFilePath = Storage::disk('s3')->putFileAs($directory, new File($tempFile), $filename);
            Storage::disk('s3')->setVisibility($processedFilePath, 'public');
        } catch (\Exception $e) {
            Log::error('FFmpeg failed: '.$e->getMessage());
        } finally {
            Storage::disk('local')->delete($tempFile);
            Storage::disk('local')->delete($this->video);
        }
    }
}
