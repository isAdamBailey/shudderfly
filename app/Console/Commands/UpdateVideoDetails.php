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
    protected $signature = 'music:update-details {--limit=50 : Number of songs to update per run}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update video details (duration, view count, tags) for songs missing this data';

    /**
     * Execute the console command.
     */
    public function handle(YouTubeService $youTubeService)
    {
        $limit = $this->option('limit');

        $this->info("Updating video details for up to {$limit} songs...");

        try {
            $updated = $youTubeService->updateVideoDetails($limit);
            $this->info("Successfully updated details for {$updated} songs");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to update video details: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
