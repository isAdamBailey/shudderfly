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
                // The cockroach games, then the buildings you can go into.
                ->has('scenes.road.interactables', 5)
                ->where('scenes.road.interactables.2.id', 'house')
                ->where('scenes.road.interactables.3.id', 'library')
                ->where('scenes.road.interactables.4.id', 'poop-house')
                // A dotted id can't be a path here.
                ->where('scenes', fn ($scenes) => collect($scenes)->get('house.hall')['kind'] === 'room')
                ->where('link', null)
                ->where('scenes.road.interactables.0.id', 'cockroach-fight')
                ->where('scenes.road.interactables.0.label', 'Cockroach Fight')
                ->where('scenes.road.interactables.1.id', 'cockroach')
                ->where('scenes.road.interactables.1.label', 'Cockroach Fart')
                // A road game needs a landmark and a road position, or it
                // would be unreachable in the Games World.
                ->has('scenes.road.interactables.0', fn (Assert $item) => $item->hasAll([
                    'id', 'type', 'x', 'side', 'game', 'emoji', 'label', 'card',
                ]))
                ->where('scenes.road.interactables.0.emoji', '🏟️')
                ->where('scenes.road.interactables.0.x', 2400)
                ->where('scenes.road.interactables.1.emoji', '🏚️')
                ->where('scenes.road.interactables.1.x', 5100)
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
        // Two things can face each other across the street, not share a side.
        foreach (collect($road)->groupBy('side') as $side => $items) {
            $this->assertCount($items->count(), $items->pluck('x')->unique(), "{$side} side");
        }

        $games = collect($road)->where('type', 'game');
        $positions = $games->pluck('x')->all();
        $this->assertSame($positions, array_values(collect($positions)->sort()->all()));
        $this->assertNotContains('', $games->pluck('emoji')->all());
    }

    public function test_games_index_opens_a_scene_named_in_the_link(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $visits = [];
        foreach ([1, 2] as $_) {
            $this->get(route('games.index', ['scene' => 'house.hall']))
                ->assertInertia(function (Assert $page) use (&$visits) {
                    $page->where('link.scene', 'house.hall');
                    $visits[] = $page->toArray()['props']['link']['visit'];
                });
        }
        // Each click on the link is a visit of its own.
        $this->assertNotSame($visits[0], $visits[1]);

        foreach (['nowhere', 'constructor', ''] as $unknown) {
            $this->get(route('games.index', ['scene' => $unknown]))
                ->assertInertia(fn (Assert $page) => $page->where('link', null));
        }
        $this->get(route('games.index').'?scene[]=road')
            ->assertInertia(fn (Assert $page) => $page->where('link', null));
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
