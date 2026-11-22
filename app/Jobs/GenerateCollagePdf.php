<?php

namespace App\Jobs;

use App\Mail\CollagePdfMail;
use App\Models\Collage;
use App\Support\Collage as CollageLayout;
use Aws\S3\S3Client;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Encoders\JpegEncoder;
use Intervention\Image\Laravel\Facades\Image;
use Spatie\Permission\Models\Permission;

class GenerateCollagePdf implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        protected Collage $collage
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Increase memory limit to 2GB
        ini_set('memory_limit', '2G');

        // Create temporary directory for images
        $tempDir = storage_path("app/temp/collage-{$this->collage->id}");
        if (! file_exists($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $errorMessage = null;

        try {
            // Download all images in smaller batches
            $localImages = [];
            $batchSize = 2; // Reduced batch size to 2 images at a time
            $pages = $this->collage->pages->chunk($batchSize);

            $s3 = new S3Client([
                'version' => 'latest',
                'region' => config('filesystems.disks.s3.region'),
                'credentials' => [
                    'key' => config('filesystems.disks.s3.key'),
                    'secret' => config('filesystems.disks.s3.secret'),
                ],
            ]);

            foreach ($pages as $pageBatch) {
                foreach ($pageBatch as $page) {
                    $imageName = basename($page->media_path);
                    $localPath = "{$tempDir}/{$imageName}";

                    try {
                        $s3Path = $this->resolveS3KeyFromMediaPath($page->media_path);

                        if ($s3Path === '') {
                            Log::error('Invalid media path for S3 download', [
                                'collage_id' => $this->collage->id,
                                'page_id' => $page->id,
                                'media_path' => $page->media_path,
                            ]);

                            continue;
                        }

                        // Download from S3 using stream
                        $s3->getObject([
                            'Bucket' => config('filesystems.disks.s3.bucket'),
                            'Key' => $s3Path,
                            'SaveAs' => $localPath,
                        ]);

                        if (file_exists($localPath)) {
                            // Store the page data temporarily before processing
                            $localImages[] = [
                                'local_path' => $localPath,
                                'page' => $page,
                            ];
                        } else {
                            Log::error('Failed to save image locally', [
                                'collage_id' => $this->collage->id,
                                'page_id' => $page->id,
                                'media_path' => $page->media_path,
                                's3_path' => $s3Path,
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Error downloading image from S3', [
                            'collage_id' => $this->collage->id,
                            'page_id' => $page->id,
                            'media_path' => $page->media_path,
                            's3_path' => $s3Path ?? null,
                            'error' => $e->getMessage(),
                        ]);

                        continue;
                    }

                    // Force garbage collection after each image
                    gc_collect_cycles();
                }

                // Additional garbage collection after each batch
                gc_collect_cycles();
            }

            if (empty($localImages)) {
                Log::error('No images were successfully downloaded for the collage', [
                    'collage_id' => $this->collage->id,
                ]);
                $errorMessage = 'No images were available to generate the PDF';

                return;
            }

            // Calculate grid configuration based on actual number of successfully downloaded images
            $actualImageCount = count($localImages);

            $gridConfig = CollageLayout::grid($actualImageCount);

            // Each picture is fitted to its cell at CollageLayout::DPI
            $cell = CollageLayout::cell($gridConfig);
            $targetWidth = (int) ($cell['width'] * CollageLayout::DPI);
            $targetHeight = (int) ($cell['height'] * CollageLayout::DPI);

            // Now process the downloaded images with the correct grid configuration
            $processedImages = [];
            foreach ($localImages as $imageData) {
                $localPath = $imageData['local_path'];
                $page = $imageData['page'];

                // Optimize image before converting to base64
                $image = Image::decode($localPath);

                // Fit image within its cell, keeping its shape and leaving the rest of
                // the cell empty, so the border behind shows round it
                $image->scale($targetWidth, $targetHeight);

                // Optimize image quality and convert to JPG
                $encoded = $image->encode(new JpegEncoder(quality: 80));

                // Convert to base64
                $imageData = base64_encode((string) $encoded);
                $base64Image = "data:image/jpeg;base64,{$imageData}";

                $processedImages[] = [
                    'path' => $base64Image,
                    'page' => $page,
                    // Its size on the page, in inches
                    'width' => $image->width() / CollageLayout::DPI,
                    'height' => $image->height() / CollageLayout::DPI,
                ];

                // Free up memory
                unset($image);
                unset($encoded);

                // Force garbage collection after each image
                gc_collect_cycles();
            }

            // Use processed images instead of localImages for PDF generation
            $localImages = $processedImages;

            // The border's colour and the month it was printed, shared by the PDF and its preview
            $printedOn = Carbon::now(config('app.local_timezone'));
            $printedAt = $printedOn->format('F Y');
            $color = CollageLayout::color($printedOn);

            // Configure DomPDF for better performance and smaller size
            $pdf = Pdf::setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'isPhpEnabled' => true,
                'dpi' => 100, // Reduced DPI for smaller file size
                'defaultFont' => 'sans-serif',
                'compress' => true, // Enable compression
                'chroot' => storage_path('app'), // Restrict file access
            ])->loadView('pdfs.collage', [
                'collage' => $this->collage,
                'localImages' => $localImages,
                'grid' => $gridConfig,
                'printedAt' => $printedAt,
                'color' => $color,
            ]);

            // Create collages directory if it doesn't exist
            $collagesDir = storage_path('app/collages');
            if (! file_exists($collagesDir)) {
                mkdir($collagesDir, 0755, true);
            }

            // Save PDF to storage
            $pdfContent = $pdf->output();

            if (empty($pdfContent)) {
                Log::error('PDF content is empty', ['collage_id' => $this->collage->id]);
                $errorMessage = 'Generated PDF content is empty';

                return;
            }

            // Save PDF to S3
            $s3Key = "collages/collage-{$this->collage->id}.pdf";
            if (Storage::disk('s3')->put($s3Key, $pdfContent, ['visibility' => 'public'])) {
                // Generate preview image using the same grid configuration as the PDF
                $previewImage = $this->generatePreviewImage($localImages, $gridConfig, $color, $printedAt);
                $previewKey = "collages/collage-{$this->collage->id}-preview.jpg";

                // Prepare the update data
                $updateData = [
                    'storage_path' => $s3Key,
                    'is_archived' => true,
                ];

                // Only set preview_path if generation succeeded AND S3 upload succeeded
                if ($previewImage && Storage::disk('s3')->put($previewKey, $previewImage, ['visibility' => 'public'])) {
                    $updateData['preview_path'] = $previewKey;
                }

                // Store the storage path in the collage record
                $this->collage->update($updateData);
            } else {
                Log::error('Failed to upload PDF to S3', [
                    'collage_id' => $this->collage->id,
                    's3_key' => $s3Key,
                ]);
                $errorMessage = 'Failed to upload PDF to S3';

                return;
            }

        } catch (\Exception $e) {
            Log::error('Error generating or sending PDF', [
                'collage_id' => $this->collage->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $errorMessage = 'Error generating PDF: '.$e->getMessage();
            throw $e;
        } finally {
            // Clean up temporary files
            $this->cleanupTempFiles($tempDir);

            // Get admin users
            $permission = Permission::findByName('admin');
            $admins = $permission->users;

            // Send email to admins
            foreach ($admins as $admin) {
                Mail::to($admin->email)->send(new CollagePdfMail(
                    $this->collage,
                    $errorMessage
                ));
            }
        }
    }

    protected function resolveS3KeyFromMediaPath(?string $mediaPath): string
    {
        if (! is_string($mediaPath) || $mediaPath === '') {
            return '';
        }

        $resolvedPath = trim($mediaPath);

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $decoded = urldecode($resolvedPath);
            if ($decoded === $resolvedPath) {
                break;
            }

            $resolvedPath = $decoded;
        }

        if (
            ! preg_match('/^https?:\/\//i', $resolvedPath)
            && preg_match('/^[^\/]+\.[^\/]+\//', $resolvedPath)
        ) {
            $resolvedPath = 'https://'.$resolvedPath;
        }

        if (filter_var($resolvedPath, FILTER_VALIDATE_URL)) {
            $resolvedPath = (string) parse_url($resolvedPath, PHP_URL_PATH);
        }

        $resolvedPath = trim($resolvedPath);

        if (str_contains($resolvedPath, '?')) {
            $resolvedPath = (string) strtok($resolvedPath, '?');
        }

        return ltrim($resolvedPath, '/');
    }

    /**
     * Clean up temporary files and directory
     */
    protected function cleanupTempFiles(string $dir): void
    {
        if (file_exists($dir)) {
            $files = glob("{$dir}/*");
            foreach ($files as $file) {
                unlink($file);
            }
            rmdir($dir);
        }
    }

    /**
     * Generate a preview image of the PDF page, border and month included,
     * at CollageLayout::DPI, the pictures placed as the PDF places them.
     */
    protected function generatePreviewImage(array $localImages, array $gridConfig, string $color, string $printedAt): ?string
    {
        try {
            // Limit images to grid capacity to match PDF layout exactly
            $imagesToProcess = array_slice($localImages, 0, $gridConfig['cols'] * $gridConfig['rows']);
            $px = fn (float $inches): int => (int) round($inches * CollageLayout::DPI);

            $pageWidth = $px(CollageLayout::PAGE_WIDTH);
            $pageHeight = $px(CollageLayout::PAGE_HEIGHT);
            $border = $px(CollageLayout::BORDER);

            // The page in the border's colour, white inside it, the pictures over both
            $canvas = imagecreatetruecolor($pageWidth, $pageHeight);
            [$r, $g, $b] = sscanf($color, '#%02x%02x%02x');
            imagefilledrectangle($canvas, 0, 0, $pageWidth - 1, $pageHeight - 1, imagecolorallocate($canvas, $r, $g, $b));
            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefilledrectangle($canvas, $border, $border, $pageWidth - $border - 1, $pageHeight - $border - 1, $white);

            $this->drawPrintedAt($canvas, $printedAt, $white, $px(CollageLayout::PICTURES_TOP));

            $placements = CollageLayout::placements($gridConfig, $imagesToProcess);

            foreach ($imagesToProcess as $index => $imageData) {
                $imageBytes = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $imageData['path']));
                $image = imagecreatefromstring($imageBytes);

                if ($image === false) {
                    continue; // Skip invalid images
                }

                // Already fitted to its cell at this resolution, so copied as is
                $place = $placements[$index];
                imagecopy($canvas, $image, $px($place['left']), $px($place['top']), 0, 0, imagesx($image), imagesy($image));
            }

            ob_start();
            imagejpeg($canvas, null, 80);
            $jpegData = ob_get_contents();
            ob_end_clean();

            return $jpegData;
        } catch (\Exception $e) {
            Log::error('Failed to generate preview image', [
                'collage_id' => $this->collage->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Write the month it was printed in white, centred in the strip above the pictures,
     * in the bold DejaVu Sans the PDF uses (it ships with DomPDF).
     */
    protected function drawPrintedAt(\GdImage $canvas, string $printedAt, int $white, int $stripHeight): void
    {
        $font = base_path('vendor/dompdf/dompdf/lib/fonts/DejaVuSans-Bold.ttf');

        if (! function_exists('imagettftext') || ! is_file($font)) {
            return;
        }

        // GD takes points at 96 DPI; scaled so the text is the PDF's size on this canvas
        $size = CollageLayout::LABEL_SIZE * CollageLayout::DPI / 96;
        $box = imagettfbbox($size, 0, $font, $printedAt);

        if ($box === false) {
            return; // The preview is still worth having without its month
        }

        $textWidth = $box[2] - $box[0];
        $textHeight = $box[1] - $box[7];
        $x = (int) ((imagesx($canvas) - $textWidth) / 2 - $box[0]);
        $y = (int) (($stripHeight + $textHeight) / 2 - $box[1]);

        imagettftext($canvas, $size, 0, $x, $y, $white, $font, $printedAt);
    }
}
