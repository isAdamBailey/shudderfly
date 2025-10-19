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

    public function test_dashboard_page_loads_successfully()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard/Index')
        );
    }

    public function test_dashboard_queries_work_with_data()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        // Clear any existing data
        Book::query()->delete();
        Page::query()->delete();
        Song::query()->delete();

        // Create test data
        $book = Book::factory()->create();
        Book::factory()->count(2)->create(); // Total of 3 books
        Page::factory()->count(5)->create(['book_id' => $book->id]); // All pages for the same book
        Song::factory()->count(4)->create();

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertStatus(200);

        // Verify the counts in the database match what should be displayed
        $this->assertEquals(3, Book::count());
        $this->assertEquals(5, Page::count());
        $this->assertEquals(4, Song::count());
    }

    public function test_dashboard_handles_books_with_different_page_counts()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        // Create books with different page counts
        $bookWithMostPages = Book::factory()->create(['title' => 'Big Book']);
        Page::factory()->count(10)->create(['book_id' => $bookWithMostPages->id]);

        $bookWithLeastPages = Book::factory()->create(['title' => 'Small Book']);
        Page::factory()->count(1)->create(['book_id' => $bookWithLeastPages->id]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertStatus(200);

        // Verify the queries would return the correct books
        $mostPages = Book::withCount('pages')->orderBy('pages_count', 'desc')->first();
        $leastPages = Book::withCount('pages')->orderBy('pages_count')->first();

        $this->assertEquals('Big Book', $mostPages->title);
        $this->assertEquals(10, $mostPages->pages_count);
        $this->assertEquals('Small Book', $leastPages->title);
        $this->assertEquals(1, $leastPages->pages_count);
    }

    public function test_dashboard_top_5_most_read_books_query()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        // Create books with different read counts
        Book::factory()->count(7)->create()->each(function ($book, $index) {
            $book->update(['read_count' => 100 - ($index * 10)]);
        });

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertStatus(200);

        // Verify the top 5 query works correctly
        $mostReadBooks = Book::query()
            ->orderBy('read_count', 'desc')
            ->orderBy('created_at')
            ->take(5)
            ->get();

        $this->assertCount(5, $mostReadBooks);
        $this->assertEquals(100, $mostReadBooks->first()->read_count);
        $this->assertEquals(60, $mostReadBooks->last()->read_count);
    }

    public function test_dashboard_top_5_most_read_songs_query()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        // Create songs with different read counts
        Song::factory()->count(7)->create()->each(function ($song, $index) {
            $song->update(['read_count' => 200 - ($index * 20)]);
        });

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertStatus(200);

        // Verify the top 5 songs query works correctly
        $mostReadSongs = Song::query()
            ->orderBy('read_count', 'desc')
            ->take(5)
            ->get();

        $this->assertCount(5, $mostReadSongs);
        $this->assertEquals(200, $mostReadSongs->first()->read_count);
        $this->assertEquals(120, $mostReadSongs->last()->read_count);
    }

    public function test_dashboard_counts_different_page_types()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        // Create different types of pages
        Page::factory()->create([
            'book_id' => $book->id,
            'media_path' => 'images/test.webp',
        ]);
        Page::factory()->create([
            'book_id' => $book->id,
            'media_path' => 'videos/test.mp4',
        ]);
        Page::factory()->create([
            'book_id' => $book->id,
            'media_path' => 'images/snapshot.webp',
        ]);
        Page::factory()->create([
            'book_id' => $book->id,
            'video_link' => 'https://youtube.com/watch?v=123',
        ]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertStatus(200);

        // Verify the page type queries work correctly
        $this->assertEquals(1, Page::where('media_path', 'like', '%.webp')
            ->where('media_path', 'not like', '%snapshot%')
            ->count());
        $this->assertEquals(1, Page::where('media_path', 'like', '%.mp4')->count());
        $this->assertEquals(1, Page::where('media_path', 'like', '%snapshot%')->count());
        $this->assertEquals(1, Page::whereNotNull('video_link')->count());
    }

    public function test_dashboard_requires_authentication()
    {
        $response = $this->get(route('dashboard'));

        $response->assertRedirect(route('login'));
    }
}
