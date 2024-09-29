<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Laravel\Facades\Image;

class StoreImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $filePath;

    protected string $path;

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct(string $filePath, string $path)
    {
        $this->filePath = $filePath;
        $this->path = $path;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle(): void
    {
        $tempFile = storage_path('app/temp/').uniqid('image_', true).'.webp';

        try {
            $imageData = Storage::disk('local')->get($this->filePath);
            file_put_contents($tempFile, $imageData);

            $image = Image::read($tempFile)->toWebp( 60);
            Storage::disk('s3')->put($this->path, (string) $image, 'public');
        } catch (\Exception $e) {
            Log::error($e->getMessage());
        } finally {
            if (file_exists($tempFile)) {
                @unlink($tempFile);
            }
            Storage::disk('local')->delete($this->filePath);
        }
    }
}
