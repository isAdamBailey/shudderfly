<?php

namespace Tests\Feature;

use App\Events\MessageCreated;
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
                ->missing('games')
                ->where('scenes.road.kind', 'road')
                ->has('scenes.road.interactables', 6)
                ->where('scenes.road.interactables.0.id', 'sprout-pox')
                ->where('scenes.road.interactables.0.label', 'Brussels Sprout Chicken Pox')
                ->where('scenes.road.interactables.1.id', 'toot-foods')
                ->where('scenes.road.interactables.1.label', 'Toot Foods')
                ->where('scenes.road.interactables.2.id', 'cockroach-fight')
                ->where('scenes.road.interactables.2.label', 'Cockroach Fight')
                ->where('scenes.road.interactables.3.id', 'costco-pizza-poop')
                ->where('scenes.road.interactables.3.label', 'Costco Food Poop')
                ->where('scenes.road.interactables.4.id', 'boom')
                ->where('scenes.road.interactables.4.label', 'Poop Boom')
                ->where('scenes.road.interactables.5.id', 'cockroach')
                ->where('scenes.road.interactables.5.label', 'Cockroach Fart')
                // Every game needs a landmark and a road position, or it would
                // be unreachable in the Games World.
                ->has('scenes.road.interactables.0', fn (Assert $item) => $item->hasAll([
                    'id', 'type', 'x', 'side', 'game', 'emoji', 'label', 'card',
                ]))
                ->where('scenes.road.interactables.0.emoji', '🏥')
                ->where('scenes.road.interactables.0.x', 600)
                ->where('scenes.road.interactables.5.emoji', '🏚️')
                ->where('scenes.road.interactables.5.x', 5100)
                ->where('scenes.road.interactables.4.cast', 'toilet')
                ->where('fartSoundUrl', asset('fart.m4a'))
        );
    }

    public function test_games_index_gives_every_game_a_distinct_road_position(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.index'));

        $road = $response->viewData('page')['props']['scenes']['road']['interactables'];
        $positions = array_column($road, 'x');

        $this->assertCount(count($road), array_unique($positions));
        $this->assertSame($positions, array_values(collect($positions)->sort()->all()));
        $this->assertNotContains('', array_column($road, 'emoji'));
    }

    public function test_sprout_pox_game_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.show', 'sprout-pox'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Games/SproutPox')
                ->has('users')
                ->where('fartSoundUrl', asset('fart.m4a'))
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
                ->where('fartSoundUrl', asset('fart.m4a'))
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

    public function test_cockroach_fight_game_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.show', 'cockroach-fight'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Games/CockroachFight')
                ->has('users')
                ->where('fartSoundUrl', asset('fart.m4a'))
        );
    }

    public function test_costco_pizza_poop_game_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.show', 'costco-pizza-poop'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Games/CostcoPizzaPoop')
                ->has('users')
        );
    }

    public function test_toot_foods_game_page_is_displayed(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('games.show', 'toot-foods'));

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Games/TootFoods')
                ->has('users')
                ->where('fartSoundUrl', asset('fart.m4a'))
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
        $this->get(route('games.show', 'costco-pizza-poop'))->assertRedirect(route('login'));
        $this->get(route('games.show', 'cockroach-fight'))->assertRedirect(route('login'));
        $this->get(route('games.show', 'toot-foods'))->assertRedirect(route('login'));
        $this->get(route('games.show', 'sprout-pox'))->assertRedirect(route('login'));
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
            'message' => __('messages.game_score_shared', ['game' => 'Poop Boom', 'score' => 42])."\u{E000}g:boom\u{E000}",
            'page_id' => null,
        ]);

        Event::assertDispatched(MessageCreated::class);
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
