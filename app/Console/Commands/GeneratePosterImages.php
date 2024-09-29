<?php

namespace App\Console\Commands;

use App\Models\Page;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ProtoneMedia\LaravelFFMpeg\Support\FFMpeg;

class GeneratePosterImages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:generate-poster-images';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        set_time_limit(0);

        $startTime = microtime(true);

        Page::where('image_path', '<>', '')
            ->whereNull('media_poster')
            ->chunk(200, function ($pages) {
            foreach ($pages as $page) {
                try {
                    $imagePath = $page->image_path;
                    $posterPath = '';

                    $s3Path = str_replace(env('CLOUDFRONT_URL'), '', $imagePath);
                    if ( ! Storage::disk('s3')->exists($s3Path)) {
                        Log::error('File does not exist: '.$imagePath);

                        continue;
                    }

                    $mimeType = Storage::disk('s3')->mimeType($s3Path);
                    if (Str::startsWith($mimeType, 'video/')) {
                        $filename = pathinfo($s3Path, PATHINFO_BASENAME);
                        $posterPath = 'books/'.$page->book->slug.'/'.$filename;

                        // Download the video from S3
                        $videoData = Storage::disk('s3')->get($s3Path);
                        $tempVideoPath = storage_path('app/temp/').uniqid('video_', true).'.mp4';
                        file_put_contents($tempVideoPath, $videoData);

                        // Capture a frame using FFmpeg
                        $frameContents = FFMpeg::fromDisk('local')
                            ->open($tempVideoPath)
                            ->getFrameFromSeconds(1)
                            ->export()
                            ->getFrameContents();

                        if ($frameContents) {
                            $posterFilename = pathinfo($posterPath, PATHINFO_FILENAME).'_poster.jpg';
                            $posterPath = pathinfo($posterPath, PATHINFO_DIRNAME).'/'.$posterFilename;
                            Storage::disk('s3')->put($posterPath, $frameContents, 'public');
                        } else {
                            Log::error('Frame contents were not generated');
                        }
                        if (file_exists($tempVideoPath)) {
                            @unlink($tempVideoPath);
                        }
                    }

                    if ($posterPath) {
                        $page->media_poster = $posterPath;
                        $page->save();
                    }
                } catch (\Exception $e) {
                    Log::error('Error processing file: '.$e->getMessage());
                }
            }
        });

        $endTime = microtime(true);
        $duration = $endTime - $startTime;
        $durationInHours = $duration / 3600;

        try {
            Mail::raw(
                'All poster images have been generated. The process took '.round($durationInHours, 2).' hours.',
                function ($message) {
                    $message->to('adamjbailey7@gmail.com')
                        ->subject('Media Processing Complete');
                }
            );
        } catch (\Exception $e) {
            Log::error('Error sending email: '.$e->getMessage());
        }

        return 0;
    }
}
