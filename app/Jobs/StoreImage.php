<?php

namespace App\Jobs;

use App\Models\Book;
use App\Models\Page;
use App\Services\MediaDescriptionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\Laravel\Facades\Image;

class StoreImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Generating a description calls an external model, so allow more than the
     * 60s queue default -- but stay under the queues' retry_after of 90s, or a
     * still-running job gets re-reserved and the upload is written twice.
     */
    public int $timeout = 85;

    protected string $filePath;

    protected string $path;

    protected ?Book $book;

    protected ?string $content;

    protected ?string $videoLink;

    protected ?Page $page;

    protected ?string $oldMediaPath;

    protected ?string $oldPosterPath;

    protected ?float $latitude;

    protected ?float $longitude;

    /**
     * Create a new job instance.
     */
    public function __construct(string $filePath, string $path, ?Book $book = null, ?string $content = null, ?string $videoLink = null, ?Page $page = null, ?string $oldMediaPath = null, ?string $oldPosterPath = null, ?float $latitude = null, ?float $longitude = null)
    {
        $this->filePath = $filePath;
        $this->path = $path;
        $this->book = $book;
        $this->content = $content;
        $this->videoLink = $videoLink;
        $this->page = $page;
        $this->oldMediaPath = $oldMediaPath;
        $this->oldPosterPath = $oldPosterPath;
        $this->latitude = $latitude;
        $this->longitude = $longitude;
    }

    /**
     * Execute the job.
     */
    public function handle(MediaDescriptionService $descriptions): void
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
            unset($imageData);

            $image = Image::decode($tempFile);
            $encoded = $image->encode(new WebpEncoder(30, true));
            Storage::disk('s3')->put($this->path, (string) $encoded);
            Storage::disk('s3')->setVisibility($this->path, 'public');

            $page = null;

            if ($this->page) {
                $this->page->update([
                    'content' => $this->content,
                    'media_path' => $this->path,
                    'video_link' => $this->videoLink,
                    'latitude' => $this->latitude,
                    'longitude' => $this->longitude,
                ]);

                $page = $this->page;
            } elseif ($this->book) {
                $page = $this->book->pages()->create([
                    'content' => $this->content,
                    'media_path' => $this->path,
                    'video_link' => $this->videoLink,
                    'latitude' => $this->latitude,
                    'longitude' => $this->longitude,
                ]);

                if (! $this->book->cover_page) {
                    $this->book->update(['cover_page' => $page->id]);
                }
            }

            // Caption last, so the page and its media are already visible while
            // the model runs. This never throws, so a slow or failing model
            // costs nothing. $image is safe to downscale here: the stored webp
            // was encoded above and nothing reads $image after this point.
            if ($page) {
                try {
                    $caption = $descriptions->resolveCaption($this->content, $image);

                    if ($caption !== $this->content) {
                        $page->update(['content' => $caption]);
                    }
                } catch (\Throwable $captionError) {
                    // The media and the page are already stored, so a caption
                    // problem must not fail an upload that otherwise succeeded.
                    Log::warning('Failed to caption image after StoreImage', [
                        'page_id' => $page->id,
                        'exception' => $captionError->getMessage(),
                    ]);
                }
            }

            // Delete old media/poster if provided (post-success)
            try {
                if ($this->oldMediaPath) {
                    Storage::disk('s3')->delete($this->oldMediaPath);
                }
            } catch (\Throwable $cleanupError) {
                Log::warning('Failed to delete old media after StoreImage', [
                    'path' => $this->oldMediaPath,
                    'exception' => $cleanupError->getMessage(),
                ]);
            }

            try {
                if ($this->oldPosterPath) {
                    Storage::disk('s3')->delete($this->oldPosterPath);
                }
            } catch (\Throwable $cleanupError) {
                Log::warning('Failed to delete old poster after StoreImage', [
                    'path' => $this->oldPosterPath,
                    'exception' => $cleanupError->getMessage(),
                ]);
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

            // Always attempt to remove the source file after processing
            try {
                if (Storage::disk($disk)->exists($filePath)) {
                    Storage::disk($disk)->delete($filePath);
                }
            } catch (\Throwable $cleanupError) {
                Log::warning('Failed to delete source file after StoreImage', [
                    'disk' => $disk,
                    'path' => $filePath,
                    'exception' => $cleanupError->getMessage(),
                ]);
            }
        }
    }
}
