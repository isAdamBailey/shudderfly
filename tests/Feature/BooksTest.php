<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Sequence;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\Fluent\AssertableJson;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BooksTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    public function test_popular_books_are_returned(): void
    {
        $this->actingAs(User::factory()->create());

        DB::table('categories')->delete();
        Category::factory()
            ->has(
                Book::factory()
                    ->has(Page::factory(13))
                    ->count(30)
            )
            ->count(2)
            ->create();

        $this->getJson(route('books.category', ['categoryName' => 'popular']))
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('books', fn (AssertableJson $json) => $json->where('next_page_url', 'http://localhost/books-category?categoryName=popular&page=2')
                    ->has('data', 10)
                    ->has('data.0.cover_image')
                    ->etc()
                )
            );
    }

    public function test_books_are_returned_by_category_paginated(): void
    {
        $this->actingAs(User::factory()->create());

        DB::table('categories')->delete();
        Category::factory()
            ->has(
                Book::factory()
                    ->has(Page::factory(13))
                    ->count(40)
            )
            ->count(2)
            ->state(new Sequence(
                ['name' => 'test1'],
                ['name' => 'test2'],
            ))
            ->create();

        $this->getJson(route('books.category', ['categoryName' => 'test1']))
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('books', fn (AssertableJson $json) => $json->where('next_page_url', 'http://localhost/books-category?categoryName=test1&page=2')
                    ->has('data', 10)
                    ->where('total', 40)
                    ->has('data.0.cover_image')
                    ->etc()
                )
            );
        $this->getJson(route('books.category', ['categoryName' => 'test1', 'page' => '2']))
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('books', fn (AssertableJson $json) => $json->where('next_page_url', 'http://localhost/books-category?categoryName=test1&page=3')
                    ->has('data', 10)
                    ->where('total', 40)
                    ->has('data.0.cover_image')
                    ->etc()
                )
            );
    }

    public function test_books_can_be_searched()
    {
        $this->actingAs(User::factory()->create());

        DB::table('categories')->delete();
        Category::factory()
            ->has(
                Book::factory()->count(30)
            )
            ->count(2)
            ->create();

        $searchCategory = Category::factory()
            ->has(Book::factory(3, ['title' => 'Adam'])
            )->create(['name' => 'aaaaaa']); // so it shows up first in the array of categories

        $searchTerm = 'Adam';
        $this->get(route('books.index', ['search' => $searchTerm]))->assertInertia(
            fn (Assert $page) => $page
                ->component('Books/Index')
                ->url('/books?search='.$searchTerm)
                ->has('searchCategories.0.books', $searchCategory->books->count())
                ->has('searchCategories.0.books.0.cover_image')
                ->has('categories')
        );
    }

    public function test_book_is_returned()
    {
        \Cache::flush();
        $user = User::factory()->create();
        $user->revokePermissionTo('edit profile');
        $this->actingAs($user);

        $book = Book::factory()->has(Page::factory(27))->create();
        $initialReadCount = $book->read_count;

        $this->get(route('books.show', $book))->assertInertia(
            fn (Assert $page) => $page
                ->component('Book/Show')
                ->url('/book/'.$book->slug)
                ->has('book.title')
                ->has('book.excerpt')
                ->has('book.author')
                ->has('book.cover_image')
                ->has('pages.data', 15)
                ->has('pages.path')
                ->has('pages.per_page')
                ->has('pages.next_page_url')
                ->has('pages.prev_page_url')
                ->has('pages.first_page_url')
                ->has('pages.last_page_url')
                ->has('pages.total')
                ->has('authors')
                ->has('categories')
        );

        // Process the dispatched job (it was dispatched by the controller with a delay)
        $this->artisan('queue:work --stop-when-empty --once');

        $topBooks = Book::orderBy('read_count', 'desc')->limit(20)->pluck('id')->toArray();
        $isInTop20 = in_array($book->id, $topBooks);

        if ($isInTop20) {
            $this->assertSame($initialReadCount + 0.1, $book->fresh()->read_count);
        } else {
            $this->assertSame($initialReadCount + 3.0, $book->fresh()->read_count);
        }
    }

    public function test_age_based_book_read_count_multipliers()
    {
        $this->actingAs(User::factory()->create());

        // Create dummy books with higher read counts to ensure our test books aren't in top 3
        Book::factory()->count(3)->create(['read_count' => 100]);

        // Create books of different ages
        $newBook = Book::factory()->create(['created_at' => now()]); // ≤7 days: 2.5x
        $twoWeekOldBook = Book::factory()->create(['created_at' => now()->subDays(15)]); // ≤30 days: 1.8x
        $twoMonthOldBook = Book::factory()->create(['created_at' => now()->subDays(45)]); // ≤60 days: 1.4x
        $sixMonthOldBook = Book::factory()->create(['created_at' => now()->subDays(85)]); // ≤90 days: 1.2x
        $veryOldBook = Book::factory()->create(['created_at' => now()->subYears(2)]); // >90 days: 1.0x

        // Create enough books to ensure our test books are in top 20 but not top 3
        Book::factory()->count(20)->create(['read_count' => 300]);

        // Run jobs directly for testing
        (new \App\Jobs\IncrementBookReadCount($newBook, 'test-fingerprint'))->handle();
        (new \App\Jobs\IncrementBookReadCount($twoWeekOldBook, 'test-fingerprint'))->handle();
        (new \App\Jobs\IncrementBookReadCount($twoMonthOldBook, 'test-fingerprint'))->handle();
        (new \App\Jobs\IncrementBookReadCount($sixMonthOldBook, 'test-fingerprint'))->handle();
        (new \App\Jobs\IncrementBookReadCount($veryOldBook, 'test-fingerprint'))->handle();

        // Verify age-based multipliers
        $this->assertSame(3.0, $newBook->fresh()->read_count);
        $this->assertSame(2.0, $twoWeekOldBook->fresh()->read_count);
        $this->assertSame(1.5, $twoMonthOldBook->fresh()->read_count); // ≤60 days: 1.4x
        $this->assertSame(1.2, $sixMonthOldBook->fresh()->read_count); // ≤90 days: 1.2x
        $this->assertSame(1.0, $veryOldBook->fresh()->read_count); // >90 days: 1.0x
    }

    public function test_when_book_is_returned_read_count_is_not_incremented_for_admins()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');
        $user->givePermissionTo('edit profile');

        $book = Book::factory()->has(Page::factory())->create();

        $this->get(route('books.show', $book))->assertInertia(
            fn (Assert $page) => $page
                ->component('Book/Show')
                ->url('/book/'.$book->slug)
                ->has('categories', 10) // only admin has categories
                ->has('authors', 1) // only admin has authors
        );

        // make sure we do not increment admin view
        $this->assertIsFloat($book->read_count);
        $this->assertIsFloat($book->fresh()->read_count);
        $this->assertSame($book->read_count, $book->fresh()->read_count);
    }

    public function test_book_cannot_be_stored_without_permissions()
    {
        $this->actingAs(User::factory()->create());

        $this->post(route('books.store'))->assertStatus(403);
    }

    public function test_book_is_stored()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $payload = [
            'title' => $this->faker->sentence(3),
            'author' => $this->faker->name(),
            'excerpt' => $this->faker->paragraph(),
        ];

        $response = $this->post(route('books.store', $payload));

        $book = Book::first();
        $this->assertSame($book->title, $payload['title']);
        $this->assertSame($book->author, $payload['author']);
        $this->assertSame($book->excerpt, $payload['excerpt']);

        $response->assertRedirect(route('books.show', $book));
    }

    public function test_book_cannot_be_updated_without_permissions()
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->create();

        $this->put(route('books.update', $book))->assertStatus(403);
    }

    public function test_book_is_updated()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        $payload = [
            'title' => $this->faker->sentence(3),
            'author' => $this->faker->name(),
        ];

        $response = $this->put(route('books.update', $book->slug), $payload);

        $freshBook = Book::find($book->id);
        $this->assertSame($freshBook->title, $payload['title']);
        $this->assertSame($freshBook->author, $payload['author']);
        // make sure one that didn't update does not change
        $this->assertSame($freshBook->excerpt, $book->excerpt);

        $response->assertRedirect(route('books.show', $freshBook));
    }

    public function test_book_is_destroyed()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->has(Page::factory()->count(5))->create();
        $this->assertCount(5, Page::where('book_id', $book->id)->get());

        $response = $this->delete(route('books.destroy', $book->slug));

        $this->assertNull(Book::find($book->id));
        $this->assertCount(0, Page::where('book_id', $book->id)->get());

        $response->assertRedirect(route('books.index'));
    }

    public function test_youtube_videos_are_hidden_in_book_when_disabled(): void
    {
        $this->actingAs(User::factory()->create());

        // Create a book with both regular pages and video pages
        $book = Book::factory()->create();
        Page::factory()->for($book)->count(3)->create(); // Regular pages
        Page::factory()->for($book)->count(2)->state(['video_link' => 'https://youtube.com/watch?v=123'])->create(); // Video pages

        // Set youtube_enabled to false
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '0']);

        // Test book show page - should only show regular pages
        $this->get(route('books.show', $book))->assertInertia(
            fn (Assert $page) => $page
                ->component('Book/Show')
                ->has('pages.data', 3) // Only regular pages
        );

        // Enable YouTube
        \App\Models\SiteSetting::where('key', 'youtube_enabled')->update(['value' => '1']);

        // Test book show page again - should now show all pages
        $this->get(route('books.show', $book))->assertInertia(
            fn (Assert $page) => $page
                ->component('Book/Show')
                ->has('pages.data', 5) // All pages
        );
    }

    public function test_themed_books_are_returned_in_books_index_when_theme_is_active()
    {
        $this->actingAs(User::factory()->create());

        DB::table('categories')->delete();

        // Create books with Halloween-themed titles
        Book::factory()->create(['title' => 'Halloween Party']);
        Book::factory()->create(['title' => 'Spooky Stories']);
        Book::factory()->create(['title' => 'The Haunted House']);

        // Create books without theme keywords
        Book::factory()->create(['title' => 'Regular Book']);
        Book::factory()->create(['title' => 'Another Book']);

        // Mock the current month to be October (Halloween)
        $this->travelTo(now()->setMonth(10));

        // Test that the index page has the theme label
        $this->get(route('books.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Books/Index')
                ->where('themeLabel', 'Halloween Books')
                ->has('categories')
        );

        // Test that the API endpoint returns the correct themed books
        $response = $this->get(route('books.category', ['categoryName' => 'themed']));
        $response->assertStatus(200);
        $books = $response->json('books.data');
        $this->assertCount(3, $books);

        $this->travelBack();
    }

    public function test_themed_books_are_not_returned_when_no_theme_is_active()
    {
        $this->actingAs(User::factory()->create());

        DB::table('categories')->delete();

        // Create books with Halloween-themed titles
        Book::factory()->create(['title' => 'Halloween Party']);
        Book::factory()->create(['title' => 'Spooky Stories']);

        // Mock the current month to be March (no theme)
        $this->travelTo(now()->setMonth(3));

        $this->get(route('books.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Books/Index')
                ->where('themeLabel', null)
                ->has('categories')
        );

        $this->travelBack();
    }

    public function test_themed_books_match_christmas_keywords()
    {
        $this->actingAs(User::factory()->create());

        DB::table('categories')->delete();

        // Create books with Christmas-themed titles and excerpts
        Book::factory()->create(['title' => 'Christmas Carol']);
        Book::factory()->create(['title' => 'The Santa Adventure']);
        Book::factory()->create(['excerpt' => 'A story about winter snow and reindeer']);

        // Create books without theme keywords
        Book::factory()->create(['title' => 'Summer Fun']);

        // Mock the current month to be December (Christmas)
        $this->travelTo(now()->setMonth(12));

        // Test that the index page has the theme label
        $this->get(route('books.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Books/Index')
                ->where('themeLabel', 'Christmas Books')
        );

        // Test that the API endpoint returns the correct themed books
        $response = $this->get(route('books.category', ['categoryName' => 'themed']));
        $response->assertStatus(200);
        $books = $response->json('books.data');
        $this->assertCount(3, $books);

        $this->travelBack();
    }

    public function test_themed_books_match_fireworks_keywords()
    {
        $this->actingAs(User::factory()->create());

        DB::table('categories')->delete();

        // Create books with 4th of July themed content
        Book::factory()->create(['title' => '4th of July Celebration']);
        Book::factory()->create(['title' => 'Fireworks Show']);
        Book::factory()->create(['excerpt' => 'A story about independence and summer fun']);

        // Create books without theme keywords
        Book::factory()->create(['title' => 'Winter Tales']);

        // Mock the current month to be July (Fireworks)
        $this->travelTo(now()->setMonth(7));

        // Test that the index page has the theme label
        $this->get(route('books.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Books/Index')
                ->where('themeLabel', '4th of July Books')
        );

        // Test that the API endpoint returns the correct themed books
        $response = $this->get(route('books.category', ['categoryName' => 'themed']));
        $response->assertStatus(200);
        $books = $response->json('books.data');
        $this->assertCount(3, $books);

        $this->travelBack();
    }

    public function test_themed_books_returns_null_when_theme_active_but_no_matching_books()
    {
        $this->actingAs(User::factory()->create());

        DB::table('categories')->delete();

        // Create books without any theme keywords
        Book::factory()->create(['title' => 'Regular Book']);
        Book::factory()->create(['title' => 'Another Book']);
        Book::factory()->create(['title' => 'Yet Another Book']);

        // Mock the current month to be October (Halloween theme is active)
        $this->travelTo(now()->setMonth(10));

        // Test that the index page still has the theme label
        $this->get(route('books.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Books/Index')
                ->where('themeLabel', 'Halloween Books') // Label should still be set
                ->has('categories')
        );

        // Test that the API endpoint returns empty results
        $response = $this->get(route('books.category', ['categoryName' => 'themed']));
        $response->assertStatus(200);
        $books = $response->json('books.data');
        $this->assertCount(0, $books);

        $this->travelBack();
    }

    public function test_book_can_be_stored_with_location(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $payload = [
            'title' => $this->faker->sentence(3),
            'author' => $this->faker->name(),
            'excerpt' => $this->faker->paragraph(),
            'latitude' => 45.5152,
            'longitude' => -122.6784,
        ];

        $response = $this->post(route('books.store'), $payload);

        $book = Book::first();
        $this->assertEquals(45.5152, $book->latitude);
        $this->assertEquals(-122.6784, $book->longitude);

        $response->assertRedirect(route('books.show', $book));
    }

    public function test_book_can_be_stored_without_location(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $payload = [
            'title' => $this->faker->sentence(3),
            'author' => $this->faker->name(),
            'excerpt' => $this->faker->paragraph(),
        ];

        $response = $this->post(route('books.store'), $payload);

        $book = Book::first();
        $this->assertNull($book->latitude);
        $this->assertNull($book->longitude);

        $response->assertRedirect(route('books.show', $book));
    }

    public function test_book_can_be_updated_with_location(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        $payload = [
            'title' => $book->title,
            'latitude' => 45.6387,
            'longitude' => -122.6615,
        ];

        $response = $this->put(route('books.update', $book->slug), $payload);

        $freshBook = Book::find($book->id);
        $this->assertEquals(45.6387, $freshBook->latitude);
        $this->assertEquals(-122.6615, $freshBook->longitude);

        $response->assertRedirect(route('books.show', $freshBook));
    }

    public function test_book_location_can_be_cleared(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create([
            'latitude' => 45.5152,
            'longitude' => -122.6784,
        ]);

        $payload = [
            'title' => $book->title,
            'latitude' => null,
            'longitude' => null,
        ];

        $response = $this->put(route('books.update', $book->slug), $payload);

        $freshBook = Book::find($book->id);
        $this->assertNull($freshBook->latitude);
        $this->assertNull($freshBook->longitude);

        $response->assertRedirect(route('books.show', $freshBook));
    }

    public function test_book_location_cascades_to_pages_without_locations(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        // Create pages: some with locations, some without
        $pageWithLocation = Page::factory()->for($book)->create([
            'latitude' => 40.7128,
            'longitude' => -74.0060,
        ]);
        $pageWithoutLocation1 = Page::factory()->for($book)->create([
            'latitude' => null,
            'longitude' => null,
        ]);
        $pageWithoutLocation2 = Page::factory()->for($book)->create([
            'latitude' => null,
            'longitude' => null,
        ]);

        // Update book with location
        $payload = [
            'title' => $book->title,
            'latitude' => 45.6387,
            'longitude' => -122.6615,
        ];

        $this->put(route('books.update', $book->slug), $payload);

        // Pages without locations should inherit book location
        $this->assertEquals(45.6387, $pageWithoutLocation1->fresh()->latitude);
        $this->assertEquals(-122.6615, $pageWithoutLocation1->fresh()->longitude);
        $this->assertEquals(45.6387, $pageWithoutLocation2->fresh()->latitude);
        $this->assertEquals(-122.6615, $pageWithoutLocation2->fresh()->longitude);

        // Page with existing location should get overridden by book location
        $this->assertEquals(45.6387, $pageWithLocation->fresh()->latitude);
        $this->assertEquals(-122.6615, $pageWithLocation->fresh()->longitude);
    }

    public function test_pages_inherit_book_location_when_created_without_location(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create([
            'latitude' => 45.6387,
            'longitude' => -122.6615,
        ]);

        $payload = [
            'book_id' => $book->id,
            'content' => $this->faker->paragraph(),
            // No latitude/longitude provided
        ];

        $response = $this->post(route('pages.store'), $payload);

        $page = $book->pages()->first();
        $this->assertEquals(45.6387, $page->latitude);
        $this->assertEquals(-122.6615, $page->longitude);

        $response->assertRedirect(route('books.show', $book));
    }

    public function test_pages_can_override_book_location(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create([
            'latitude' => 45.6387,
            'longitude' => -122.6615,
        ]);

        $payload = [
            'book_id' => $book->id,
            'content' => $this->faker->paragraph(),
            'latitude' => 40.7128, // Different from book location
            'longitude' => -74.0060,
        ];

        $response = $this->post(route('pages.store'), $payload);

        $page = $book->pages()->first();
        $this->assertEquals(40.7128, $page->latitude);
        $this->assertEquals(-74.0060, $page->longitude);

        $response->assertRedirect(route('books.show', $book));
    }

    public function test_book_location_validation_rejects_invalid_latitude(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        $payload = [
            'title' => $book->title,
            'latitude' => 91.0, // Invalid: must be between -90 and 90
            'longitude' => -122.6784,
        ];

        $response = $this->put(route('books.update', $book->slug), $payload);
        $response->assertSessionHasErrors('latitude');
    }

    public function test_book_location_validation_rejects_invalid_longitude(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        $payload = [
            'title' => $book->title,
            'latitude' => 45.5152,
            'longitude' => 181.0, // Invalid: must be between -180 and 180
        ];

        $response = $this->put(route('books.update', $book->slug), $payload);
        $response->assertSessionHasErrors('longitude');
    }

    public function test_book_location_validation_accepts_valid_coordinates(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $book = Book::factory()->create();

        $payload = [
            'title' => $book->title,
            'latitude' => 45.5152,
            'longitude' => -122.6784,
        ];

        $response = $this->put(route('books.update', $book->slug), $payload);
        $response->assertSessionHasNoErrors();

        $freshBook = Book::find($book->id);
        $this->assertEquals(45.5152, $freshBook->latitude);
        $this->assertEquals(-122.6784, $freshBook->longitude);
    }
}
