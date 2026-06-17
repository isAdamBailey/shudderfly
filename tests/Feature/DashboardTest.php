<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Page;
use App\Models\Song;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_loads_successfully()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        $response = $this->actingAs($user)->get(route('profile.edit'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Profile/Edit')
        );
    }

    public function test_non_admin_users_can_access_profile()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('profile.edit'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Profile/Edit')
        );
    }

    public function test_profile_queries_work_with_data()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        Book::query()->delete();
        Page::query()->delete();
        Song::query()->delete();

        $book = Book::factory()->create();
        Book::factory()->count(2)->create();
        Page::factory()->count(5)->create(['book_id' => $book->id]);
        Song::factory()->count(4)->create();

        $response = $this->actingAs($user)->get(route('profile.edit'));

        $response->assertStatus(200);

        $this->assertEquals(3, Book::count());
        $this->assertEquals(5, Page::count());
        $this->assertEquals(4, Song::count());
    }

    public function test_profile_handles_books_with_different_page_counts()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        $bookWithMostPages = Book::factory()->create(['title' => 'Big Book']);
        Page::factory()->count(10)->create(['book_id' => $bookWithMostPages->id]);

        $bookWithLeastPages = Book::factory()->create(['title' => 'Small Book']);
        Page::factory()->count(1)->create(['book_id' => $bookWithLeastPages->id]);

        $response = $this->actingAs($user)->get(route('profile.edit'));

        $response->assertStatus(200);

        $mostPages = Book::withCount('pages')->orderBy('pages_count', 'desc')->first();
        $leastPages = Book::withCount('pages')->orderBy('pages_count')->first();

        $this->assertEquals('Big Book', $mostPages->title);
        $this->assertEquals(10, $mostPages->pages_count);
        $this->assertEquals('Small Book', $leastPages->title);
        $this->assertEquals(1, $leastPages->pages_count);
    }

    public function test_profile_top_5_most_read_books_query()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        Book::factory()->count(7)->create()->each(function ($book, $index) {
            $book->update(['read_count' => 100 - ($index * 10)]);
        });

        $response = $this->actingAs($user)->get(route('profile.edit'));

        $response->assertStatus(200);

        $mostReadBooks = Book::query()
            ->orderBy('read_count', 'desc')
            ->orderBy('created_at')
            ->take(5)
            ->get();

        $this->assertCount(5, $mostReadBooks);
        $this->assertEquals(100, $mostReadBooks->first()->read_count);
        $this->assertEquals(60, $mostReadBooks->last()->read_count);
    }

    public function test_profile_top_5_most_read_songs_query()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        Song::factory()->count(7)->create()->each(function ($song, $index) {
            $song->update(['read_count' => 200 - ($index * 20)]);
        });

        $response = $this->actingAs($user)->get(route('profile.edit'));

        $response->assertStatus(200);

        $mostReadSongs = Song::query()
            ->orderBy('read_count', 'desc')
            ->take(5)
            ->get();

        $this->assertCount(5, $mostReadSongs);
        $this->assertEquals(200, $mostReadSongs->first()->read_count);
        $this->assertEquals(120, $mostReadSongs->last()->read_count);
    }

    public function test_profile_counts_different_page_types()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        Page::factory()->create(['book_id' => $book->id, 'media_path' => 'images/test.webp']);
        Page::factory()->create(['book_id' => $book->id, 'media_path' => 'videos/test.mp4']);
        Page::factory()->create(['book_id' => $book->id, 'media_path' => 'images/snapshot.webp']);
        Page::factory()->create(['book_id' => $book->id, 'video_link' => 'https://youtube.com/watch?v=123']);

        $response = $this->actingAs($user)->get(route('profile.edit'));

        $response->assertStatus(200);

        $this->assertEquals(1, Page::where('media_path', 'like', '%.webp')
            ->where('media_path', 'not like', '%snapshot%')
            ->count());
        $this->assertEquals(1, Page::where('media_path', 'like', '%.mp4')->count());
        $this->assertEquals(1, Page::where('media_path', 'like', '%snapshot%')->count());
        $this->assertEquals(1, Page::whereNotNull('video_link')->count());
    }

    public function test_profile_requires_authentication()
    {
        $response = $this->get(route('profile.edit'));

        $response->assertRedirect(route('login'));
    }

    public function test_user_with_edit_pages_permission_can_call_unblock_all_pages_route()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');
        $this->actingAs($user);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(2)->create(['blocked' => true]);

        $response = $this->post(route('pages.unblock-all'));

        $response->assertRedirect();
        $this->assertEquals(0, Page::where('blocked', true)->count());
    }
}
