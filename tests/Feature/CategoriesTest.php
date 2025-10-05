<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CategoriesTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    public function test_category_is_stored()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        DB::table('categories')->delete();

        $payload = [
            'name' => 'test category',
        ];

        $response = $this->post(route('categories.store', $payload));

        $category = Category::first();
        $this->assertSame($category->name, $payload['name']);

        $response->assertRedirect(route('dashboard'));
    }

    public function test_category_is_updated()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        $category = Category::factory()->create();

        $payload = [
            'name' => $this->faker->word(),
        ];

        $response = $this->put(route('categories.update', $category), $payload);

        $freshCategory = Category::find($category->id);
        $this->assertSame($freshCategory->name, $payload['name']);

        $response->assertRedirect(route('dashboard'));
    }

    public function test_category_is_destroyed()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('admin');

        $category = Category::factory()
            ->has(
                Book::factory()->count(3)
            )
            ->create();

        $books = Book::where('category_id', $category->id)->get();
        $this->assertCount(3, $books);
        foreach ($books as $book) {
            $this->assertSame($category->id, $book->category_id);
        }

        $response = $this->delete(route('categories.destroy', $category));

        foreach ($books as $book) {
            $book->refresh();
            $this->assertSame('uncategorized', $book->category->name);
        }

        $this->assertNull(Category::find($category->id));

        $response->assertRedirect(route('dashboard'));
    }

    public function test_category_show_displays_books_for_regular_category()
    {
        $this->actingAs(User::factory()->create());

        $category = Category::factory()->create(['name' => 'fiction']);
        $books = Book::factory()->count(5)->create(['category_id' => $category->id]);

        $response = $this->get(route('categories.show', ['categoryName' => 'fiction']));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Category/Index')
            ->has('categoryName')
            ->where('categoryName', 'fiction')
            ->has('books.data', 5)
            ->has('books.current_page')
            ->has('books.last_page')
        );
    }

    public function test_category_show_displays_popular_books()
    {
        $this->actingAs(User::factory()->create());

        // Create books with different read counts
        Book::factory()->create(['read_count' => 100]);
        Book::factory()->create(['read_count' => 50]);
        Book::factory()->create(['read_count' => 200]);

        $response = $this->get(route('categories.show', ['categoryName' => 'popular']));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Category/Index')
            ->where('categoryName', 'popular')
            ->has('books.data', 3)
            ->where('books.data.0.read_count', 200) // Most popular first
            ->where('books.data.1.read_count', 100)
            ->where('books.data.2.read_count', 50)
        );
    }

    public function test_category_show_displays_forgotten_books()
    {
        $this->actingAs(User::factory()->create());

        // Create books with different read counts
        Book::factory()->create(['read_count' => 100]);
        Book::factory()->create(['read_count' => 5]);
        Book::factory()->create(['read_count' => 50]);

        $response = $this->get(route('categories.show', ['categoryName' => 'forgotten']));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Category/Index')
            ->where('categoryName', 'forgotten')
            ->has('books.data', 3)
            ->where('books.data.0.read_count', 5) // Least popular first
            ->where('books.data.1.read_count', 50)
            ->where('books.data.2.read_count', 100)
        );
    }

    public function test_category_show_returns_404_for_non_existent_category()
    {
        $this->actingAs(User::factory()->create());

        $response = $this->get(route('categories.show', ['categoryName' => 'non-existent']));

        $response->assertStatus(404);
    }

    public function test_category_show_includes_cover_images()
    {
        $this->actingAs(User::factory()->create());

        $category = Category::factory()->create(['name' => 'science']);
        $book = Book::factory()->create(['category_id' => $category->id]);

        $response = $this->get(route('categories.show', ['categoryName' => 'science']));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Category/Index')
            ->has('books.data.0.cover_image')
        );
    }

    public function test_category_show_returns_paginated_results()
    {
        $this->actingAs(User::factory()->create());

        $category = Category::factory()->create(['name' => 'mystery']);
        Book::factory()->count(20)->create(['category_id' => $category->id]);

        $response = $this->get(route('categories.show', ['categoryName' => 'mystery']));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Category/Index')
            ->has('books.data', 15) // Default Laravel pagination is 15
            ->has('books.next_page_url')
            ->has('books.total')
            ->where('books.total', 20)
        );
    }
}
