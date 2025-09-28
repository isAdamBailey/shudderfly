<?php

namespace Tests\Unit;

use App\Jobs\IncrementSongReadCount;
use App\Models\Song;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SongTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_song_has_youtube_url_attribute(): void
    {
        $song = Song::factory()->make(['youtube_video_id' => 'dQw4w9WgXcQ']);

        $this->assertEquals('https://www.youtube.com/watch?v=dQw4w9WgXcQ', $song->youtube_url);
    }

    public function test_song_thumbnail_attribute_returns_best_available(): void
    {
        // Test with maxres thumbnail
        $song = Song::factory()->make([
            'thumbnail_default' => 'default.jpg',
            'thumbnail_medium' => 'medium.jpg',
            'thumbnail_high' => 'high.jpg',
            'thumbnail_standard' => 'standard.jpg',
            'thumbnail_maxres' => 'maxres.jpg',
        ]);

        $this->assertEquals('maxres.jpg', $song->thumbnail);

        // Test fallback when maxres is null
        $song = Song::factory()->make([
            'thumbnail_default' => 'default.jpg',
            'thumbnail_medium' => 'medium.jpg',
            'thumbnail_high' => 'high.jpg',
            'thumbnail_standard' => 'standard.jpg',
            'thumbnail_maxres' => null,
        ]);

        $this->assertEquals('standard.jpg', $song->thumbnail);

        // Test fallback to default when others are null
        $song = Song::factory()->make([
            'thumbnail_default' => 'default.jpg',
            'thumbnail_medium' => null,
            'thumbnail_high' => null,
            'thumbnail_standard' => null,
            'thumbnail_maxres' => null,
        ]);

        $this->assertEquals('default.jpg', $song->thumbnail);
    }

    public function test_song_search_scope_finds_by_title(): void
    {
        Song::factory()->create(['title' => 'Amazing Song']);
        Song::factory()->create(['title' => 'Another Track']);
        Song::factory()->create(['title' => 'Amazing Beat']);

        $results = Song::search('Amazing')->get();

        $this->assertCount(2, $results);
        $this->assertTrue($results->pluck('title')->contains('Amazing Song'));
        $this->assertTrue($results->pluck('title')->contains('Amazing Beat'));
    }

    public function test_song_search_scope_finds_by_description(): void
    {
        Song::factory()->create(['description' => 'This is an amazing track']);
        Song::factory()->create(['description' => 'Just another song']);
        Song::factory()->create(['description' => 'Amazing beat with great vocals']);

        $results = Song::search('amazing')->get();

        $this->assertCount(2, $results);
    }

    public function test_song_search_is_case_insensitive(): void
    {
        Song::factory()->create(['title' => 'Amazing Song']);
        Song::factory()->create(['title' => 'AMAZING TRACK']);

        $results = Song::search('AMAZING')->get();
        $this->assertCount(2, $results);

        $results = Song::search('amazing')->get();
        $this->assertCount(2, $results);
    }

    public function test_tags_are_cast_to_array(): void
    {
        $song = Song::factory()->create(['tags' => ['rock', 'metal', 'guitar']]);

        $this->assertIsArray($song->tags);
        $this->assertEquals(['rock', 'metal', 'guitar'], $song->tags);
    }

    public function test_published_at_is_cast_to_datetime(): void
    {
        $publishedAt = '2023-01-15 10:30:00';
        $song = Song::factory()->create(['published_at' => $publishedAt]);

        $this->assertInstanceOf(Carbon::class, $song->published_at);
        $this->assertEquals('2023-01-15 10:30:00', $song->published_at->format('Y-m-d H:i:s'));
    }
}
