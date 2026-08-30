<?php

namespace Tests\Feature\Console;

use App\Jobs\SyncYouTubePlaylist;
use App\Services\YouTubeService;
use App\Support\MusicJobStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class SyncYouTubePlaylistCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
    }

    public function test_command_queues_the_sync_job(): void
    {
        Queue::fake();

        $this->artisan('music:sync-youtube')
            ->expectsOutput('YouTube playlist sync queued.')
            ->assertSuccessful();

        Queue::assertPushed(SyncYouTubePlaylist::class);
    }

    public function test_command_records_queued_status(): void
    {
        Queue::fake();

        $this->artisan('music:sync-youtube')->assertSuccessful();

        $this->assertSame('queued', MusicJobStatus::get()['state']);
    }

    public function test_queued_status_does_not_overwrite_an_inline_run(): void
    {
        // Under QUEUE_CONNECTION=sync (the local default) dispatch() runs the job
        // inline, so stamping 'queued' after dispatch would clobber the outcome.
        $mock = $this->createMock(YouTubeService::class);
        $mock->method('syncPlaylist')->willReturn([
            'success' => true,
            'message' => 'Successfully synced 2 songs',
            'synced' => 2,
        ]);
        $this->app->instance(YouTubeService::class, $mock);

        config(['queue.default' => 'sync']);

        $this->artisan('music:sync-youtube')->assertSuccessful();

        $this->assertSame('success', MusicJobStatus::get()['state']);
    }
}
