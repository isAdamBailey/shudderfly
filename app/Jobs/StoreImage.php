<?php

namespace App\Jobs;

use App\Models\Book;
use App\Models\Page;
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

    protected ?Book $book;

    protected ?string $content;

    protected ?string $videoLink;

    protected ?Page $page;

    /**
     * Create a new job instance.
     */
    public function __construct(string $filePath, string $path, ?Book $book = null, ?string $content = null, ?string $videoLink = null, ?Page $page = null)
    {
        $this->filePath = $filePath;
        $this->path = $path;
        $this->book = $book;
        $this->content = $content;
        $this->videoLink = $videoLink;
        $this->page = $page;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $disk = str_starts_with($this->filePath, 's3://') ? 's3' : 'local';
        $filePath = str_replace('s3://', '', $this->filePath);

        if (empty($filePath) || ! Storage::disk($disk)->exists($filePath)) {
            Log::error('File path is null, empty, or does not exist', ['filePath' => $filePath, 'disk' => $disk]);

            return;
        }

        $tempDir = storage_path('app/temp/');
        if (! is_dir($tempDir) && ! mkdir($tempDir, 0755, true)) {
            Log::error('Failed to create temp directory', ['directory' => $tempDir]);

            return;
        }
        $tempFile = $tempDir.uniqid('image_', true).'.webp';

        try {
            $imageData = Storage::disk($disk)->get($filePath);
            file_put_contents($tempFile, $imageData);

            $image = Image::read($tempFile);
            $encoded = $image->toWebp(30, true);
            Storage::disk('s3')->put($this->path, (string) $encoded, 'public');

            if ($this->page) {
                // Update existing page
                $this->page->update([
                    'content' => $this->content,
                    'media_path' => $this->path,
                    'video_link' => $this->videoLink,
                ]);
            } elseif ($this->book) {
                // Create new page
                $page = $this->book->pages()->create([
                    'content' => $this->content,
                    'media_path' => $this->path,
                    'video_link' => $this->videoLink,
                ]);

                // Set as cover page if book doesn't have one
                if (! $this->book->cover_page) {
                    $this->book->update(['cover_page' => $page->id]);
                }
            }

            
        } catch (\Exception $e) {
            Log::error('Error processing image', [
                'exception' => $e->getMessage(),
                'filePath' => $filePath,
                'disk' => $disk,
                'path' => $this->path,
            ]);
            $this->fail($e);
        } finally {
            if (file_exists($tempFile)) {
                if (! @unlink($tempFile)) {
                    Log::warning("Failed to delete temp file: $tempFile");
                }
            }

            // Only delete from local disk if it exists and was a local file
            if ($disk === 'local' && Storage::disk('local')->exists($filePath)) {
                Storage::disk('local')->delete($filePath);
            }
        }
    }
}
