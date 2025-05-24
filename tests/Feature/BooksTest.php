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
        $user = User::factory()->create();
        $this->actingAs($user);

        $book = Book::factory()->has(Page::factory(27))->create();
        $initialReadCount = $book->read_count; // Capture initial count

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

        // New books get 2.5x age boost (≤14 days old)
        $this->assertSame($initialReadCount + 2.5, $book->fresh()->read_count);
    }

    public function test_age_based_book_read_count_multipliers()
    {
        $this->actingAs(User::factory()->create());

        // Create dummy books with higher read counts to ensure our test books aren't in top 3
        Book::factory()->count(3)->create(['read_count' => 100]);

        // Create books of different ages
        $newBook = Book::factory()->create(['created_at' => now()]);
        $twoWeekOldBook = Book::factory()->create(['created_at' => now()->subDays(50)]); // Falls into 60-day category
        $twoMonthOldBook = Book::factory()->create(['created_at' => now()->subDays(90)]);
        $sixMonthOldBook = Book::factory()->create(['created_at' => now()->subDays(200)]);
        $veryOldBook = Book::factory()->create(['created_at' => now()->subYears(2)]);

        // Run jobs directly for testing
        (new \App\Jobs\IncrementBookReadCount($newBook))->handle();
        (new \App\Jobs\IncrementBookReadCount($twoWeekOldBook))->handle();
        (new \App\Jobs\IncrementBookReadCount($twoMonthOldBook))->handle();
        (new \App\Jobs\IncrementBookReadCount($sixMonthOldBook))->handle();
        (new \App\Jobs\IncrementBookReadCount($veryOldBook))->handle();

        // Verify age-based multipliers
        $this->assertSame(2.5, $newBook->fresh()->read_count); // ≤14 days: 2.5x
        $this->assertSame(1.8, $twoWeekOldBook->fresh()->read_count); // ≤60 days: 1.8x
        $this->assertSame(1.4, $twoMonthOldBook->fresh()->read_count); // ≤180 days: 1.4x
        $this->assertSame(1.2, $sixMonthOldBook->fresh()->read_count); // ≤365 days: 1.2x
        $this->assertSame(1.0, $veryOldBook->fresh()->read_count); // >365 days: 1x
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
}
