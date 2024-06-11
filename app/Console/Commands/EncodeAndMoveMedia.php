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
        $startTime = microtime(true);

        Page::whereNotNull('image_path')->chunk(200, function ($pages) {
            foreach ($pages as $page) {
                try {
                    $imagePath = $page->image_path;
                    $mediaPath = '';

                    if (Str::startsWith(Storage::mimeType($imagePath), 'image/')) {
                        if (! Str::endsWith($imagePath, '.webp')) {
                            $filename = pathinfo($imagePath, PATHINFO_FILENAME);
                            $mediaPath = 'books/'.$page->book->slug.'/'.$filename.'.webp';
                            StoreImage::dispatch(Storage::disk('s3')->get($imagePath), $mediaPath);
                        } else {
                            $filename = pathinfo($imagePath, PATHINFO_EXTENSION);
                            $mediaPath = 'books/'.$page->book->slug.'/'.$filename;
                            Storage::disk('s3')->copy($imagePath, $mediaPath);
                        }
                    } elseif (Str::startsWith(Storage::mimeType($imagePath), 'video/')) {
                        $filename = pathinfo($imagePath, PATHINFO_EXTENSION);
                        $mediaPath = 'books/'.$page->book->slug.'/'.$filename;
                        Storage::disk('s3')->copy($imagePath, $mediaPath);
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
        $durationInMinutes = $duration / 60;

        try {
            Mail::raw('All media has been moved and encoded. The process took ' . round($durationInMinutes, 2) . ' minutes.', function ($message) {
                $message->to('adamjbailey7@gmail.com')
                    ->subject('Media Processing Complete');
            });
        } catch (\Exception $e) {
            Log::error('Error sending email: '.$e->getMessage());
        }

        return 0;
    }
}
