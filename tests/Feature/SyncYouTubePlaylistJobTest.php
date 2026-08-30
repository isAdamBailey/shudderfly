<?php

namespace Tests\Feature;

use App\Jobs\SyncYouTubePlaylist;
use App\Services\YouTubeService;
use App\Support\MusicJobStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SyncYouTubePlaylistJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    /**
     * Run the job with a YouTubeService stubbed to return the given result array.
     */
    private function runJobReturning(array $result): void
    {
        $mock = $this->createMock(YouTubeService::class);
        $mock->method('syncPlaylist')->willReturn($result);

        (new SyncYouTubePlaylist)->handle($mock);
    }

    public function test_successful_sync_records_success_status(): void
    {
        $this->runJobReturning([
            'success' => true,
            'message' => 'Synced 12 songs',
            'synced' => 12,
        ]);

        $status = MusicJobStatus::get();

        $this->assertSame('success', $status['state']);
        $this->assertSame('Synced 12 songs', $status['message']);
    }

    public function test_quota_exceeded_records_warning_status(): void
    {
        $this->runJobReturning([
            'success' => true,
            'message' => 'Synced 3 songs',
            'synced' => 3,
            'quota_exceeded' => true,
        ]);

        $status = MusicJobStatus::get();

        $this->assertSame('warning', $status['state']);
        $this->assertStringContainsString('Synced 3 songs', $status['message']);
        $this->assertStringContainsString(
            __('messages.music.sync_quota_exceeded'),
            $status['message']
        );
    }

    public function test_no_op_sync_still_records_success(): void
    {
        $this->runJobReturning([
            'success' => true,
            'message' => 'No new videos to sync',
            'synced' => 0,
            'deleted' => 0,
        ]);

        $status = MusicJobStatus::get();

        $this->assertSame('success', $status['state']);
        $this->assertSame('No new videos to sync', $status['message']);
    }

    public function test_failed_sync_records_error_status(): void
    {
        $this->runJobReturning([
            'success' => false,
            'error' => 'YouTube API key is missing',
        ]);

        $status = MusicJobStatus::get();

        $this->assertSame('error', $status['state']);
        $this->assertSame('YouTube API key is missing', $status['message']);
    }

    public function test_enqueue_dispatches_exactly_once(): void
    {
        // Regression: a static factory named queue() is picked up by
        // Bus\Dispatcher::dispatchToQueue(), which hands dispatch control to a
        // job's own queue() method — the job then re-dispatches itself forever.
        Queue::fake();

        SyncYouTubePlaylist::enqueue();

        Queue::assertPushed(SyncYouTubePlaylist::class, 1);
        $this->assertSame('queued', MusicJobStatus::get()['state']);
    }

    public function test_job_failure_hook_records_error_status(): void
    {
        MusicJobStatus::put('running', 'Syncing…');

        (new SyncYouTubePlaylist)->failed(new \RuntimeException('worker died'));

        $status = MusicJobStatus::get();

        $this->assertSame('error', $status['state']);
        $this->assertSame(__('messages.music.sync_failed'), $status['message']);
    }
}
