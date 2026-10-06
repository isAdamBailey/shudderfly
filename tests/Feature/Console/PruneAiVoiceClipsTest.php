<?php

namespace Tests\Feature\Console;

use App\Models\AiVoiceClip;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PruneAiVoiceClipsTest extends TestCase
{
    use RefreshDatabase;

    /** @var array<string, AiVoiceClip> */
    private array $clips;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('s3');

        $this->clips = [
            'stale' => AiVoiceClip::factory()->create(['characters' => 40, 'last_played_at' => now()->subDays(91)]),
            'recent' => AiVoiceClip::factory()->create(['last_played_at' => now()->subDays(89)]),
            // Made long ago but played recently: still in use.
            'oldButPlayed' => AiVoiceClip::factory()->create(['created_at' => now()->subDays(300), 'last_played_at' => now()->subDay()]),
        ];

        foreach ($this->clips as $clip) {
            Storage::disk('s3')->put($clip->path, 'mp3');
        }
    }

    public function test_deletes_clips_not_played_within_the_window_from_s3_and_the_index(): void
    {
        $this->artisan('ai-voice:prune')
            ->expectsOutput('Deleted 1 AI voice clip(s) not played in 90 day(s), freeing 40 character(s).')
            ->assertExitCode(0);

        $this->assertModelMissing($this->clips['stale']);
        Storage::disk('s3')->assertMissing($this->clips['stale']->path);

        foreach (['recent', 'oldButPlayed'] as $name) {
            $this->assertModelExists($this->clips[$name]);
            Storage::disk('s3')->assertExists($this->clips[$name]->path);
        }
    }

    public function test_dry_run_reports_without_deleting(): void
    {
        $this->artisan('ai-voice:prune', ['--dry-run' => true])
            ->expectsOutput('Would delete 1 AI voice clip(s) not played in 90 day(s), freeing 40 character(s).')
            ->assertExitCode(0);

        $this->assertSame(3, AiVoiceClip::count());
        $this->assertCount(3, Storage::disk('s3')->allFiles());
    }

    public function test_days_option_changes_the_window(): void
    {
        $this->artisan('ai-voice:prune', ['--days' => 5])
            ->expectsOutput('Deleted 2 AI voice clip(s) not played in 5 day(s), freeing 140 character(s).')
            ->assertExitCode(0);

        $this->assertModelExists($this->clips['oldButPlayed']);
    }

    public function test_rejects_a_non_positive_window(): void
    {
        $this->artisan('ai-voice:prune', ['--days' => 0])->assertExitCode(1);

        $this->assertSame(3, AiVoiceClip::count());
    }

    public function test_a_failed_s3_delete_still_removes_the_row_and_warns(): void
    {
        $disk = Storage::disk('s3');
        Storage::shouldReceive('disk')->with('s3')->andReturn(\Mockery::mock($disk)->makePartial()
            ->shouldReceive('delete')->andReturn(false)->getMock());

        $this->artisan('ai-voice:prune')
            ->expectsOutputToContain('Could not delete '.$this->clips['stale']->path)
            ->expectsOutput('Deleted 1 AI voice clip(s) not played in 90 day(s), freeing 40 character(s).')
            ->assertExitCode(0);

        $this->assertModelMissing($this->clips['stale']);
    }
}
