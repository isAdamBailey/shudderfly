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
        if (empty($this->filePath) || ! Storage::disk('local')->exists($this->filePath)) {
            Log::error('File path is null, empty, or does not exist', ['filePath' => $this->filePath]);

            return;
        }

        $tempDir = storage_path('app/temp/');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0755, true)) {
            Log::error('Failed to create temp directory', ['directory' => $tempDir]);

            return;
        }
        $tempFile = $tempDir.uniqid('image_', true).'.webp';

        try {
            $imageData = Storage::disk('local')->get($this->filePath);
            file_put_contents($tempFile, $imageData);

            $image = Image::read($tempFile);
            $encoded = $image->toWebp(60);
            Storage::disk('s3')->put($this->path, (string) $encoded, 'public');
        } catch (\Exception $e) {
            Log::error('Error processing image', ['exception' => $e->getMessage(), 'filePath' => $this->filePath, 'path' => $this->path]);
            $this->fail($e);
        } finally {
            if (file_exists($tempFile)) {
                if (! @unlink($tempFile)) {
                    Log::warning("Failed to delete temp file: $tempFile");
                }
            }

            if (Storage::disk('local')->exists($this->filePath)) {
                Storage::disk('local')->delete($this->filePath);
            }
        }
    }
}
