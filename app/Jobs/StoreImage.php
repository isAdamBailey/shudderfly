<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Laravel\Facades\Image;

class StoreImage implements ShouldQueue
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
        $tempFile = storage_path('app/temp/').uniqid('image_', true).'.webp';

        try {
            Log::info('StoreImage job started', ['filePath' => $this->filePath, 'path' => $this->path]);

            $imageData = Storage::disk('local')->get($this->filePath);
            Log::info('Image data retrieved from local storage');

            file_put_contents($tempFile, $imageData);
            Log::info('Temporary image file saved', ['tempFile' => $tempFile]);

            $image = Image::read($tempFile);
            $encoded = $image->toWebp(60);
            Storage::disk('s3')->put($this->path, (string) $encoded, 'public');
            Log::info('Image processed and saved to S3', ['path' => $this->path]);
        } catch (\Exception $e) {
            Log::error('Error processing image', ['exception' => $e->getMessage(), 'filePath' => $this->filePath, 'path' => $this->path]);
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