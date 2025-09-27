<?php

namespace App\Jobs;

use App\Services\YouTubeService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SyncYouTubePlaylist implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(YouTubeService $youTubeService): void
    {
        try {
            $totalSynced = $youTubeService->syncPlaylist();
            Log::info("Successfully synced {$totalSynced} songs from YouTube playlist");
        } catch (\Exception $e) {
            Log::error('Failed to sync YouTube playlist: ' . $e->getMessage());
            throw $e;
        }
    }
}
