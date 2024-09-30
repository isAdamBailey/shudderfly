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
    protected $signature = 'media:generate-poster-images';
    protected $description = 'Iterates over all pages and generates a poster image of the media if it is a video';

    public function handle()
    {
        set_time_limit(0);

        $startTime = microtime(true);

        Page::where('media_path', '<>', '')
            ->whereNull('media_poster')
            ->where('media_path', 'not like', 'http%')
            ->chunk(200, function ($pages) {
                foreach ($pages as $page) {
                    try {
                        $mediaPath = $page->media_path;
                        $posterPath = '';

                        $s3Path = str_replace(env('CLOUDFRONT_URL'), '', $mediaPath);

                        if (! Storage::disk('s3')->exists($s3Path)) {
                            Log::error('File does not exist', ['s3Path' => $s3Path]);
                            continue;
                        }

                        $mimeType = Storage::disk('s3')->mimeType($s3Path);

                        if (Str::startsWith($mimeType, 'video/')) {
                            $filename = pathinfo($s3Path, PATHINFO_BASENAME);
                            $posterPath = 'books/'.$page->book->slug.'/'.$filename;

                            $videoData = Storage::disk('s3')->get($s3Path);

                            $tempVideoPath = 'temp/'.uniqid('video_').'.mp4';  // Relative path for local storage
                            Storage::disk('local')->put($tempVideoPath, $videoData);

                            $videoFullPath = storage_path('app/'.$tempVideoPath);

                            if (! file_exists($videoFullPath)) {
                                Log::error('Temporary video file not found', ['path' => $videoFullPath]);
                                continue;
                            }

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

                            Storage::disk('local')->delete($tempVideoPath);
                        }

                        if ($posterPath) {
                            $page->media_poster = $posterPath;
                            $page->save();
                        }
                    } catch (\Exception $e) {
                        Log::error('Error processing file', ['exception' => $e->getMessage(), 'page_id' => $page->id]);
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
            Log::error('Error sending email', ['exception' => $e->getMessage()]);
        }

        return 0;
    }
}
