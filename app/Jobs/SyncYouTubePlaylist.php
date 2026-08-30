<?php

namespace App\Jobs;

use App\Services\YouTubeService;
use App\Support\MusicJobStatus;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncYouTubePlaylist implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The sync is a long chain of YouTube API calls. A blind retry would burn
     * quota re-fetching what the first attempt already wrote, so failures wait
     * for the next scheduled run instead.
     */
    public int $tries = 1;

    public int $timeout = 900;

    /**
     * Queue the sync and record that it is pending.
     *
     * Every dispatcher goes through here so the 'queued' status is stamped
     * before the job can run — under the local `sync` driver dispatch() runs
     * inline, so stamping afterwards would overwrite the job's own outcome.
     *
     * Not named queue(): Bus\Dispatcher::dispatchToQueue() hands control to a
     * job's own queue() method if it defines one, so that name would make this
     * re-dispatch itself forever.
     */
    public static function enqueue(): void
    {
        MusicJobStatus::put('queued', __('messages.music.sync_queued'));

        self::dispatch();
    }

    /**
     * Note: on SQS the message's visibility timeout must be at least $timeout,
     * or the message is redelivered while the first attempt is still running.
     * The WithoutOverlapping cache lock below is what prevents two workers
     * syncing at once if it isn't — it is load-bearing, not a nicety.
     */
    public function middleware(): array
    {
        return [(new WithoutOverlapping('music-sync'))->expireAfter($this->timeout)];
    }

    public function handle(YouTubeService $youTubeService): void
    {
        MusicJobStatus::put('running', __('messages.music.sync_running'));

        $result = $youTubeService->syncPlaylist();

        if (! ($result['success'] ?? false)) {
            $error = $result['error'] ?? __('messages.music.sync_failed');

            Log::error('YouTube playlist sync failed', ['error' => $error]);
            MusicJobStatus::put('error', $error);

            return;
        }

        $message = $result['message'] ?? '';

        if ($result['quota_exceeded'] ?? false) {
            MusicJobStatus::put('warning', trim($message.' '.__('messages.music.sync_quota_exceeded')));

            return;
        }

        MusicJobStatus::put('success', $message);
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('YouTube playlist sync job failed', [
            'message' => $exception?->getMessage(),
        ]);

        MusicJobStatus::put('error', __('messages.music.sync_failed'));
    }
}
