<?php

namespace Tests\Feature;

use App\Events\MessageCreated;
use App\Http\Controllers\GameController;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use App\Support\GameShareMessage;
use App\Support\GamesWorld;
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
                // The buildings you can go into. The cockroach games' lots
                // are closed: the Poop's House stands where the fight was,
                // the Cockroach's House where the Poop's House was.
                ->has('scenes.road.interactables', 4)
                ->where('scenes.road.interactables.0.id', 'house')
                ->where('scenes.road.interactables.1.id', 'library')
                ->where('scenes.road.interactables.2.id', 'poop-house')
                ->where('scenes.road.interactables.2.x', 2400)
                ->where('scenes.road.interactables.3.id', 'cockroach-house')
                ->where('scenes.road.interactables.3.x', 3300)
                ->where('scenes.road.interactables.3.to', 'cockroach-house.hall')
                // A dotted id can't be a path here.
                ->where('scenes', fn ($scenes) => collect($scenes)->get('house.hall')['kind'] === 'room')
                ->where('link', null)
                ->has('scenes.road.interactables.0', fn (Assert $item) => $item->hasAll([
                    'id', 'type', 'x', 'side', 'emoji', 'label', 'to', 'toSpot',
                ]))
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

    public function test_a_moved_game_redirects_to_its_spot_in_the_house(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        foreach (GamesWorld::HOSTED as $game) {
            $this->get(route('games.show', $game))
                ->assertRedirect(route('games.index', ['minigame' => $game]));
        }
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

        $response = $this->post(route('games.share-score', 'sprout-pox'), ['score' => 42]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('messages', [
            'user_id' => $user->id,
            'message' => __('messages.game_score_shared', ['game' => 'Brussels Sprout Chicken Pox', 'score' => 42])."\u{E000}g:sprout-pox\u{E000}",
            'page_id' => null,
        ]);

        Event::assertDispatched(MessageCreated::class);
    }

    public function test_games_index_opens_at_a_minigame_named_in_the_link(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('games.index', ['minigame' => 'toot-catch']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('link.scene', 'poop-house.hall')
                ->where('link.spot', 'toot-catch')
                ->has('link.visit')
                ->has('users'));

        foreach (['nope', 'constructor', ''] as $unknown) {
            $this->get(route('games.index', ['minigame' => $unknown]))
                ->assertInertia(fn (Assert $page) => $page->where('link', null));
        }
    }

    public function test_games_index_opens_in_front_of_a_game_named_in_the_link(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $this->actingAs($user);

        // In a room, including the games that moved into their houses.
        foreach ([
            'boom' => 'house.bathroom',
            'toot-foods' => 'house.kitchen',
            'costco-pizza-poop' => 'house.kitchen',
            'cockroach' => 'cockroach-house.hall',
            'cockroach-fight' => 'cockroach-house.hall',
        ] as $game => $scene) {
            $this->get(route('games.index', ['game' => $game]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('link.scene', $scene)
                    ->where('link.spot', $game));
        }

        foreach (['nope', 'toot-catch', ''] as $unknown) {
            $this->get(route('games.index', ['game' => $unknown]))
                ->assertInertia(fn (Assert $page) => $page->where('link', null));
        }
    }

    public function test_every_game_and_minigame_can_be_linked_to(): void
    {
        foreach (array_keys(GameController::games()) as $game) {
            $this->assertNotNull(GamesWorld::whereIs('game', $game), $game);
        }
        foreach (GamesWorld::MINIGAMES as $minigame) {
            $this->assertNotNull(GamesWorld::whereIs('minigame', $minigame), $minigame);
        }
        foreach (GamesWorld::HOSTED as $hosted) {
            $this->assertNotNull(GamesWorld::whereIs('game', $hosted), $hosted);
            $this->assertSame(
                GamesWorld::whereIs('game', $hosted),
                GamesWorld::whereIs('minigame', $hosted),
                $hosted,
            );
        }
    }

    public function test_a_minigame_score_is_shared_with_a_link_back_to_its_room(): void
    {
        Event::fake();

        SiteSetting::updateOrCreate(
            ['key' => 'messaging_enabled'],
            ['value' => '1', 'type' => 'boolean', 'description' => 'x']
        );

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('games.share-score', 'toot-catch'), ['score' => 9])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('messages', [
            'user_id' => $user->id,
            'message' => __('messages.game_score_shared', ['game' => 'Toot Catch', 'score' => 9])."\u{E000}m:toot-catch\u{E000}",
        ]);
        $this->assertSame(
            __('messages.game_score_shared', ['game' => 'Toot Catch', 'score' => 9]),
            GameShareMessage::stripSlugMarker(Message::first()->message),
        );
    }

    public function test_a_hosted_game_shared_from_the_world_links_back_as_a_minigame(): void
    {
        Event::fake();

        SiteSetting::updateOrCreate(
            ['key' => 'messaging_enabled'],
            ['value' => '1', 'type' => 'boolean', 'description' => 'x']
        );

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('games.share-score', 'cockroach'), [
            'score' => 40,
            'in_world' => true,
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertDatabaseHas('messages', [
            'user_id' => $user->id,
            'message' => __('messages.game_score_shared', [
                'game' => 'Cockroach Fart',
                'score' => 40,
            ])."\u{E000}m:cockroach\u{E000}",
        ]);

        foreach ([
            'cockroach' => ['Cockroach Fart', 'cockroach-house.hall'],
            'cockroach-fight' => ['Cockroach Fight', 'cockroach-house.hall'],
            'toot-foods' => ['Toot Foods', 'house.kitchen'],
            'costco-pizza-poop' => ['Costco Food Poop', 'house.kitchen'],
            'boom' => ['Poop Boom', 'house.bathroom'],
        ] as $slug => [$name, $scene]) {
            Message::query()->delete();
            $this->post(route('games.share-score', $slug), ['score' => 40])
                ->assertRedirect();

            $this->assertDatabaseHas('messages', [
                'message' => __('messages.game_score_shared', [
                    'game' => $name,
                    'score' => 40,
                ])."\u{E000}m:{$slug}\u{E000}",
            ]);

            $this->get(route('games.index', ['minigame' => $slug]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('link.scene', $scene)
                    ->where('link.spot', $slug));

            // An older share still carries g:<slug> and links with ?game=.
            $this->get(route('games.index', ['game' => $slug]))
                ->assertInertia(fn (Assert $page) => $page
                    ->where('link.scene', $scene)
                    ->where('link.spot', $slug));
        }
    }

    public function test_in_world_share_of_a_game_that_still_leaves_the_world_is_not_found(): void
    {
        SiteSetting::updateOrCreate(
            ['key' => 'messaging_enabled'],
            ['value' => '1', 'type' => 'boolean', 'description' => 'x']
        );

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('games.share-score', 'sprout-pox'), [
            'score' => 1,
            'in_world' => true,
        ])->assertNotFound();
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
