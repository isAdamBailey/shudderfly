<?php

namespace App\Console\Commands;

use App\Jobs\StoreImage;
use App\Models\Page;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EncodeAndMoveMedia extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:encode-and-move';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Encode image files to webp format and store them in a new S3 path, move all other files to same path.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        set_time_limit(0);

        $startTime = microtime(true);

        Page::where('image_path', '<>', '')->chunk(200, function ($pages) {
            foreach ($pages as $page) {
                try {
                    $imagePath = $page->image_path;
                    $mediaPath = '';

                    $s3Path = str_replace(env('CLOUDFRONT_URL'), '', $imagePath);
                    if (! Storage::disk('s3')->exists($s3Path)) {
                        Log::error('File does not exist: '.$imagePath);

                        continue;
                    }

                    $mimeType = Storage::disk('s3')->mimeType($s3Path);
                    if (Str::startsWith($mimeType, 'image/')) {
                        if (! Str::endsWith($s3Path, '.webp')) {
                            $filename = pathinfo($s3Path, PATHINFO_FILENAME);
                            $mediaPath = 'books/'.$page->book->slug.'/'.$filename.'.webp';
                            StoreImage::dispatch($s3Path, $mediaPath);
                        } else {
                            $filename = pathinfo($s3Path, PATHINFO_BASENAME);
                            $mediaPath = 'books/'.$page->book->slug.'/'.$filename;
                            Storage::disk('s3')->copy($s3Path, $mediaPath);
                        }
                    } elseif (Str::startsWith($mimeType, 'video/')) {
                        $filename = pathinfo($s3Path, PATHINFO_BASENAME);
                        $mediaPath = 'books/'.$page->book->slug.'/'.$filename;
                        Storage::disk('s3')->copy($s3Path, $mediaPath);
                    }

                    if ($mediaPath) {
                        $page->media_path = $mediaPath;
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
            Mail::raw('All media has been moved and encoded. The process took '.round($durationInHours, 2).' hours.', function ($message) {
                $message->to('adamjbailey7@gmail.com')
                    ->subject('Media Processing Complete');
            });
        } catch (\Exception $e) {
            Log::error('Error sending email: '.$e->getMessage());
        }

        return 0;
    }
}
