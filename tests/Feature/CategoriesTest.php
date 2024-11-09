<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Sequence;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\Fluent\AssertableJson;
use Inertia\Testing\AssertableInertia as Assert;
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
                ->dd()
            );
    }

    public function test_book_is_stored()
    {
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $payload = [
            'name' => $this->faker->word(),
        ];

        $response = $this->post(route('categories.store', $payload));

        $category = Category::first();
        $this->assertSame($category->tname, $payload['name']);

        $response->assertRedirect(route('dashboard'));
    }
}