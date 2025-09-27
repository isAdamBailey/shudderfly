<?php

namespace App\Console\Commands;

use App\Services\YouTubeService;
use Illuminate\Console\Command;

class UpdateVideoDetails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'music:backfill-details {--limit=50 : Number of songs to update per run}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill missing video details (duration, view count, tags) for existing songs';

    /**
     * Execute the console command.
     */
    public function handle(YouTubeService $youTubeService)
    {
        $limit = $this->option('limit');

        $this->info("Updating video details for up to {$limit} songs using batch processing...");

        try {
            $updated = $youTubeService->batchUpdateVideoDetails($limit);
            $this->info("Successfully updated details for {$updated} songs");

            if ($updated === 0) {
                $this->info('No songs needed updating - all video details are current');
            }

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to update video details: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}
