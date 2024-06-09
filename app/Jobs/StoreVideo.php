<?php

namespace App\Jobs;

use FFMpeg\Format\Video\X264;
use Illuminate\Http\File;
use Illuminate\Support\Facades\Log;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class StoreVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $video;
    protected $path;

    /**
     * Create a new job instance.
     *
     * @param string $video
     * @param string $path
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
        $tempFile = tempnam(sys_get_temp_dir(), 'video') . '.mp4';

        try {
            $videoData = Storage::disk('local')->get($this->video);

            file_put_contents($tempFile, $videoData);
            FFMpeg::fromDisk('local')
                ->open($this->video)
                ->export()
                ->inFormat(new X264)
                ->resize(640, 480)
                ->save($tempFile);

            $path_parts = pathinfo($this->path);
            $directory = $path_parts['dirname'];
            $filename = $path_parts['basename'];
            $processedFilePath = Storage::disk('s3')->putFileAs($directory, new File($tempFile), $filename);

            Storage::disk('s3')->setVisibility($processedFilePath, 'public');
        } catch (\Exception $e) {
            Log::error('FFmpeg failed: ' . $e->getMessage());
        } finally {
            unlink($tempFile);
            Storage::disk('local')->delete($tempFile);
            Storage::disk('local')->delete($this->video);
        }
    }
}
