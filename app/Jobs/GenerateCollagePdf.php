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

            // Calculate cell dimensions in inches matching the PDF template (8in x 10.25in with 0.05in gaps)
            $pdfGap = 0.05;
            $cellWidthInches = (8 - ($gridConfig['cols'] - 1) * $pdfGap) / $gridConfig['cols'];
            $cellHeightInches = (10.25 - ($gridConfig['rows'] - 1) * $pdfGap) / $gridConfig['rows'];

            // Convert to pixels at 100 DPI once
            $targetWidth = (int) ($cellWidthInches * 100);
            $targetHeight = (int) ($cellHeightInches * 100);

            // Now process the downloaded images with the correct grid configuration
            $processedImages = [];
            foreach ($localImages as $imageData) {
                $localPath = $imageData['local_path'];
                $page = $imageData['page'];

                // Optimize image before converting to base64
                $image = Image::decode($localPath);

                // Fit image within cell dimensions while preserving aspect ratio, padding with white
                $image->contain($targetWidth, $targetHeight, 'ffffff');

                // Optimize image quality and convert to JPG
                $encoded = $image->encode(new JpegEncoder(quality: 80));

                // Convert to base64
                $imageData = base64_encode((string) $encoded);
                $base64Image = "data:image/jpeg;base64,{$imageData}";

                $processedImages[] = [
                    'path' => $base64Image,
                    'page' => $page,
                ];

                // Free up memory
                unset($image);
                unset($encoded);

                // Force garbage collection after each image
                gc_collect_cycles();
            }

            // Use processed images instead of localImages for PDF generation
            $localImages = $processedImages;

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
                'printedAt' => Carbon::now(config('app.timezone'))->format('F Y'),
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
                $previewImage = $this->generatePreviewImage($localImages, $gridConfig);
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
     * Generate a preview image of the PDF layout.
     */
    protected function generatePreviewImage(array $localImages, array $gridConfig): ?string
    {
        try {
            // Use the passed grid configuration (same as PDF) instead of calculating based on downloaded images
            $config = $gridConfig;

            // Calculate grid capacity (maximum number of images that can fit)
            $gridCapacity = $config['cols'] * $config['rows'];

            // Limit images to grid capacity to match PDF layout exactly
            $imagesToProcess = array_slice($localImages, 0, $gridCapacity);

            // Match PDF dimensions: 8.5in x 11in with 0.5in top header and 0.25in margins elsewhere = 8in x 10.25in grid
            $previewWidth = 800; // 8in * 100 DPI
            $previewHeight = 1025; // 10.25in * 100 DPI

            // Gap between cells (0.05in * 100 DPI = 5px)
            $gap = 5;

            // Calculate cell dimensions with gaps (matching PDF template)
            $cellWidth = ($previewWidth - ($config['cols'] - 1) * $gap) / $config['cols'];
            $cellHeight = ($previewHeight - ($config['rows'] - 1) * $gap) / $config['rows'];

            // Use GD for compositing instead of Intervention Image
            $canvas = imagecreatetruecolor($previewWidth, $previewHeight);
            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefill($canvas, 0, 0, $white);

            foreach ($imagesToProcess as $index => $imageData) {
                $base64Image = $imageData['path'];

                // Decode base64 image
                $imageBytes = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64Image));

                // Create image from string using GD
                $image = imagecreatefromstring($imageBytes);

                if ($image === false) {
                    continue; // Skip invalid images
                }

                // Calculate position for the current image (matching PDF template)
                $row = floor($index / $config['cols']);
                $col = $index % $config['cols'];
                $x = $col * ($cellWidth + $gap);
                $y = $row * ($cellHeight + $gap);

                // Scale image to fit within cell while preserving aspect ratio, centered with white background
                $srcWidth = imagesx($image);
                $srcHeight = imagesy($image);
                $scale = min($cellWidth / $srcWidth, $cellHeight / $srcHeight);
                $drawWidth = (int) ($srcWidth * $scale);
                $drawHeight = (int) ($srcHeight * $scale);
                $drawX = (int) ($x + ($cellWidth - $drawWidth) / 2);
                $drawY = (int) ($y + ($cellHeight - $drawHeight) / 2);

                imagecopyresampled(
                    $canvas,
                    $image,
                    $drawX, $drawY,
                    0, 0,
                    $drawWidth, $drawHeight,
                    $srcWidth, $srcHeight
                );

                // Clean up
                imagedestroy($image);
            }

            // Convert to JPEG
            ob_start();
            imagejpeg($canvas, null, 80);
            $jpegData = ob_get_contents();
            ob_end_clean();

            // Clean up
            imagedestroy($canvas);

            return $jpegData;
        } catch (\Exception $e) {
            Log::error('Failed to generate preview image', [
                'collage_id' => $this->collage->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
