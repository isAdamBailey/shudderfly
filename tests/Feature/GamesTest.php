<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class GamesTest extends TestCase
{
    use RefreshDatabase;

    public function test_games_index_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.index'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Games/Index')
                ->has('games', 2)
                ->where('games.0.slug', 'boom')
                ->where('games.0.name', 'Poop Boom')
                ->where('games.1.slug', 'cockroach')
                ->where('games.1.name', 'Cockroach Fart')
        );
    }

    public function test_boom_game_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.show', 'boom'));

        $response->assertInertia(
            fn (Assert $page) => $page->component('Games/Boom')
        );
    }

    public function test_cockroach_game_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.show', 'cockroach'));

        $response->assertInertia(
            fn (Assert $page) => $page->component('Games/Cockroach')
        );
    }

    public function test_unknown_game_returns_404(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('games.show', 'unknown'))->assertNotFound();
    }

    public function test_games_require_authentication(): void
    {
        $this->get(route('games.index'))->assertRedirect(route('login'));
        $this->get(route('games.show', 'boom'))->assertRedirect(route('login'));
        $this->get(route('games.show', 'cockroach'))->assertRedirect(route('login'));
    }
}
