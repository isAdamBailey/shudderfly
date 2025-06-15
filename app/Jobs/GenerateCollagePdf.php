<?php

namespace App\Jobs;

use App\Mail\CollagePdfMail;
use App\Models\Collage;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;
use Aws\S3\S3Client;
use Intervention\Image\Facades\Image;

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

        try {
            // Initialize S3 client
            $s3 = new S3Client([
                'version' => 'latest',
                'region'  => config('filesystems.disks.s3.region'),
                'credentials' => [
                    'key'    => config('filesystems.disks.s3.key'),
                    'secret' => config('filesystems.disks.s3.secret'),
                ],
            ]);

            // Download all images in smaller batches
            $localImages = [];
            $batchSize = 2; // Reduced batch size to 2 images at a time
            $pages = $this->collage->pages->chunk($batchSize);

            foreach ($pages as $pageBatch) {
                foreach ($pageBatch as $page) {
                    $imageName = basename($page->media_path);
                    $localPath = "{$tempDir}/{$imageName}";

                    try {
                        // Extract S3 key from CloudFront URL and ensure no leading slash
                        $s3Path = ltrim(str_replace(env('CLOUDFRONT_URL'), '', $page->media_path), '/');
                        
                        // Download from S3 using stream
                        $result = $s3->getObject([
                            'Bucket' => config('filesystems.disks.s3.bucket'),
                            'Key'    => $s3Path,
                            'SaveAs' => $localPath
                        ]);

                        if (file_exists($localPath)) {
                            // Optimize image before converting to base64
                            $image = Image::make($localPath);
                            
                            // Resize image if it's too large (max 800px width/height)
                            if ($image->width() > 800 || $image->height() > 800) {
                                $image->resize(800, 800, function ($constraint) {
                                    $constraint->aspectRatio();
                                    $constraint->upsize();
                                });
                            }
                            
                            // Optimize image quality
                            $image->encode('jpg', 80); // Convert to JPG with 80% quality
                            
                            // Convert to base64
                            $imageData = base64_encode($image->encode('jpg', 80));
                            $base64Image = "data:image/jpeg;base64,{$imageData}";
                            
                            $localImages[] = [
                                'path' => $base64Image,
                                'page' => $page,
                            ];
                            
                            // Free up memory
                            $image->destroy();
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

            // Ensure there are images to include in the PDF
            if (empty($localImages)) {
                Log::error('No images were successfully downloaded for the collage', [
                    'collage_id' => $this->collage->id,
                ]);
                throw new \Exception('No images available to generate the PDF');
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
            $filename = "collages/collage-{$this->collage->id}.pdf";
            $pdfContent = $pdf->output();

            if (empty($pdfContent)) {
                Log::error('PDF content is empty', ['collage_id' => $this->collage->id]);
                throw new \Exception('Generated PDF content is empty');
            }

            // Save PDF to S3 instead of local storage
            $s3Key = "collages/collage-{$this->collage->id}.pdf";
            $s3Result = $s3->putObject([
                'Bucket' => config('filesystems.disks.s3.bucket'),
                'Key'    => $s3Key,
                'Body'   => $pdfContent,
                'ContentType' => 'application/pdf',
                'ACL'    => 'public-read'
            ]);

            if (!isset($s3Result['ObjectURL'])) {
                Log::error('Failed to upload PDF to S3', [
                    'collage_id' => $this->collage->id,
                    's3_key' => $s3Key,
                ]);
                throw new \Exception('Failed to upload PDF to S3');
            }

            // Get admin users
            $permission = Permission::findByName('edit pages');
            $admins = $permission->users;

            // Send email to admins with download link
            foreach ($admins as $admin) {
                Mail::to($admin->email)->send(new CollagePdfMail(
                    $this->collage,
                    $s3Result['ObjectURL']
                ));
            }

        } catch (\Exception $e) {
            Log::error('Error generating or sending PDF', [
                'collage_id' => $this->collage->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        } finally {
            // Clean up temporary files
            $this->cleanupTempFiles($tempDir);
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
}
