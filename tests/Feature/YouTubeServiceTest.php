<?php

namespace Tests\Feature;

use App\Models\SiteSetting;
use App\Models\Song;
use App\Services\YouTubeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class YouTubeServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.youtube.api_key' => 'test-api-key']);
        SiteSetting::updateOrCreate(['key' => 'youtube_playlist_id'], ['value' => 'PL_test_playlist']);
    }

    private function playlistItemsResponse(array $videoIds): array
    {
        return [
            'items' => array_map(fn ($id) => [
                'id' => 'playlist-item-'.$id,
                'snippet' => [
                    'resourceId' => ['videoId' => $id],
                    'title' => 'Video '.$id,
                    'description' => 'Description for '.$id,
                    'publishedAt' => '2024-01-01T00:00:00Z',
                    'thumbnails' => [
                        'default' => ['url' => "https://img.example/{$id}/default.jpg"],
                        'high' => ['url' => "https://img.example/{$id}/high.jpg"],
                    ],
                ],
            ], $videoIds),
        ];
    }

    private function videoDetailsResponse(array $videoIds): array
    {
        return [
            'items' => array_map(fn ($id) => [
                'id' => $id,
                'contentDetails' => ['duration' => 'PT3M0S'],
                'snippet' => [
                    'publishedAt' => '2024-01-01T00:00:00Z',
                    'tags' => ['tag-a', 'tag-b'],
                ],
            ], $videoIds),
        ];
    }

    /**
     * Single-video "videos" API response, as consumed by addManualSong().
     */
    private function videoResponse(string $id, array $overrides = []): array
    {
        return [
            'items' => [array_replace_recursive([
                'id' => $id,
                'snippet' => [
                    'title' => 'Manually Added Song',
                    'description' => 'desc',
                    'publishedAt' => '2024-05-01T00:00:00Z',
                ],
                'contentDetails' => ['duration' => 'PT2M30S'],
                'status' => ['embeddable' => true],
            ], $overrides)],
        ];
    }

    public function test_sync_deletes_song_missing_from_playlist(): void
    {
        $staleSong = Song::factory()->create(['youtube_video_id' => 'staleVideoId']);
        // Already fully synced (duration + tags set) so the sync skips re-fetching it and
        // the playlistItems/videos fakes below only need to cover the surviving video.
        $survivingSong = Song::factory()->create(['youtube_video_id' => 'survivingVideoId']);

        Http::fake([
            'https://www.googleapis.com/youtube/v3/playlistItems*' => Http::response($this->playlistItemsResponse(['survivingVideoId'])),
        ]);

        (new YouTubeService)->syncPlaylist();

        $this->assertDatabaseMissing('songs', ['id' => $staleSong->id]);
        $this->assertDatabaseHas('songs', ['id' => $survivingSong->id]);
    }

    public function test_sync_does_not_delete_manual_song_missing_from_playlist(): void
    {
        $manualSong = Song::factory()->create([
            'youtube_video_id' => 'manualVideoId',
            'is_manual' => true,
        ]);
        $survivingSong = Song::factory()->create(['youtube_video_id' => 'survivingVideoId']);

        Http::fake([
            'https://www.googleapis.com/youtube/v3/playlistItems*' => Http::response($this->playlistItemsResponse(['survivingVideoId'])),
        ]);

        $result = (new YouTubeService)->syncPlaylist();

        $this->assertTrue($result['success']);
        $this->assertDatabaseHas('songs', ['id' => $manualSong->id]);
        $this->assertDatabaseHas('songs', ['id' => $survivingSong->id]);
    }

    public function test_sync_does_not_overwrite_manual_song_that_appears_in_playlist(): void
    {
        $manualSong = Song::factory()->create([
            'youtube_video_id' => 'manualVideoId',
            'is_manual' => true,
            'title' => 'My Custom Title',
        ]);

        Http::fake([
            'https://www.googleapis.com/youtube/v3/playlistItems*' => Http::response($this->playlistItemsResponse(['manualVideoId'])),
            'https://www.googleapis.com/youtube/v3/videos*' => Http::response($this->videoDetailsResponse(['manualVideoId'])),
        ]);

        (new YouTubeService)->syncPlaylist();

        $manualSong->refresh();
        $this->assertSame('My Custom Title', $manualSong->title);
        $this->assertTrue($manualSong->is_manual);
    }

    public function test_add_manual_song_creates_song_from_video_id(): void
    {
        Http::fake([
            'https://www.googleapis.com/youtube/v3/videos*' => Http::response($this->videoResponse('abcdefghijk', [
                'snippet' => [
                    'description' => 'A disallowed-from-playlist video',
                    'thumbnails' => [
                        'default' => ['url' => 'https://img.example/abcdefghijk/default.jpg'],
                        'high' => ['url' => 'https://img.example/abcdefghijk/high.jpg'],
                    ],
                    'tags' => ['tag-a'],
                ],
            ])),
        ]);

        $result = (new YouTubeService)->addManualSong('abcdefghijk');

        $this->assertTrue($result['success']);
        $this->assertArrayNotHasKey('warning', $result);
        $this->assertDatabaseHas('songs', [
            'youtube_video_id' => 'abcdefghijk',
            'title' => 'Manually Added Song',
            'is_manual' => true,
            'duration' => 'PT2M30S',
        ]);
    }

    public function test_add_manual_song_parses_share_text(): void
    {
        Http::fake([
            'https://www.googleapis.com/youtube/v3/videos*' => Http::response(
                $this->videoResponse('86IrHVH43mQ', ['snippet' => ['title' => 'Learn Animal Sounds']])
            ),
        ]);

        $shareText = 'Learn Animal Sounds | Moo Cow Song | Learn Animals: https://music.youtube.com/watch?v=86IrHVH43mQ&feature=share.';

        $result = (new YouTubeService)->addManualSong($shareText);

        $this->assertTrue($result['success']);
        $this->assertDatabaseHas('songs', ['youtube_video_id' => '86IrHVH43mQ']);
    }

    public function test_add_manual_song_flags_non_embeddable_video(): void
    {
        Http::fake([
            'https://www.googleapis.com/youtube/v3/videos*' => Http::response($this->videoResponse('abcdefghijk', [
                'snippet' => ['title' => 'Blocked Embed Video'],
                'status' => ['embeddable' => false],
            ])),
        ]);

        $result = (new YouTubeService)->addManualSong('abcdefghijk');

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('warning', $result);
    }

    public function test_add_manual_song_rejects_invalid_input(): void
    {
        $result = (new YouTubeService)->addManualSong('not a youtube link at all');

        $this->assertFalse($result['success']);
        $this->assertDatabaseCount('songs', 0);
    }

    public function test_add_manual_song_rejects_duplicate_video(): void
    {
        Song::factory()->create(['youtube_video_id' => 'abcdefghijk']);

        $result = (new YouTubeService)->addManualSong('abcdefghijk');

        $this->assertFalse($result['success']);
    }

    public function test_parse_video_id_handles_various_inputs(): void
    {
        $shareText = 'Learn Animal Sounds | Moo Cow Song | Learn Animals: https://music.youtube.com/watch?v=86IrHVH43mQ&feature=share.';

        $this->assertSame('86IrHVH43mQ', YouTubeService::parseVideoId($shareText));
        $this->assertSame('abcdefghijk', YouTubeService::parseVideoId('abcdefghijk'));
        $this->assertSame('abcdefghijk', YouTubeService::parseVideoId('https://youtu.be/abcdefghijk'));
        $this->assertSame('abcdefghijk', YouTubeService::parseVideoId('https://www.youtube.com/shorts/abcdefghijk'));
        $this->assertNull(YouTubeService::parseVideoId('https://example.com/not-youtube'));
        $this->assertNull(YouTubeService::parseVideoId('too short'));
    }
}
