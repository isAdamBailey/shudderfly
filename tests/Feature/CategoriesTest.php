<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\Fluent\AssertableJson;
use Tests\TestCase;

class CategoriesTest extends TestCase
{
    use RefreshDatabase;
    use WithFaker;

    public function test_categories_are_returned(): void
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        DB::table('categories')->delete();
        Category::factory()
            ->count(20)
            ->create();

        $this->getJson(route('categories.index',))
            ->assertJson(fn (AssertableJson $json) => $json
                ->has('categories', 20)
            );
    }

    public function test_category_is_stored()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        DB::table('categories')->delete();

        $payload = [
            'name' => "test category",
        ];

        $response = $this->post(route('categories.store', $payload));

        $category = Category::first();
        $this->assertSame($category->name, $payload['name']);

        $response->assertRedirect(route('dashboard'));
    }

    public function test_category_is_updated()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

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
        $user->givePermissionTo('edit pages');

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
}