<?php

namespace App\Console\Commands;

use App\Services\YouTubeService;
use Illuminate\Console\Command;

class SyncYouTubePlaylistCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'music:sync-youtube';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync songs from YouTube playlist to the database';

    /**
     * Execute the console command.
     */
    public function handle(YouTubeService $youTubeService)
    {
        $this->info('Starting YouTube playlist sync...');

        try {
            $totalSynced = $youTubeService->syncPlaylist();
            $this->info("Successfully synced {$totalSynced} songs from YouTube playlist");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to sync YouTube playlist: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
