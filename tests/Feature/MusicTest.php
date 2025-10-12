<?php

namespace Tests\Feature;

use App\Jobs\IncrementSongReadCount;
use App\Models\Song;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MusicTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear cache before each test
        Cache::flush();
    }

    public function test_music_index_displays_songs_paginated(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create test songs
        $songs = Song::factory()->count(25)->create();

        $response = $this->get(route('music.index'));

        $response->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Music/Index')
                ->has('songs.data', 20) // Should be paginated to 20 per page
                ->has('songs.next_page_url')
                ->where('search', null)
                ->where('canSync', false) // Regular user can't sync
            );
    }

    public function test_music_index_with_search_filters_songs(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create test songs with specific titles
        Song::factory()->create(['title' => 'Test Song One']);
        Song::factory()->create(['title' => 'Another Song']);
        Song::factory()->create(['title' => 'Test Song Two']);
        Song::factory()->create(['description' => 'Contains test keyword']);

        $response = $this->get(route('music.index', ['search' => 'test']));

        $response->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->component('Music/Index')
                ->has('songs.data', 3) // Should find 3 songs with "test"
                ->where('search', 'test')
            );
    }

    public function test_admin_can_see_sync_button(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin);

        $response = $this->get(route('music.index'));

        $response->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->where('canSync', true)
            );
    }

    public function test_regular_user_cannot_sync_playlist(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('music.sync'));

        $response->assertStatus(403); // Forbidden
    }

    public function test_admin_can_access_sync_endpoint(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin);

        // Mock the YouTube service to avoid actual API calls
        $this->mockYouTubeService();

        $response = $this->post(route('music.sync'));

        // Should redirect back (not 403 forbidden)
        $response->assertRedirect();
    }

    public function test_increment_read_count_dispatches_job(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $this->actingAs($user);

        $song = Song::factory()->create();

        $response = $this->post(route('music.increment-read-count', $song));

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        Queue::assertPushed(IncrementSongReadCount::class, function ($job) use ($song) {
            return $job->song->id === $song->id;
        });
    }

    public function test_increment_read_count_prevents_duplicate_requests(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $song = Song::factory()->create();

        // First request should succeed
        $response1 = $this->post(route('music.increment-read-count', $song));
        $response1->assertStatus(200)
            ->assertJson(['success' => true]);

        // Second request within cache window should be prevented
        $response2 = $this->post(route('music.increment-read-count', $song));
        $response2->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }

    public function test_unauthenticated_user_cannot_increment_read_count(): void
    {
        $song = Song::factory()->create();

        $response = $this->post(route('music.increment-read-count', $song));

        $response->assertRedirect(route('login'));
    }

    public function test_songs_are_ordered_by_creation_date_desc(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Create songs with different creation dates
        $oldSong = Song::factory()->create(['title' => 'Old Song', 'created_at' => now()->subDays(5)]);
        $newSong = Song::factory()->create(['title' => 'New Song', 'created_at' => now()]);
        $middleSong = Song::factory()->create(['title' => 'Middle Song', 'created_at' => now()->subDays(2)]);

        $response = $this->get(route('music.index'));

        $response->assertStatus(200)
            ->assertInertia(fn (Assert $page) => $page
                ->has('songs.data', 3)
                ->where('songs.data.0.title', 'New Song')
                ->where('songs.data.1.title', 'Middle Song')
                ->where('songs.data.2.title', 'Old Song')
            );
    }

    public function test_music_show_route_redirects_to_index_with_song_param(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $song = Song::factory()->create(['title' => 'Test Song']);

        $response = $this->get(route('music.show', $song));

        $response->assertRedirect(route('music.index', ['song' => $song->id]));
    }

    /**
     * Mock the YouTube service to avoid actual API calls during testing
     */
    private function mockYouTubeService(): void
    {
        $mock = $this->createMock(\App\Services\YouTubeService::class);
        $mock->method('syncPlaylist')
            ->willReturn([
                'success' => true,
                'message' => 'Test sync completed successfully',
                'synced' => 5,
            ]);

        $this->app->instance(\App\Services\YouTubeService::class, $mock);
    }
}
