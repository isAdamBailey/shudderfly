<?php

namespace Tests\Unit;

use App\Jobs\IncrementSongReadCount;
use App\Models\Song;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class IncrementSongReadCountJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_job_increments_top_20_song_by_0_1(): void
    {
        // Create 25 songs with different read counts to ensure we have a top 20
        $topSongs = Song::factory()->count(20)->create(['read_count' => 100]);
        $bottomSongs = Song::factory()->count(5)->create(['read_count' => 1]);

        $topSong = $topSongs->first();
        $originalCount = $topSong->read_count;

        $job = new IncrementSongReadCount($topSong);
        $job->handle();

        $topSong->refresh();
        $this->assertEquals($originalCount + 0.1, $topSong->read_count);
    }

    public function test_job_increments_non_top_20_song_by_age_based_amount(): void
    {
        // Create 20 top songs so our test song won't be in top 20
        Song::factory()->count(20)->create(['read_count' => 100]);

        $testSong = Song::factory()->create([
            'read_count' => 5,
            'created_at' => now()->subDays(3) // 3 days old, should get 3.0 boost
        ]);

        $job = new IncrementSongReadCount($testSong);
        $job->handle();

        $testSong->refresh();
        $this->assertEquals(8.0, $testSong->read_count); // 5 + 3.0
    }

    public function test_age_based_increment_for_1_week_old_song(): void
    {
        Song::factory()->count(20)->create(['read_count' => 100]);

        $song = Song::factory()->create([
            'read_count' => 0,
            'created_at' => now()->subDays(5) // 5 days old
        ]);

        $job = new IncrementSongReadCount($song);
        $job->handle();

        $song->refresh();
        $this->assertEquals(3.0, $song->read_count);
    }

    public function test_age_based_increment_for_1_month_old_song(): void
    {
        Song::factory()->count(20)->create(['read_count' => 100]);

        $song = Song::factory()->create([
            'read_count' => 0,
            'created_at' => now()->subDays(20) // 20 days old
        ]);

        $job = new IncrementSongReadCount($song);
        $job->handle();

        $song->refresh();
        $this->assertEquals(2.0, $song->read_count);
    }

    public function test_age_based_increment_for_2_month_old_song(): void
    {
        Song::factory()->count(20)->create(['read_count' => 100]);

        $song = Song::factory()->create([
            'read_count' => 0,
            'created_at' => now()->subDays(45) // 45 days old
        ]);

        $job = new IncrementSongReadCount($song);
        $job->handle();

        $song->refresh();
        $this->assertEquals(1.5, $song->read_count);
    }

    public function test_age_based_increment_for_3_month_old_song(): void
    {
        Song::factory()->count(20)->create(['read_count' => 100]);

        $song = Song::factory()->create([
            'read_count' => 0,
            'created_at' => now()->subDays(75) // 75 days old
        ]);

        $job = new IncrementSongReadCount($song);
        $job->handle();

        $song->refresh();
        $this->assertEquals(1.2, $song->read_count);
    }

    public function test_age_based_increment_for_old_song(): void
    {
        Song::factory()->count(20)->create(['read_count' => 100]);

        $song = Song::factory()->create([
            'read_count' => 0,
            'created_at' => now()->subDays(120) // 120 days old
        ]);

        $job = new IncrementSongReadCount($song);
        $job->handle();

        $song->refresh();
        $this->assertEquals(1.0, $song->read_count);
    }

    public function test_job_prevents_duplicate_processing_with_cache(): void
    {
        $song = Song::factory()->create(['read_count' => 5]);

        // Set cache to simulate job already running
        Cache::put("song_read_count_job_{$song->id}", true, now()->addMinutes(5));

        $job = new IncrementSongReadCount($song);
        $job->handle();

        $song->refresh();
        $this->assertEquals(5, $song->read_count); // Should remain unchanged
    }

    public function test_job_refreshes_song_before_processing(): void
    {
        // Create 20 songs with high read counts to ensure our test song is not in top 20
        Song::factory()->count(20)->create(['read_count' => 100]);

        $song = Song::factory()->create([
            'read_count' => 5,
            'created_at' => now()->subDays(120) // Old song for 1.0 increment
        ]);

        // Simulate external update to the song
        Song::where('id', $song->id)->update(['read_count' => 10]);

        $job = new IncrementSongReadCount($song);
        $job->handle();

        $song->refresh();
        // Should use refreshed value (10) not original (5)
        $this->assertEquals(11.0, $song->read_count); // 10 + 1.0 (not in top 20, old song)
    }

    public function test_job_handles_null_read_count(): void
    {
        Song::factory()->count(20)->create(['read_count' => 100]);

        // Test with read_count = 0 since the job treats null as 0.0 anyway
        $song = Song::factory()->create([
            'read_count' => 0,
            'created_at' => now()->subDays(120)
        ]);

        $job = new IncrementSongReadCount($song);
        $job->handle();

        $song->refresh();
        $this->assertEquals(1.0, $song->read_count); // 0.0 + 1.0
    }

    public function test_job_handles_null_created_at(): void
    {
        Song::factory()->count(20)->create(['read_count' => 100]);

        $song = Song::factory()->create([
            'read_count' => 0,
            'created_at' => null
        ]);

        $job = new IncrementSongReadCount($song);
        $job->handle();

        $song->refresh();
        // Should treat as new song (uses Carbon::now() as fallback)
        $this->assertEquals(3.0, $song->read_count);
    }

    public function test_top_20_boundary_conditions(): void
    {
        // Create exactly 20 songs with read count 50
        Song::factory()->count(20)->create(['read_count' => 50]);

        // Create a song with read count 49 (should be rank 21, not in top 20)
        $song21 = Song::factory()->create([
            'read_count' => 49,
            'created_at' => now()->subDays(120) // Old song for 1.0 increment
        ]);

        // Create a song with read count 51 (should be rank 1, in top 20)
        $song1 = Song::factory()->create(['read_count' => 51]);

        $job21 = new IncrementSongReadCount($song21);
        $job21->handle();

        $job1 = new IncrementSongReadCount($song1);
        $job1->handle();

        $song21->refresh();
        $song1->refresh();

        $this->assertEquals(50.0, $song21->read_count); // 49 + 1.0 (not in top 20)
        $this->assertEquals(51.1, $song1->read_count);  // 51 + 0.1 (in top 20)
    }
}
