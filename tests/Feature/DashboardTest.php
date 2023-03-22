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
        $this->actingAs($user = User::factory()->create());
        $user->givePermissionTo('edit pages');

        $books = Book::factory()->has(Page::factory(13))->count(3)->create();

        $this->get(route('dashboard'))->assertInertia(
            fn (Assert $page) => $page
                ->component('Dashboard/Index')
                ->url('/dashboard')
                ->has('users.data')
                ->has('stats.leastPages')
                ->has('stats.mostPages')
                ->has('stats.mostRead')
                ->has('stats.leastRead')
                ->has('stats.numberOfBooks')
                ->has('stats.numberOfPages')
                ->etc()
        );
    }
}
