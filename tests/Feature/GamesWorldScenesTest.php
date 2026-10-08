<?php

namespace Tests\Feature;

use App\Http\Controllers\GameController;
use App\Support\GamesWorld;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Lang;
use Tests\TestCase;

/**
 * Validates the whole scene registry rather than any one scene, so every
 * scene added later is checked by the same rules without a new test.
 */
class GamesWorldScenesTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_game_is_placed_exactly_once(): void
    {
        $placed = collect(GamesWorld::definitions())
            ->flatMap(fn ($scene) => $scene['interactables'])
            ->where('type', 'game')
            ->pluck('game')
            ->all();

        $this->assertEqualsCanonicalizing(array_keys(GameController::games()), $placed);
    }

    public function test_games_are_drawn_as_a_cast_member_or_an_emoji(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach (collect($scene['interactables'])->where('type', 'game') as $game) {
                $this->assertTrue(isset($game['cast']) xor isset($game['emoji']), "{$sceneId}.{$game['id']}");
            }
        }
    }

    public function test_interactable_ids_are_unique_within_a_scene(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            $ids = array_column($scene['interactables'], 'id');
            $this->assertSame(array_unique($ids), $ids, "{$sceneId} has duplicate ids");
        }
    }

    public function test_road_interactables_stand_on_a_side_of_the_street(): void
    {
        foreach (GamesWorld::definitions()['road']['interactables'] as $item) {
            $this->assertContains($item['side'], GamesWorld::ROAD_SIDES, "road.{$item['id']}");
        }
    }

    public function test_every_cast_reference_is_in_the_cast(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach ($scene['interactables'] as $item) {
                if (isset($item['cast'])) {
                    $this->assertContains($item['cast'], GamesWorld::CAST, "{$sceneId}.{$item['id']}");
                }
            }
        }
    }

    public function test_a_game_that_is_a_cast_member_is_named_by_id(): void
    {
        $boom = collect(GamesWorld::definitions()['house.bathroom']['interactables'])->firstWhere('id', 'boom');

        $this->assertSame('toilet', $boom['cast']);
        $this->assertArrayNotHasKey('emoji', $boom);
    }

    public function test_every_door_leads_to_a_spot_in_a_scene(): void
    {
        $scenes = GamesWorld::definitions();

        foreach ($scenes as $sceneId => $scene) {
            foreach (collect($scene['interactables'])->where('type', 'door') as $door) {
                $where = "{$sceneId}.{$door['id']}";
                $this->assertArrayHasKey($door['to'], $scenes, "{$where} leads nowhere");
                $this->assertContains(
                    $door['toSpot'] ?? null,
                    array_column($scenes[$door['to']]['interactables'], 'id'),
                    "{$where} has no spot to arrive at",
                );
            }
        }
    }

    public function test_every_room_has_one_way_out(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            $exits = collect($scene['interactables'])
                ->where('type', 'door')
                ->where('exit', true);
            // The road is outside: it has nowhere to go out to.
            $this->assertCount($scene['kind'] === 'room' ? 1 : 0, $exits, "{$sceneId} exits");
        }
    }

    public function test_every_label_is_translated_in_every_locale(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            // Games are named by GameController::games(), not by a key here.
            $items = collect($scene['interactables'])->where('type', '!=', 'game');
            $keys = [
                $scene['label'],
                ...collect(GamesWorld::TRANSLATED)->flatMap(fn ($field) => $items->pluck($field)->filter()),
            ];
            foreach ($keys as $key) {
                foreach (['en', 'es', 'fr'] as $locale) {
                    $this->assertTrue(Lang::has($key, $locale, false), "{$sceneId}: {$key} missing in {$locale}");
                }
            }
        }
    }

    public function test_rooms_are_built_from_known_looks_and_lights(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            if ($scene['kind'] !== 'room') {
                continue;
            }
            $this->assertContains($scene['walls']['back'], GamesWorld::WALLS, "{$sceneId} walls");
            $this->assertContains($scene['walls']['sides'] ?? $scene['walls']['back'], GamesWorld::WALLS, "{$sceneId} sides");
            $this->assertContains($scene['walls']['floor'], GamesWorld::FLOORS, "{$sceneId} floor");
            $this->assertGreaterThanOrEqual(0, $scene['ambient'], "{$sceneId} ambient");
            $this->assertLessThanOrEqual(1, $scene['ambient'], "{$sceneId} ambient");
            if (isset($scene['frame'])) {
                $this->assertGreaterThan(0, $scene['frame'], "{$sceneId} frame");
                $this->assertLessThan($scene['size']['w'], $scene['frame'], "{$sceneId} frame");
            }

            foreach (collect($scene['interactables'])->where('type', 'door') as $door) {
                $where = "{$sceneId}.{$door['id']}";
                $this->assertContains($door['wall'], GamesWorld::ROOM_WALLS, $where);
                if ($door['wall'] === 'left') {
                    $this->assertSame(0, $door['x'], $where);
                } elseif ($door['wall'] === 'right') {
                    $this->assertSame($scene['size']['w'], $door['x'], $where);
                } else {
                    $this->assertSame(0, $door['z'], $where);
                }
            }

            $lights = array_column($scene['lights'] ?? [], 'id');
            $this->assertSame(array_unique($lights), $lights, "{$sceneId} light ids");
            foreach ($scene['interactables'] as $item) {
                $where = "{$sceneId}.{$item['id']}";
                $this->assertGreaterThanOrEqual(0, $item['x'], $where);
                $this->assertLessThanOrEqual($scene['size']['w'], $item['x'], $where);
                $this->assertGreaterThanOrEqual(0, $item['z'], $where);
                $this->assertLessThanOrEqual($scene['size']['d'], $item['z'], $where);
                if (isset($item['light'])) {
                    $this->assertContains($item['light'], $lights, "{$where} switches no light");
                }
            }
        }
    }

    public function test_toys_play_known_moves_and_toot_as_the_cast(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach (collect($scene['interactables'])->where('type', 'toy') as $toy) {
                $where = "{$sceneId}.{$toy['id']}";
                // Drawn as a character, an emoji, or a painted clock face.
                $ways = (int) isset($toy['cast']) + (int) isset($toy['emoji']) + (int) isset($toy['face']);
                $this->assertSame(1, $ways, $where);
                if (isset($toy['face'])) {
                    $this->assertContains($toy['face'], GamesWorld::CLOCKS, $where);
                }
                if (isset($toy['move'])) {
                    $this->assertContains($toy['move'], GamesWorld::MOVES, $where);
                }
                if (isset($toy['toot'])) {
                    $this->assertContains($toy['toot'], GamesWorld::CAST, $where);
                }
                if (isset($toy['sound'])) {
                    $this->assertContains($toy['sound'], GamesWorld::SOUNDS, $where);
                }
            }
        }
    }

    public function test_scenes_translate_labels(): void
    {
        $scenes = GamesWorld::scenes();

        $this->assertSame('The Hall', $scenes['house.hall']['label']);
        $this->assertSame("The Butt's House", collect($scenes['road']['interactables'])->firstWhere('id', 'house')['label']);
    }

    public function test_scenes_fill_in_games(): void
    {
        $scenes = GamesWorld::scenes();
        $boom = collect($scenes['house.bathroom']['interactables'])->firstWhere('id', 'boom');

        $this->assertSame('Poop Boom', $boom['label']);
        $this->assertSame([
            'slug' => 'boom',
            'name' => 'Poop Boom',
            'emoji' => '💩',
            'description' => __('messages.games.boom.description'),
            'cast' => 'toilet',
        ], $boom['card']);

        $fight = collect($scenes['road']['interactables'])->firstWhere('id', 'cockroach-fight');
        $this->assertSame(2400, $fight['x']);
        $this->assertSame('🏟️', $fight['card']['landmark']);
    }
}
