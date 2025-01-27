<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_data(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        $user->givePermissionTo('edit pages');

        $books = Book::factory()->has(Page::factory(13))->count(3)->create();

        $response = $this->get(route('dashboard'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->has('settings')
        );
    }
}
