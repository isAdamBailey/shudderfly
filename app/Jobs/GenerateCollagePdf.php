<?php

namespace App\Jobs;

use App\Mail\CollagePdfMail;
use App\Models\Collage;
use Aws\S3\S3Client;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
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
                        // Extract S3 key from URL
                        $mediaPath = $page->media_path;
                        $cloudfrontUrl = env('CLOUDFRONT_URL');

                        if ($cloudfrontUrl && str_contains($mediaPath, $cloudfrontUrl)) {
                            // If it's a CloudFront URL, extract the path
                            $s3Path = ltrim(str_replace($cloudfrontUrl, '', $mediaPath), '/');
                        } else {
                            // If it's an S3 URL, extract just the key part
                            $s3Path = str_replace('https://'.config('filesystems.disks.s3.bucket').'.s3.us-west-2.amazonaws.com/', '', $mediaPath);
                            // Remove any double-encoded URLs
                            if (str_contains($s3Path, 'https%3A//')) {
                                $s3Path = urldecode($s3Path);
                                $s3Path = str_replace('https://'.config('filesystems.disks.s3.bucket').'.s3.us-west-2.amazonaws.com/', '', $s3Path);
                            }

                            // Ensure we have just the key part
                            if (str_contains($s3Path, 'https://')) {
                                $s3Path = str_replace('https://'.config('filesystems.disks.s3.bucket').'.s3.us-west-2.amazonaws.com/', '', $s3Path);
                            }
                        }

                        // Download from S3 using stream
                        $result = $s3->getObject([
                            'Bucket' => config('filesystems.disks.s3.bucket'),
                            'Key' => $s3Path,
                            'SaveAs' => $localPath,
                        ]);

                        if (file_exists($localPath)) {
                            // Optimize image before converting to base64
                            $image = Image::read($localPath);

                            // Calculate dynamic dimensions based on number of images
                            $imageCount = count($localImages) + 1; // +1 because we're processing this image

                            // Define grid configurations for different image counts
                            // Always maintaining 8.5x11 aspect ratio, images scale to fill available space
                            $gridConfigs = [
                                1 => ['cols' => 1, 'rows' => 1],    // 1 image = full page
                                2 => ['cols' => 2, 'rows' => 1],    // 2 images = side by side
                                3 => ['cols' => 3, 'rows' => 1],    // 3 images = three across
                                4 => ['cols' => 2, 'rows' => 2],    // 4 images = 2x2 grid
                                5 => ['cols' => 3, 'rows' => 2],    // 5 images = 3x2 grid
                                6 => ['cols' => 3, 'rows' => 2],    // 6 images = 3x2 grid
                                7 => ['cols' => 4, 'rows' => 2],    // 7 images = 4x2 grid
                                8 => ['cols' => 4, 'rows' => 2],    // 8 images = 4x2 grid
                                9 => ['cols' => 3, 'rows' => 3],    // 9 images = 3x3 grid
                                10 => ['cols' => 4, 'rows' => 3],   // 10 images = 4x3 grid
                                11 => ['cols' => 4, 'rows' => 3],   // 11 images = 4x3 grid
                                12 => ['cols' => 4, 'rows' => 3],   // 12 images = 4x3 grid
                                13 => ['cols' => 4, 'rows' => 4],   // 13 images = 4x4 grid
                                14 => ['cols' => 4, 'rows' => 4],   // 14 images = 4x4 grid
                                15 => ['cols' => 4, 'rows' => 4],   // 15 images = 4x4 grid
                                16 => ['cols' => 4, 'rows' => 4],    // 16 images = 4x4 grid
                            ];

                            // Use the specific config if available, otherwise use the largest available config
                            $config = $gridConfigs[$imageCount] ?? $gridConfigs[array_key_last($gridConfigs)];

                            // Calculate cell dimensions in inches (8in x 10.5in usable area)
                            $cellWidthInches = 8 / $config['cols'];
                            $cellHeightInches = 10.5 / $config['rows'];

                            // Convert to pixels at 100 DPI
                            $targetWidth = (int) ($cellWidthInches * 100);
                            $targetHeight = (int) ($cellHeightInches * 100);

                            // Resize image to fit the target dimensions
                            $image->resize($targetWidth, $targetHeight);

                            // Optimize image quality and convert to JPG
                            $encoded = $image->toJpeg(80);

                            // Convert to base64
                            $imageData = base64_encode((string) $encoded);
                            $base64Image = "data:image/jpeg;base64,{$imageData}";

                            $localImages[] = [
                                'path' => $base64Image,
                                'page' => $page,
                            ];

                            // Free up memory
                            unset($image);
                            unset($encoded);
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

            // Configure DomPDF for better performance and smaller size
            $pdf = PDF::setOptions([
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
                // Generate preview image
                $previewImage = $this->generatePreviewImage($localImages);
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
    protected function generatePreviewImage(array $localImages): ?string
    {
        try {
            $pageCount = count($localImages);
            $gridConfigs = [
                1 => ['cols' => 1, 'rows' => 1],    // 1 image = full page
                2 => ['cols' => 2, 'rows' => 1],    // 2 images = side by side
                3 => ['cols' => 3, 'rows' => 1],    // 3 images = three across
                4 => ['cols' => 2, 'rows' => 2],    // 4 images = 2x2 grid
                5 => ['cols' => 3, 'rows' => 2],    // 5 images = 3x2 grid
                6 => ['cols' => 3, 'rows' => 2],    // 6 images = 3x2 grid
                7 => ['cols' => 4, 'rows' => 2],    // 7 images = 4x2 grid
                8 => ['cols' => 4, 'rows' => 2],    // 8 images = 4x2 grid
                9 => ['cols' => 3, 'rows' => 3],    // 9 images = 3x3 grid
                10 => ['cols' => 4, 'rows' => 3],   // 10 images = 4x3 grid
                11 => ['cols' => 4, 'rows' => 3],   // 11 images = 4x3 grid
                12 => ['cols' => 4, 'rows' => 3],   // 12 images = 4x3 grid
                13 => ['cols' => 4, 'rows' => 4],   // 13 images = 4x4 grid
                14 => ['cols' => 4, 'rows' => 4],   // 14 images = 4x4 grid
                15 => ['cols' => 4, 'rows' => 4],   // 15 images = 4x4 grid
                16 => ['cols' => 4, 'rows' => 4],    // 16 images = 4x4 grid
            ];

            // Use the specific config if available, otherwise use the largest available config
            $config = $gridConfigs[$pageCount] ?? $gridConfigs[array_key_last($gridConfigs)];

            // Calculate grid capacity (maximum number of images that can fit)
            $gridCapacity = $config['cols'] * $config['rows'];
            
            // Limit images to grid capacity to match PDF layout exactly
            $imagesToProcess = array_slice($localImages, 0, $gridCapacity);

            // Match PDF dimensions: 8.5in x 11in with 0.25in margins = 8in x 10.5in grid
            $previewWidth = 800; // 8in * 100 DPI
            $previewHeight = 1050; // 10.5in * 100 DPI
            
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

                // Resize and copy image to canvas (cast to integers for consistency)
                imagecopyresampled(
                    $canvas, 
                    $image, 
                    (int) $x, (int) $y, 
                    0, 0, 
                    (int) $cellWidth, (int) $cellHeight, 
                    imagesx($image), imagesy($image)
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
