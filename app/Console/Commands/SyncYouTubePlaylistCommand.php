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
            $result = $youTubeService->syncPlaylist();

            // Handle the result array from the service
            if (! isset($result['success']) || ! $result['success']) {
                $errorMessage = $result['error'] ?? 'Unknown error occurred';
                $this->error('Failed to sync YouTube playlist: '.$errorMessage);

                return Command::FAILURE;
            }

            $totalSynced = $result['synced'] ?? 0;
            $message = $result['message'] ?? "Successfully synced {$totalSynced} songs from YouTube playlist";

            if (isset($result['quota_exceeded']) && $result['quota_exceeded']) {
                $this->warn($message);
            } else {
                $this->info($message);
            }

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Failed to sync YouTube playlist: '.$e->getMessage());
            \Log::error('YouTube sync command failed: '.$e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);

            return Command::FAILURE;
        }
    }
}
