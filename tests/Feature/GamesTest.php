<?php

namespace Tests\Feature;

use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
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
                ->has('games', 3)
                ->where('games.0.slug', 'boom')
                ->where('games.0.name', 'Poop Boom')
                ->where('games.1.slug', 'cockroach')
                ->where('games.1.name', 'Cockroach Fart')
                ->where('games.2.slug', 'big-poop')
                ->where('games.2.name', 'Big Poop')
        );
    }

    public function test_boom_game_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.show', 'boom'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Games/Boom')
                ->has('users')
        );
    }

    public function test_cockroach_game_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.show', 'cockroach'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Games/Cockroach')
                ->has('users')
        );
    }

    public function test_big_poop_game_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.show', 'big-poop'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Games/BigPoop')
                ->has('users')
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
        $this->get(route('games.show', 'big-poop'))->assertRedirect(route('login'));
    }

    public function test_share_game_score_requires_authentication(): void
    {
        $this->post(route('games.share-score', 'boom'), ['score' => 5])
            ->assertRedirect(route('login'));
    }

    public function test_share_game_score_unknown_game_returns_404(): void
    {
        $user = User::factory()->create();
        SiteSetting::updateOrCreate(
            ['key' => 'messaging_enabled'],
            ['value' => '1', 'type' => 'boolean', 'description' => 'x']
        );

        $this->actingAs($user)
            ->post(route('games.share-score', 'nope'), ['score' => 1])
            ->assertNotFound();
    }

    public function test_authenticated_user_can_share_game_score_to_chat(): void
    {
        Event::fake();

        SiteSetting::updateOrCreate(
            ['key' => 'messaging_enabled'],
            ['value' => '1', 'type' => 'boolean', 'description' => 'x']
        );

        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('games.share-score', 'boom'), ['score' => 42]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('messages', [
            'user_id' => $user->id,
            'message' => __('messages.game_score_shared', ['game' => 'Poop Boom', 'score' => 42]),
            'page_id' => null,
        ]);

        Event::assertDispatched(\App\Events\MessageCreated::class);
    }

    public function test_share_game_score_fails_when_messaging_disabled(): void
    {
        SiteSetting::updateOrCreate(
            ['key' => 'messaging_enabled'],
            ['value' => '0', 'type' => 'boolean', 'description' => 'x']
        );

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('games.share-score', 'cockroach'), ['score' => 3])
            ->assertSessionHasErrors();

        $this->assertSame(0, Message::count());
    }
}
