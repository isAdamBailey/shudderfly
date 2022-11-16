<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BooksTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    /**
     * A basic feature test example.
     *
     * @return void
     */
    public function test_books_are_returned(): void
    {
        $this->actingAs(User::factory()->create());

        $books = Book::factory()->has(Page::factory(13))->count(3)->create();

        $this->get(route('books.index'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Books/Index')
                ->url('/books')
                ->has('books.data', $books->count())
                ->has('books.data.0', fn (Assert $page) => $page
                    ->where('pages_count', $books[0]->pages->count())
                    ->etc()
                )
        );
    }

    public function test_books_can_be_searched()
    {
        $this->actingAs(User::factory()->create());

        Book::factory()->count(30)->create();
        $searchBooks = Book::factory()->count(3)->create(
            ["title" => "Adam"]
        );

        $searchTerm = "Adam";
        $this->get(route('books.index', ["search" => $searchTerm]))->assertInertia(
            fn (Assert $page) => $page
                ->component('Books/Index')
                ->url('/books?search='.$searchTerm)
                ->has('books.data', $searchBooks->count())
        );
    }

    public function test_book_is_returned()
    {
        $this->actingAs(User::factory()->create());

        $book = Book::factory()->has(Page::factory(23))->create();

        $this->get(route('books.show', $book))->assertInertia(
            fn (Assert $page) => $page
                ->component('Book/Show')
                ->url('/book/'.$book->slug)
                ->has('book.title')
                ->has('book.excerpt')
                ->has('book.author')
                ->has('pages.data', 2)
                ->has('pages.per_page')
                ->has('pages.next_page_url')
                ->has('pages.prev_page_url')
                ->has('pages.first_page_url')
                ->has('pages.last_page_url')
                ->has('pages.total')
                ->has('authors', 1)
        );
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

        $response->assertRedirect(route('dashboard'));
    }
}
