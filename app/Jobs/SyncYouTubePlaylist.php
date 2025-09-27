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
            $result = $youTubeService->syncPlaylist();

            if (! $result['success']) {
                if ($result['quota_exceeded']) {
                    Log::warning('YouTube sync stopped due to quota limit: '.$result['error']);
                } else {
                    Log::error('YouTube sync failed: '.$result['error']);
                }

                return;
            }

            $message = "Successfully synced {$result['synced']} songs from YouTube playlist";
            if ($result['quota_exceeded']) {
                $message .= ' (quota limit reached)';
                Log::warning($message);
            } else {
                Log::info($message);
            }

        } catch (\Exception $e) {
            Log::error('Failed to sync YouTube playlist: '.$e->getMessage());
            // Don't re-throw the exception to prevent job failure
        }
    }
}
