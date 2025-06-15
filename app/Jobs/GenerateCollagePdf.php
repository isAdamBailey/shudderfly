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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
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
        // Create temporary directory for images
        $tempDir = storage_path("app/temp/collage-{$this->collage->id}");
        if (! file_exists($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        try {
            // Download all images in batches
            $localImages = [];
            $batchSize = 5; // Process 5 images at a time
            $pages = $this->collage->pages->chunk($batchSize);

            foreach ($pages as $pageBatch) {
                foreach ($pageBatch as $page) {
                    $imageName = basename($page->media_path);
                    $localPath = "{$tempDir}/{$imageName}";

                    // Download image from S3/CloudFront with timeout
                    $response = Http::timeout(30)->get($page->media_path);
                    if ($response->successful()) {
                        file_put_contents($localPath, $response->body());
                        $localImages[] = [
                            'path' => $localPath,
                            'page' => $page,
                        ];
                    } else {
                        Log::error('Failed to download image for collage', [
                            'collage_id' => $this->collage->id,
                            'page_id' => $page->id,
                            'media_path' => $page->media_path,
                            'status_code' => $response->status(),
                            'response_body' => $response->body(),
                        ]);
                    }
                }

                // Force garbage collection after each batch
                gc_collect_cycles();
            }

            // Ensure there are images to include in the PDF
            if (empty($localImages)) {
                Log::error('No images were successfully downloaded for the collage', [
                    'collage_id' => $this->collage->id,
                ]);
                throw new \Exception('No images available to generate the PDF');
            }

            // Generate PDF with local images
            $pdf = PDF::loadView('pdfs.collage', [
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

            $saved = Storage::disk('local')->put($filename, $pdfContent);

            if (! $saved) {
                Log::error('Failed to save PDF to storage', [
                    'collage_id' => $this->collage->id,
                    'filename' => $filename,
                ]);
                throw new \Exception('Failed to save PDF to storage');
            }

            // Verify the file exists and is readable
            if (! Storage::disk('local')->exists($filename)) {
                Log::error('PDF file not found after saving', [
                    'collage_id' => $this->collage->id,
                    'filename' => $filename,
                ]);
                throw new \Exception('PDF file not found after saving');
            }

            // Get admin users
            $permission = Permission::findByName('edit pages');
            $admins = $permission->users;

            // Send email to admins
            foreach ($admins as $admin) {
                $pdfPath = Storage::disk('local')->path($filename);

                if (! file_exists($pdfPath)) {
                    Log::error('PDF file not found at path', [
                        'collage_id' => $this->collage->id,
                        'path' => $pdfPath,
                    ]);

                    continue;
                }

                Mail::to($admin->email)->send(new CollagePdfMail(
                    $this->collage,
                    $pdfPath
                ));
            }

            // Delete the PDF after email is sent
            Storage::disk('local')->delete($filename);

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
