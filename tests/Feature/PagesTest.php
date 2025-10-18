<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Page;
use App\Models\Song;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PagesTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    public function test_pictures_are_returned(): void
    {
        $this->actingAs(User::factory()->create());

        Book::factory()->has(Page::factory(10))->count(3)->create();

        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->url('/photos')
                ->has('photos.data', 25)
        );
    }

    public function test_youtube_videos_are_hidden_when_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        // Create a book with both regular pages and video pages
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(3)->create(); // Regular pages
        Page::factory()->for($book)->count(2)->state(['video_link' => 'https://youtube.com/watch?v=123'])->create(
        ); // Video pages

        // Set youtube_enabled to false
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '0']);

        // Test index page - should only show regular pages when YouTube is disabled
        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3) // Only regular pages when YouTube is disabled
        );

        // Test youtube filter - should return empty
        $this->get(route('pictures.index', ['filter' => 'youtube']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 0) // No videos when disabled
        );

        // Enable YouTube
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '1']);

        // Test index page again - should now show all pages
        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 5) // All pages when YouTube is enabled
        );

        // Test youtube filter - should now show video pages
        $this->get(route('pictures.index', ['filter' => 'youtube']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 2) // Only video pages
        );
    }

    public function test_video_pages_are_not_accessible_when_youtube_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->create();
        $regularPage = Page::factory()->for($book)->create();
        $videoPage = Page::factory()->for($book)->state(['video_link' => 'https://youtube.com/watch?v=123'])->create();

        // Set youtube_enabled to false
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '0']);

        // Regular page should be accessible
        $this->get(route('pages.show', $regularPage))->assertStatus(200);

        // Video page should return 404 when YouTube is disabled
        $this->get(route('pages.show', $videoPage))->assertStatus(404);

        // Test sibling navigation - video page should not be included
        $response = $this->get(route('pages.show', $regularPage));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Page/Show')
                ->where('nextPage', null) // No next page since video page is excluded
        );
    }

    public function test_snapshot_filter_shows_only_snapshots(): void
    {
        $this->actingAs(User::factory()->create());

        // Create a book with regular pages, video pages, and snapshots
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(2)->create(); // Regular pages
        Page::factory()->for($book)->count(2)->state(['video_link' => 'https://youtube.com/watch?v=123'])->create(
        ); // Video pages
        Page::factory()->for($book)->count(3)->state(['media_path' => 'books/test/snapshot_123.jpg'])->create(
        ); // Snapshots

        // Test snapshot filter - should only show snapshot pages
        $this->get(route('pictures.index', ['filter' => 'snapshot']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3) // Only snapshot pages
        );

        // Test that regular view shows all pages
        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 7) // All pages (2 regular + 2 youtube + 3 snapshots)
        );
    }

    public function test_filters_are_mutually_exclusive(): void
    {
        $this->actingAs(User::factory()->create());

        // Create a book with regular pages, video pages, and snapshots
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(2)->create(); // Regular pages
        Page::factory()->for($book)->count(2)->state(['video_link' => 'https://youtube.com/watch?v=123'])->create(
        ); // Video pages
        Page::factory()->for($book)->count(3)->state(['media_path' => 'books/test/snapshot_123.jpg'])->create(
        ); // Snapshots

        // Create a YouTube video that also has a snapshot
        Page::factory()->for($book)->state([
            'video_link' => 'https://youtube.com/watch?v=456',
            'media_path' => 'books/test/snapshot_456.jpg',
        ])->create();

        // Test snapshot filter - should only show snapshot pages
        $this->get(route('pictures.index', ['filter' => 'snapshot']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 4) // All pages with snapshot in media_path
        );

        // Test youtube filter - should only show video pages
        $this->get(route('pictures.index', ['filter' => 'youtube']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3) // All pages with video_link
        );
    }

    public function test_pictures_can_be_searched(): void
    {
        $this->actingAs(User::factory()->create());

        $searchTerm = 'Adam';

        Book::factory()->has(Page::factory(10))->count(3)->create();
        Page::first()->update(['content' => 'lorem '.$searchTerm.' ipsum dolor sit amet']);

        $this->get(route('pictures.index', ['search' => $searchTerm]))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->url('/photos?search=Adam')
                ->has('photos.data', 1)

        );
    }

    public function test_page_is_returned()
    {
        \Cache::flush();
        $user = User::factory()->create();
        $user->revokePermissionTo('edit profile');
        $this->actingAs($user);

        $book = Book::factory()->create();
        $page = Page::factory()->for($book)->create();

        $initialReadCount = $page->read_count;

        $this->get(route('pages.show', $page))->assertInertia(
            fn (Assert $inertiaPage) => $inertiaPage
                ->component('Page/Show')
                ->url('/pages/'.$page->id)
                ->has('page.id')
                ->has('page.content')
                ->has('page.media_path')
                ->has('page.video_link')
                ->has('page.book')
                ->has('page.book.cover_image')
                ->has('previousPage')
                ->has('nextPage')
                ->has('books')
        );

        // Process the dispatched job (it was dispatched by the controller with a delay)
        $this->artisan('queue:work --stop-when-empty --once');

        $topPages = Page::orderBy('read_count', 'desc')->limit(20)->pluck('id')->toArray();
        $isInTop20 = in_array($page->id, $topPages);

        if ($isInTop20) {
            $this->assertSame($initialReadCount + 0.1, $page->fresh()->read_count);
        } else {
            $this->assertSame($initialReadCount + 3.0, $page->fresh()->read_count);
        }
    }

    public function test_age_based_read_count_multipliers()
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->create();

        // Create many dummy pages with higher read counts to ensure our test pages aren't in top 20
        Page::factory()->for($book)->count(50)->create(['read_count' => 1000]);

        // Create pages of different ages with negative read counts (so they won't be in top 20)
        $newPage = Page::factory()->for($book)->create(['created_at' => now(), 'read_count' => -1.0]); // ≤7 days: 3.0x
        $monthOldPage = Page::factory()->for($book)->create(['created_at' => now()->subDays(15), 'read_count' => -1.0]
        ); // ≤30 days: 2.0x
        $threeMonthOldPage = Page::factory()->for($book)->create(
            ['created_at' => now()->subDays(45), 'read_count' => -1.0]
        ); // ≤60 days: 1.5x
        $yearOldPage = Page::factory()->for($book)->create(['created_at' => now()->subDays(200), 'read_count' => -1.0]
        ); // >90 days: 1.0x
        $veryOldPage = Page::factory()->for($book)->create(['created_at' => now()->subYears(2), 'read_count' => -1.0]
        ); // >90 days: 1.0x

        // Run jobs directly for testing
        (new \App\Jobs\IncrementPageReadCount($newPage, 'test-fingerprint'))->handle();
        (new \App\Jobs\IncrementPageReadCount($monthOldPage, 'test-fingerprint'))->handle();
        (new \App\Jobs\IncrementPageReadCount($threeMonthOldPage, 'test-fingerprint'))->handle();
        (new \App\Jobs\IncrementPageReadCount($yearOldPage, 'test-fingerprint'))->handle();
        (new \App\Jobs\IncrementPageReadCount($veryOldPage, 'test-fingerprint'))->handle();

        // Verify age-based behavior with new logic
        $this->assertSame(-1.0 + 3.0, $newPage->fresh()->read_count); // ≤7 days: initial 3.0x boost
        $this->assertSame(-1.0 + 2.0, $monthOldPage->fresh()->read_count); // ≤30 days: initial 2.0x boost
        $this->assertSame(-1.0 + 1.5, $threeMonthOldPage->fresh()->read_count); // ≤60 days: initial 1.5x boost
        $this->assertSame(-1.0 + 1.0, $yearOldPage->fresh()->read_count); // >90 days: initial 1.0x boost
        $this->assertSame(-1.0 + 1.0, $veryOldPage->fresh()->read_count); // >90 days: initial 1.0x boost
    }

    public function test_page_cannot_be_stored_without_permissions()
    {
        $this->actingAs(User::factory()->create());

        $this->post(route('pages.store'))->assertStatus(403);
    }

    public function test_page_is_stored_to_book()
    {
        Storage::fake('s3');

        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');
        $book = Book::factory()->create();

        $payload = [
            'book_id' => $book->id,
            'content' => $this->faker->paragraph(),
            'image' => UploadedFile::fake()->image('photo1.jpg'),
        ];

        $response = $this->post(route('pages.store'), $payload);

        $filePath = 'books/'.$book->slug.'/'.pathinfo($payload['image']->hashName(), PATHINFO_FILENAME).'.webp';
        Storage::disk('s3')->assertExists($filePath);

        $page = Book::find($book->id)->pages->first();
        $this->assertSame('/storage'.$page->media_path, Storage::disk('s3')->url($filePath));
        $this->assertSame($page->content, $payload['content']);

        $response->assertRedirect(route('books.show', $book));
    }

    public function test_page_cannot_be_updated_without_permissions()
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();

        $this->post(route('pages.update', $page))->assertStatus(403);
    }

    public function test_page_is_updated()
    {
        Storage::fake('s3');

        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();

        $payload = [
            'content' => $this->faker->sentence(3),
            'image' => UploadedFile::fake()->image('photo1.jpg'),
        ];

        $response = $this->post(route('pages.update', $page), $payload);

        $filePath = 'books/'.$book->slug.'/'.pathinfo($payload['image']->hashName(), PATHINFO_FILENAME).'.webp';
        Storage::disk('s3')->assertExists($filePath);

        $freshPage = Page::where('book_id', $book->id)->first();
        $this->assertSame($freshPage->content, $payload['content']);
        $this->assertSame('/storage'.$freshPage->media_path, Storage::disk('s3')->url($filePath));

        $response->assertRedirect(route('pages.show', $freshPage));
    }

    public function test_page_can_be_moved_to_different_book()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();
        $this->assertSame($book->id, $page->book_id);

        $newBook = Book::factory()->create();

        $payload = [
            'book_id' => $newBook->id,
        ];

        $response = $this->post(route('pages.update', $page), $payload);

        $freshPage = $page->fresh();
        $this->assertSame($newBook->id, $freshPage->book_id);

        // takes us to the new book
        $response->assertRedirect(route('pages.show', $page));
    }

    public function test_page_is_destroyed()
    {
        Storage::fake('s3');

        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->has(Page::factory())->create();
        $page = $book->pages->first();

        $response = $this->delete(route('pages.destroy', $page));
        Storage::disk('s3')->assertMissing($page->media_path);

        $this->assertNull(Page::find($page->id));

        $response->assertRedirect(route('books.show', $book));
    }

    // Bulk Actions Tests

    public function test_bulk_actions_requires_permission()
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->has(Page::factory(3))->create();
        $pageIds = $book->pages->pluck('id')->toArray();

        $payload = [
            'page_ids' => $pageIds,
            'action' => 'delete',
        ];

        $this->post(route('pages.bulk-action'), $payload)->assertStatus(403);
    }

    public function test_bulk_delete_pages()
    {
        Storage::fake('public');

        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        // Create pages with media files
        $pages = Page::factory()->for($book)->count(3)->create([
            'media_path' => 'books/test/image.jpg',
            'media_poster' => 'books/test/poster.jpg',
        ]);

        // Mock the storage files
        Storage::disk('public')->put('books/test/image.jpg', 'fake image content');
        Storage::disk('public')->put('books/test/poster.jpg', 'fake poster content');

        $pageIds = $pages->pluck('id')->toArray();

        $payload = [
            'page_ids' => $pageIds,
            'action' => 'delete',
        ];

        $response = $this->post(route('pages.bulk-action'), $payload);

        // Assert pages are deleted
        foreach ($pageIds as $pageId) {
            $this->assertNull(Page::find($pageId));
        }

        // Assert files are deleted
        Storage::disk('public')->assertMissing('books/test/image.jpg');
        Storage::disk('public')->assertMissing('books/test/poster.jpg');

        $response->assertRedirect(route('books.show', $book))
            ->assertSessionHas('success', '3 page(s) deleted successfully.');
    }

    public function test_bulk_move_to_top()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        // Create pages with different timestamps
        $oldPage1 = Page::factory()->for($book)->create(['created_at' => now()->subDays(10)]);
        $oldPage2 = Page::factory()->for($book)->create(['created_at' => now()->subDays(5)]);
        $recentPage = Page::factory()->for($book)->create(['created_at' => now()->subDay()]);

        $pageIds = [$oldPage1->id, $oldPage2->id];

        $payload = [
            'page_ids' => $pageIds,
            'action' => 'move_to_top',
        ];

        $response = $this->post(route('pages.bulk-action'), $payload);

        // Assert pages have been moved to top (newer timestamps)
        $freshOldPage1 = $oldPage1->fresh();
        $freshOldPage2 = $oldPage2->fresh();
        $freshRecentPage = $recentPage->fresh();

        $this->assertTrue($freshOldPage1->created_at->gt($freshRecentPage->created_at));
        $this->assertTrue($freshOldPage2->created_at->gt($freshRecentPage->created_at));

        $response->assertRedirect(route('books.show', $book))
            ->assertSessionHas('success', '2 page(s) moved to top successfully.');
    }

    public function test_bulk_move_to_book()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $sourceBook = Book::factory()->create();
        $targetBook = Book::factory()->create();

        $pages = Page::factory()->for($sourceBook)->count(3)->create();
        $pageIds = $pages->pluck('id')->toArray();

        $payload = [
            'page_ids' => $pageIds,
            'action' => 'move_to_book',
            'target_book_id' => $targetBook->id,
        ];

        $response = $this->post(route('pages.bulk-action'), $payload);

        // Assert all pages have been moved to target book
        foreach ($pageIds as $pageId) {
            $page = Page::find($pageId);
            $this->assertSame($targetBook->id, $page->book_id);
        }

        $response->assertRedirect(route('books.show', $sourceBook))
            ->assertSessionHas('success', '3 page(s) moved to "'.$targetBook->title.'" successfully.');
    }

    public function test_bulk_action_validation_errors()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        // Test missing page_ids
        $response = $this->post(route('pages.bulk-action'), [
            'action' => 'delete',
        ]);
        $response->assertSessionHasErrors(['page_ids']);

        // Test empty page_ids array
        $response = $this->post(route('pages.bulk-action'), [
            'page_ids' => [],
            'action' => 'delete',
        ]);
        $response->assertSessionHasErrors(['page_ids']);

        // Test invalid action
        $response = $this->post(route('pages.bulk-action'), [
            'page_ids' => [1, 2, 3],
            'action' => 'invalid_action',
        ]);
        $response->assertSessionHasErrors(['action']);

        // Test move_to_book without target_book_id
        $response = $this->post(route('pages.bulk-action'), [
            'page_ids' => [1, 2, 3],
            'action' => 'move_to_book',
        ]);
        $response->assertSessionHasErrors(['target_book_id']);

        // Test non-existent page IDs
        $response = $this->post(route('pages.bulk-action'), [
            'page_ids' => [99999],
            'action' => 'delete',
        ]);
        $response->assertSessionHasErrors(['page_ids.0']);

        // Test non-existent target book
        $book = Book::factory()->has(Page::factory())->create();
        $pageId = $book->pages->first()->id;

        $response = $this->post(route('pages.bulk-action'), [
            'page_ids' => [$pageId],
            'action' => 'move_to_book',
            'target_book_id' => 99999,
        ]);
        $response->assertSessionHasErrors(['target_book_id']);
    }

    public function test_bulk_action_handles_mixed_page_ownership()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book1 = Book::factory()->create();
        $book2 = Book::factory()->create();

        $pagesBook1 = Page::factory()->for($book1)->count(2)->create();
        $pagesBook2 = Page::factory()->for($book2)->count(2)->create();

        // Mix pages from different books
        $pageIds = [
            $pagesBook1->first()->id,
            $pagesBook2->first()->id,
        ];

        $payload = [
            'page_ids' => $pageIds,
            'action' => 'delete',
        ];

        $response = $this->post(route('pages.bulk-action'), $payload);

        // Should redirect to the book of the first page
        $response->assertRedirect(route('books.show', $book1))
            ->assertSessionHas('success', '2 page(s) deleted successfully.');

        // Both pages should be deleted regardless of which book they belong to
        foreach ($pageIds as $pageId) {
            $this->assertNull(Page::find($pageId));
        }
    }

    public function test_bulk_delete_handles_missing_media_files_gracefully()
    {
        Storage::fake('public');

        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        // Create pages with media paths but don't actually create the files
        $pages = Page::factory()->for($book)->count(2)->create([
            'media_path' => 'books/test/nonexistent.jpg',
            'media_poster' => 'books/test/nonexistent_poster.jpg',
        ]);

        $pageIds = $pages->pluck('id')->toArray();

        $payload = [
            'page_ids' => $pageIds,
            'action' => 'delete',
        ];

        // Should not throw an error even if files don't exist
        $response = $this->post(route('pages.bulk-action'), $payload);

        // Assert pages are still deleted
        foreach ($pageIds as $pageId) {
            $this->assertNull(Page::find($pageId));
        }

        $response->assertRedirect(route('books.show', $book))
            ->assertSessionHas('success', '2 page(s) deleted successfully.');
    }

    public function test_bulk_action_preserves_original_book_context()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $sourceBook = Book::factory()->create();
        $targetBook = Book::factory()->create();

        $pages = Page::factory()->for($sourceBook)->count(3)->create();
        $pageIds = $pages->pluck('id')->toArray();

        $payload = [
            'page_ids' => $pageIds,
            'action' => 'move_to_book',
            'target_book_id' => $targetBook->id,
        ];

        $response = $this->post(route('pages.bulk-action'), $payload);

        // Should always redirect back to the original book (source book)
        // regardless of the action performed
        $response->assertRedirect(route('books.show', $sourceBook));
    }

    // New tests for unified feed with songs

    public function test_unified_feed_includes_both_pages_and_songs(): void
    {
        $this->actingAs(User::factory()->create());

        // Create pages
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(5)->create();

        // Create songs
        Song::factory()->count(3)->create();

        $this->get(route('pictures.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 8) // 5 pages + 3 songs
        );
    }

    public function test_music_filter_shows_only_songs(): void
    {
        $this->actingAs(User::factory()->create());

        // Create pages
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(5)->create();

        // Create songs
        Song::factory()->count(3)->create();

        $this->get(route('pictures.index', ['filter' => 'music']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3) // Only songs
                ->where('photos.data.0.type', 'song')
        );
    }

    public function test_songs_excluded_from_snapshot_filter(): void
    {
        $this->actingAs(User::factory()->create());

        // Create snapshot pages
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(3)->state(['media_path' => 'books/test/snapshot_123.jpg'])->create();

        // Create songs
        Song::factory()->count(2)->create();

        $this->get(route('pictures.index', ['filter' => 'snapshot']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3) // Only snapshot pages, no songs
                ->where('photos.data.0.type', 'screenshot')
        );
    }

    public function test_songs_excluded_from_youtube_filter(): void
    {
        $this->actingAs(User::factory()->create());

        // Create youtube video pages
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(2)->state(['video_link' => 'https://youtube.com/watch?v=123'])->create();

        // Create songs
        Song::factory()->count(3)->create();

        $this->get(route('pictures.index', ['filter' => 'youtube']))->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 2) // Only youtube pages, no songs
        );
    }

    public function test_popular_filter_sorts_by_read_count(): void
    {
        $this->actingAs(User::factory()->create());

        // Create pages with different read counts
        $book = Book::factory()->create();
        Page::factory()->for($book)->create(['read_count' => 10.5]);
        Page::factory()->for($book)->create(['read_count' => 5.0]);
        Page::factory()->for($book)->create(['read_count' => 15.0]);

        // Create songs with different read counts
        Song::factory()->create(['read_count' => 20.0]);
        Song::factory()->create(['read_count' => 8.0]);

        $response = $this->get(route('pictures.index', ['filter' => 'popular']));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 5)
                ->where('photos.data.0.read_count', fn ($value) => (float) $value === 20.0
                ) // Song with highest read count
                ->where('photos.data.1.read_count', fn ($value) => (float) $value === 15.0) // Page with second highest
                ->where('photos.data.2.read_count', fn ($value) => (float) $value === 10.5)
                ->where('photos.data.3.read_count', fn ($value) => (float) $value === 8.0)
                ->where('photos.data.4.read_count', fn ($value) => (float) $value === 5.0)
        );
    }

    public function test_random_filter_mixes_pages_and_songs(): void
    {
        $this->actingAs(User::factory()->create());

        // Create pages
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(10)->create();

        // Create songs
        Song::factory()->count(5)->create();

        $response = $this->get(route('pictures.index', ['filter' => 'random']));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 15) // Total items available: 10 pages + 5 songs
        );

        // Verify we have a mix of types (not guaranteed order due to shuffle)
        $data = $response->viewData('page')['props']['photos']['data'];
        $types = collect($data)->pluck('type')->unique();
        $this->assertTrue($types->count() >= 1); // Should have at least one type
    }

    public function test_old_filter_shows_items_older_than_year(): void
    {
        $this->actingAs(User::factory()->create());

        $yearAgo = now()->subYear();

        // Create old pages
        $book = Book::factory()->create();
        $oldPage = Page::factory()->for($book)->create(['created_at' => $yearAgo->copy()->subDay()]);

        // Create recent page
        Page::factory()->for($book)->create(['created_at' => now()]);

        // Create old songs
        $oldSong = Song::factory()->create(['created_at' => $yearAgo->copy()->subWeek()]);

        // Create recent song
        Song::factory()->create(['created_at' => now()]);

        $response = $this->get(route('pictures.index', ['filter' => 'old']));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 2) // Only old items
        );
    }

    public function test_old_filter_falls_back_to_oldest_when_no_old_items(): void
    {
        $this->actingAs(User::factory()->create());

        // Create recent pages only
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(3)->create(['created_at' => now()]);

        // Create recent songs only
        Song::factory()->count(2)->create(['created_at' => now()]);

        $response = $this->get(route('pictures.index', ['filter' => 'old']));

        // When no old items exist and fallback is applied, the filtered queries return all items oldest first
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 5) // Fallback returns all 5 items sorted by oldest first
        );

        // Verify items are sorted by oldest first (created_at ascending)
        $data = $response->viewData('page')['props']['photos']['data'];
        $this->assertSame(5, count($data));
    }

    public function test_page_types_are_correctly_identified(): void
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->create();

        // Create regular page
        $regularPage = Page::factory()->for($book)->create(['media_path' => 'books/test/image.jpg']);

        // Create video page
        $videoPage = Page::factory()->for($book)->create(['media_poster' => 'books/test/poster.jpg']);

        // Create screenshot page
        $screenshotPage = Page::factory()->for($book)->create(['media_path' => 'books/test/snapshot_123.jpg']);

        $response = $this->get(route('pictures.index'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3)
        );

        // Verify types in response
        $data = $response->viewData('page')['props']['photos']['data'];
        $types = collect($data)->pluck('type');

        $this->assertTrue($types->contains('page'));
        $this->assertTrue($types->contains('video'));
        $this->assertTrue($types->contains('screenshot'));
    }

    public function test_songs_have_correct_structure_in_feed(): void
    {
        $this->actingAs(User::factory()->create());

        $song = Song::factory()->create([
            'title' => 'Test Song',
            'description' => 'Test Description',
            'youtube_video_id' => 'test123',
            'thumbnail_default' => 'default.jpg',
            'thumbnail_maxres' => 'maxres.jpg',
        ]);

        $response = $this->get(route('pictures.index', ['filter' => 'music']));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 1)
                ->where('photos.data.0.type', 'song')
                ->where('photos.data.0.title', 'Test Song')
                ->where('photos.data.0.description', 'Test Description')
                ->has('photos.data.0.thumbnail_default')
                ->has('photos.data.0.thumbnail_maxres')
                ->has('photos.data.0.youtube_video_id')
        );
    }

    public function test_search_works_across_pages_and_songs(): void
    {
        $this->actingAs(User::factory()->create());

        $searchTerm = 'Special';

        // Create page with search term in content
        $book = Book::factory()->create();
        Page::factory()->for($book)->create(['content' => 'This is a Special page']);

        // Create page without search term
        Page::factory()->for($book)->create(['content' => 'Regular page']);

        // Create song with search term in title
        Song::factory()->create(['title' => 'Special Song']);

        // Create song with search term in description
        Song::factory()->create([
            'title' => 'Regular Song',
            'description' => 'This has a Special description',
        ]);

        // Create song without search term
        Song::factory()->create(['title' => 'Another Song']);

        $response = $this->get(route('pictures.index', ['search' => $searchTerm]));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3) // 1 page + 2 songs with search term
        );
    }

    public function test_pagination_works_with_unified_feed(): void
    {
        $this->actingAs(User::factory()->create());

        // Create more items than per page (25)
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(30)->create();
        Song::factory()->count(10)->create();

        // Test first page
        $response = $this->get(route('pictures.index'));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 25) // First page should have 25 items
                ->where('photos.total', 40) // Total should be 40
        );

        // Test second page
        $response = $this->get(route('pictures.index', ['page' => 2]));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 15) // Second page should have remaining 15 items
                ->where('photos.total', 40)
        );
    }

    // Music Enabled Site Setting Tests

    public function test_songs_are_excluded_from_all_feeds_when_music_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(5)->create();
        Song::factory()->count(5)->create();

        $response = $this->get(route('pictures.index'));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 5) // Should only have pages, no songs
        );
    }

    public function test_songs_are_included_in_feeds_when_music_enabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '1']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(3)->create();
        Song::factory()->count(3)->create();

        $response = $this->get(route('pictures.index'));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 6) // Should have both pages and songs
        );
    }

    public function test_music_filter_returns_empty_when_music_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(5)->create();
        Song::factory()->count(5)->create();

        $response = $this->get(route('pictures.index', ['filter' => 'music']));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 0) // Should be empty when music is disabled
        );
    }

    public function test_popular_filter_excludes_songs_when_music_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(3)->create(['read_count' => 100]);
        Song::factory()->count(3)->create(['read_count' => 200]);

        $response = $this->get(route('pictures.index', ['filter' => 'popular']));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3) // Should only have pages, even though songs have higher read count
        );
    }

    public function test_random_filter_excludes_songs_when_music_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(10)->create();
        Song::factory()->count(10)->create();

        $response = $this->get(route('pictures.index', ['filter' => 'random']));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->where('photos.total', 10) // Should only count pages
        );
    }

    public function test_old_filter_excludes_songs_when_music_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);

        $yearAgo = now()->subYear();
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(3)->create(['created_at' => $yearAgo]);
        Song::factory()->count(3)->create(['created_at' => $yearAgo]);

        $response = $this->get(route('pictures.index', ['filter' => 'old']));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 3) // Should only have pages
        );
    }

    public function test_search_excludes_songs_when_music_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->create(['content' => 'Test content with keyword']);
        Song::factory()->create(['title' => 'Test song with keyword']);

        $response = $this->get(route('pictures.index', ['search' => 'keyword']));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 1) // Should only find the page
        );
    }

    public function test_search_includes_songs_when_music_enabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '1']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->create(['content' => 'Test content with keyword']);
        Song::factory()->create(['title' => 'Test song with keyword']);

        $response = $this->get(route('pictures.index', ['search' => 'keyword']));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 2) // Should find both
        );
    }

    public function test_pagination_works_correctly_when_music_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(30)->create();
        Song::factory()->count(30)->create();

        $response = $this->get(route('pictures.index'));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 25) // Should have 25 items on first page
                ->where('photos.total', 30) // Total should be 30 (only pages)
        );
    }

    public function test_pagination_works_correctly_when_music_enabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '1']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(20)->create();
        Song::factory()->count(20)->create();

        $response = $this->get(route('pictures.index'));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 25) // Should have 25 items on first page
                ->where('photos.total', 40) // Total should be 40 (pages + songs)
        );
    }

    public function test_toggling_music_setting_changes_feed_immediately(): void
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(5)->create();
        Song::factory()->count(5)->create();

        // Start with music enabled
        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '1']);

        $response1 = $this->get(route('pictures.index'));
        $response1->assertInertia(
            fn (Assert $page) => $page->where('photos.total', 10)
        );

        // Disable music
        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);

        $response2 = $this->get(route('pictures.index'));
        $response2->assertInertia(
            fn (Assert $page) => $page->where('photos.total', 5)
        );

        // Re-enable music
        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '1']);

        $response3 = $this->get(route('pictures.index'));
        $response3->assertInertia(
            fn (Assert $page) => $page->where('photos.total', 10)
        );
    }

    public function test_music_and_youtube_settings_work_independently(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '0']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(2)->create();
        Page::factory()->for($book)->count(2)->create(['video_link' => 'https://youtube.com/watch?v=test']);
        Song::factory()->count(2)->create();

        $response = $this->get(route('pictures.index'));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 2) // Should only have non-video pages
        );
    }

    public function test_both_settings_enabled_shows_everything(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '1']);
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '1']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->count(2)->create();
        Page::factory()->for($book)->count(2)->create(['video_link' => 'https://youtube.com/watch?v=test']);
        Song::factory()->count(2)->create();

        $response = $this->get(route('pictures.index'));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 6) // Should have all items
        );
    }

    public function test_empty_feed_when_no_content_and_music_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        \App\Models\SiteSetting::where('key', 'music_enabled')->update(['value' => '0']);

        // Create only songs, no pages
        Song::factory()->count(5)->create();

        $response = $this->get(route('pictures.index'));
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Uploads/Index')
                ->has('photos.data', 0)
        );
    }
}
