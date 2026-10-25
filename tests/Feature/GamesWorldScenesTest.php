<?php

namespace Tests\Feature;

use App\Http\Controllers\BookController;
use App\Http\Controllers\GameController;
use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Models\SiteSetting;
use App\Models\Song;
use App\Models\Sound;
use App\Services\ContentBlockService;
use App\Support\GamesWorld;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Lang;
use Tests\TestCase;

/**
 * Validates the whole scene registry rather than any one scene, so every
 * scene added later is checked by the same rules without a new test.
 */
class GamesWorldScenesTest extends TestCase
{
    use RefreshDatabase;

    /** Six categories, so the Library has two landings and every rule
     * below also checks its generated rooms. `people` is long. */
    protected function setUp(): void
    {
        parent::setUp();

        // The migrations seed the real categories; replace them.
        Category::query()->delete();
        foreach (['things', 'animals', 'people', 'movies', 'places', 'shows'] as $name) {
            $category = Category::factory()->create(['name' => $name]);
            Book::factory()->count($name === 'people' ? 20 : 2)->create(['category_id' => $category->id]);
        }
    }

    /** Where `$shelf` ends along its wall, as GamesWorld lays it out. */
    private function shelfEnd(array $shelf): int
    {
        return $shelf['x'] + (int) ceil($shelf['count'] / $shelf['rows']) * $shelf['span'];
    }

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
            // Its sign: an emoji or a cast member at the door, not both.
            $this->assertTrue(isset($item['cast']) xor isset($item['emoji']), "road.{$item['id']} sign");
            if (isset($item['door'])) {
                $this->assertContains($item['door'], GamesWorld::DOORS, "road.{$item['id']} door");
            }
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
                ...collect($scene['shelves'] ?? [])->pluck('label')->filter(),
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
            $this->assertContains($scene['walls']['front'] ?? $scene['walls']['sides'] ?? $scene['walls']['back'], GamesWorld::WALLS, "{$sceneId} front");
            $this->assertContains($scene['walls']['floor'], GamesWorld::FLOORS, "{$sceneId} floor");
            // Every room has the same daylight (RoomScene.js), none its own.
            $this->assertArrayNotHasKey('ambient', $scene, $sceneId);
            // Every room is seen at the same scale: a wider one scrolls.
            $this->assertSame(GamesWorld::ROOM_FRAME, $scene['frame'], "{$sceneId} frame");

            foreach (collect($scene['interactables'])->where('type', 'door') as $door) {
                $where = "{$sceneId}.{$door['id']}";
                $this->assertContains($door['wall'], GamesWorld::ROOM_WALLS, $where);
                if ($door['wall'] === 'left') {
                    $this->assertSame(0, $door['x'], $where);
                } elseif ($door['wall'] === 'right') {
                    $this->assertSame($scene['size']['w'], $door['x'], $where);
                } elseif ($door['wall'] === 'front') {
                    $this->assertSame($scene['size']['d'], $door['z'], $where);
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
                foreach ((array) ($item['light'] ?? []) as $light) {
                    $this->assertContains($light, $lights, "{$where} switches no light");
                }
            }
        }
    }

    public function test_every_room_has_lamps_within_the_budget_and_a_switch_for_each(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            if ($scene['kind'] !== 'room') {
                continue;
            }
            $lights = array_column($scene['lights'] ?? [], 'id');
            $this->assertNotEmpty($lights, "{$sceneId} is dark at night");
            $this->assertLessThanOrEqual(GamesWorld::ROOM_LIGHTS_MAX, count($lights), "{$sceneId} lights");

            $switched = collect($scene['interactables'])
                ->flatMap(fn ($item) => (array) ($item['light'] ?? []))
                ->all();
            foreach ($lights as $light) {
                $this->assertContains($light, $switched, "{$sceneId}.{$light} has no switch");
            }
        }
    }

    public function test_library_reading_lamps_hang_over_the_shelves(): void
    {
        $people = Category::where('name', 'people')->value('id');
        $room = GamesWorld::definitions()["library.category-{$people}"];
        $shelf = $room['shelves'][0];
        $end = $this->shelfEnd($shelf);

        foreach ($room['lights'] as $lamp) {
            $this->assertGreaterThan($shelf['x'], $lamp['x']);
            $this->assertLessThan($end, $lamp['x']);
        }
        $switch = collect($room['interactables'])->firstWhere('id', 'light-switch');
        $this->assertSame(array_column($room['lights'], 'id'), $switch['light']);
    }

    public function test_a_long_shelf_gets_no_more_than_the_budget_of_reading_lamps(): void
    {
        $long = Category::factory()->create(['name' => 'zebras']);
        Book::factory()->count(90)->create(['category_id' => $long->id]);

        $lights = GamesWorld::definitions()["library.category-{$long->id}"]['lights'];

        $this->assertCount(GamesWorld::ROOM_LIGHTS_MAX, $lights);
    }

    public function test_modelled_things_are_known_models(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach (collect($scene['interactables'])->whereNotNull('model') as $item) {
                $this->assertContains($item['model'], GamesWorld::MODELS, "{$sceneId}.{$item['id']}");
            }
        }
    }

    public function test_framed_pictures_and_photos_are_in_known_frames(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach ([...$scene['interactables'], ...($scene['photos'] ?? [])] as $item) {
                if (isset($item['image']['frame'])) {
                    $this->assertArrayHasKey($item['image']['frame'], GamesWorld::PICTURE_FRAMES, "{$sceneId}.{$item['id']}");
                }
            }
        }
    }

    public function test_toys_play_known_moves_and_toot_as_the_cast(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach (collect($scene['interactables'])->where('type', 'toy') as $toy) {
                $where = "{$sceneId}.{$toy['id']}";
                // Drawn as a character, an emoji, a painted clock face, a picture, or a model.
                $ways = (int) isset($toy['cast']) + (int) isset($toy['emoji']) + (int) isset($toy['face']) + (int) isset($toy['image']) + (int) isset($toy['model']);
                $this->assertSame(1, $ways, $where);
                if (isset($toy['image'])) {
                    $this->assertNotSame('', $toy['image']['src'] ?? '', $where);
                    $this->assertGreaterThan(0, $toy['image']['w'] ?? 0, $where);
                    $this->assertGreaterThan(0, $toy['image']['h'] ?? 0, $where);
                }
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

    public function test_minigames_are_known_and_explained(): void
    {
        $found = 0;
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach (collect($scene['interactables'])->where('type', 'minigame') as $item) {
                $where = "{$sceneId}.{$item['id']}";
                $this->assertSame('room', $scene['kind'], $where);
                $this->assertContains($item['minigame'], GamesWorld::MINIGAMES, $where);
                $this->assertArrayHasKey('line', $item, $where);
                // Its card gives the score in its own words, translated.
                $this->assertTrue(Lang::has($item['score']), $where);
                $this->assertStringContainsString(':score', __($item['score']), $where);
                $found++;
            }
        }
        $this->assertGreaterThan(0, $found);
    }

    public function test_the_cockroach_house_is_a_candlelit_room_you_can_leave(): void
    {
        $scenes = GamesWorld::definitions();
        $door = collect($scenes['road']['interactables'])->firstWhere('id', 'cockroach-house');

        $this->assertSame('door', $door['type']);
        $this->assertSame(3300, $door['x']);
        $this->assertSame('far', $door['side']);
        $this->assertSame('cockroach-house.hall', $door['to']);

        $room = $scenes['cockroach-house.hall'];
        $this->assertSame('stone', $room['walls']['back']);
        $this->assertSame('flagstones', $room['walls']['floor']);
        // Lit by candles alone, every one flickering, and no bulbs.
        foreach ($room['lights'] as $light) {
            $this->assertTrue($light['flicker'] ?? false, $light['id']);
        }
        $this->assertEmpty(collect($room['interactables'])->where('emoji', '💡'));
        $this->assertTrue($room['crawlers']);
        // A candle on the left wall, and none on the floor.
        $side = collect($room['interactables'])->firstWhere('id', 'sconce-side');
        $this->assertSame('sconce-side', $side['light']);
        $this->assertLessThan(50, $side['x']);
        $this->assertGreaterThan(0, $side['y']);

        $portrait = collect($room['interactables'])->firstWhere('id', 'portrait');
        $this->assertSame('/img/cockroach.png', $portrait['image']['src']);
        $this->assertSame(372, $portrait['image']['w']);
        $this->assertSame(200, $portrait['image']['h']);

        $this->assertEqualsCanonicalizing(
            ['cockroach', 'cockroach-fight'],
            collect($room['interactables'])->where('type', 'game')->pluck('game')->all(),
        );
        $this->assertEmpty(collect($scenes['road']['interactables'])->where('type', 'game'));

        $shown = GamesWorld::scenes()['cockroach-house.hall'];
        $this->assertSame("The Cockroach's Nest", $shown['label']);
        $this->assertSame(
            'Picture of the cockroach',
            collect($shown['interactables'])->firstWhere('id', 'portrait')['label'],
        );
    }

    public function test_gusters_house_has_toot_catch(): void
    {
        $catch = collect(GamesWorld::scenes()['guster-house.hall']['interactables'])->firstWhere('minigame', 'toot-catch');

        $this->assertSame('toot-catch', $catch['minigame']);
        $this->assertSame('Toot Catch', $catch['label']);
        $this->assertSame(__('messages.games.world.minigames.toot_catch_line'), $catch['line']);
    }

    public function test_toot_catch_is_gusters_washing_machine_against_his_wall(): void
    {
        $room = GamesWorld::definitions()['guster-house.hall'];
        $items = collect($room['interactables'])->keyBy('id');
        $washer = $items['toot-catch'];

        // On the floor against the back wall, with no gold name over it,
        // like the kitchen's appliances.
        $this->assertSame('washing-machine', $washer['model']);
        $this->assertSame(0, $washer['z']);
        $this->assertArrayNotHasKey('y', $washer);
        $this->assertFalse($washer['titled']);

        // Clear of the front door and inside the room.
        $half = $this->modelWidth($washer) / 2;
        $this->assertGreaterThan(0, $washer['x'] - $half);
        $this->assertLessThan($items['front-door']['x'] - 60, $washer['x'] + $half);
    }

    public function test_gusters_house_has_toot_slots_on_the_wall(): void
    {
        $slots = collect(GamesWorld::scenes()['guster-house.hall']['interactables'])->firstWhere('minigame', 'toot-slots');

        $this->assertSame('minigame', $slots['type']);
        $this->assertSame('Toot Slots', $slots['label']);
        $this->assertSame('slot-machine', $slots['model']);
        $this->assertSame('You won :score times!', $slots['score']);
        // Hung up the back wall, not standing on the floor.
        $this->assertGreaterThan(0, $slots['y']);
    }

    public function test_gusters_house_is_green_with_guster_at_home(): void
    {
        $scenes = GamesWorld::definitions();

        // Guster, not a house emoji, is the sign over his door.
        $door = collect($scenes['road']['interactables'])->firstWhere('id', 'guster-house');
        $this->assertSame('guster', $door['cast']);
        $this->assertSame('guster-house.hall', $door['to']);

        $hall = $scenes['guster-house.hall'];
        $this->assertSame(['back' => 'wallpaper-green', 'floor' => 'moss'], $hall['walls']);
        $guster = collect($hall['interactables'])->firstWhere('id', 'guster');
        $this->assertSame('guster', $guster['cast']);
        // He toots his hello: the puff, with his recording for its sound,
        // and no spoken line.
        $this->assertSame('guster', $guster['toot']);
        $this->assertSame(GamesWorld::GUSTER_HELLO, $guster['clip']);
        $this->assertArrayNotHasKey('line', $guster);
    }

    public function test_gusters_hello_is_served_as_a_url(): void
    {
        $guster = collect(GamesWorld::scenes()['guster-house.hall']['interactables'])->firstWhere('id', 'guster');

        $this->assertSame(Sound::urlForPath(GamesWorld::GUSTER_HELLO), $guster['clip']);
        $this->assertStringEndsWith(GamesWorld::GUSTER_HELLO, $guster['clip']);
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
            'figure' => 'guster',
            'description' => __('messages.games.boom.description'),
            'cast' => 'toilet',
        ], $boom['card']);

        $nest = $scenes['cockroach-house.hall']['interactables'];
        $fight = collect($nest)->firstWhere('id', 'cockroach-fight');
        $this->assertSame('Cockroach Fight', $fight['label']);
        $this->assertSame('cockroach', $fight['card']['cast']);
        $fart = collect($nest)->firstWhere('id', 'cockroach');
        $this->assertSame('Cockroach Fart', $fart['label']);
        $this->assertSame('cockroach', $fart['card']['cast']);
    }

    public function test_the_library_has_a_room_per_category_over_its_floors(): void
    {
        $scenes = GamesWorld::definitions();
        $doors = fn (string $id) => collect($scenes[$id]['interactables'])->where('type', 'door')->pluck('to', 'id')->all();
        $id = fn (string $name) => Category::where('name', $name)->value('id');

        // Four rooms a landing, in name order; stairs chain the floors.
        $this->assertSame([
            'front-door' => 'road',
            'upstairs' => 'library.floor-2',
        ], $doors('library.hall'));
        $this->assertSame([
            'downstairs' => 'library.hall',
            "category-{$id('animals')}" => "library.category-{$id('animals')}",
            "category-{$id('movies')}" => "library.category-{$id('movies')}",
            "category-{$id('people')}" => "library.category-{$id('people')}",
            "category-{$id('places')}" => "library.category-{$id('places')}",
            'upstairs' => 'library.floor-3',
        ], $doors('library.floor-2'));
        $this->assertSame([
            'downstairs' => 'library.floor-2',
            "category-{$id('shows')}" => "library.category-{$id('shows')}",
            "category-{$id('things')}" => "library.category-{$id('things')}",
        ], $doors('library.floor-3'));
        $this->assertArrayNotHasKey('library.floor-4', $scenes);

        $people = $scenes["library.category-{$id('people')}"];
        $this->assertSame([[
            'id' => 'books',
            'category' => 'people',
            'count' => 20,
            'x' => GamesWorld::LIBRARY_SHELVES_FROM,
            'rows' => GamesWorld::LIBRARY_SHELF_ROWS,
            'span' => GamesWorld::LIBRARY_BOOK_SPAN,
            'perPage' => BookController::PER_PAGE,
        ]], $people['shelves']);
        // Out at either end of the shelves, the near one the way out.
        $this->assertSame(['landing-door' => 'library.floor-2', 'far-door' => 'library.floor-2'], $doors("library.category-{$id('people')}"));
        $far = collect($people['interactables'])->firstWhere('id', 'far-door');
        $this->assertTrue($far['open']);
        $this->assertArrayNotHasKey('exit', $far);
    }

    public function test_a_category_room_is_as_long_as_its_shelves(): void
    {
        $scenes = GamesWorld::definitions();
        $room = fn (string $name) => $scenes['library.category-'.Category::where('name', $name)->value('id')];

        // 20 books in 3 rows is 7 columns: past the door, the shelves,
        // then the far door.
        $this->assertSame(
            GamesWorld::LIBRARY_SHELVES_FROM + 7 * GamesWorld::LIBRARY_BOOK_SPAN + 270,
            $room('people')['size']['w'],
        );
        // A short shelf keeps a room's usual width.
        $this->assertSame(GamesWorld::ROOM_FRAME, $room('shows')['size']['w']);
    }

    public function test_the_far_door_stands_clear_of_the_shelves(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach ($scene['shelves'] ?? [] as $shelf) {
                $end = $this->shelfEnd($shelf);
                $far = collect($scene['interactables'])->firstWhere('id', 'far-door');
                if (! $far) {
                    continue;
                }
                // A doorway is 180 wide in a 14 wide frame; a bookcase's
                // end board is 8.
                $this->assertGreaterThanOrEqual($end + 8 + 90 + 14, $far['x'], $sceneId);
                $this->assertLessThanOrEqual($scene['size']['w'] - 90 - 14, $far['x'], $sceneId);
            }
        }
    }

    public function test_an_emptied_category_has_a_room_with_no_shelf(): void
    {
        $shows = Category::where('name', 'shows')->first();
        $shows->books()->delete();

        $room = GamesWorld::definitions()["library.category-{$shows->id}"];

        $this->assertArrayNotHasKey('shelves', $room);
    }

    public function test_an_empty_library_is_just_the_ground_floor(): void
    {
        Book::query()->delete();
        Category::query()->delete();

        $scenes = GamesWorld::definitions();

        $this->assertSame(['front-door', 'light-switch'], array_column($scenes['library.hall']['interactables'], 'id'));
        $this->assertEmpty(preg_grep('/^library\.(floor|category)-/', array_keys($scenes)));
    }

    public function test_the_library_hall_has_the_books_pages_special_shelves(): void
    {
        config(['app.force_theme' => '']);
        $this->travelTo(now()->setDate(2026, 5, 10));

        $shelves = GamesWorld::scenes()['library.hall']['shelves'];

        // 30 books: the hall's shelves hold a few each, side by side.
        $this->assertSame(['forgotten', 'popular'], array_slice(array_column($shelves, 'category'), 0, 2));
        $this->assertSame([GamesWorld::LIBRARY_HALL_SHELF, GamesWorld::LIBRARY_HALL_SHELF], array_slice(array_column($shelves, 'count'), 0, 2));
        $this->assertSame('Remember these?', $shelves[0]['label']);
        $this->assertGreaterThan($shelves[0]['x'], $shelves[1]['x']);
        $this->assertArrayNotHasKey('labelArgs', $shelves[0]);

        // The hall reaches past its last shelf, with room for the stairs.
        $hall = GamesWorld::definitions()['library.hall'];
        $last = end($shelves);
        $end = $this->shelfEnd($last);
        $this->assertGreaterThanOrEqual($end + 200, $hall['size']['w']);
        $this->assertSame($hall['size']['w'], collect($hall['interactables'])->firstWhere('id', 'upstairs')['x']);
    }

    public function test_the_library_hall_has_a_seasonal_shelf(): void
    {
        Book::factory()->create(['title' => 'The Haunted Toilet']);
        config(['app.force_theme' => 'halloween']);

        $seasonal = GamesWorld::scenes()['library.hall']['shelves'][2];
        $this->assertSame('themed', $seasonal['category']);
        $this->assertSame(1, $seasonal['count']);
        $this->assertSame('Halloween books', $seasonal['label']);

        config(['app.force_theme' => '']);
        $this->travelTo(now()->setDate(2026, 5, 10));
        Book::factory()->create(['title' => 'A Day in May']);

        $seasonal = GamesWorld::scenes()['library.hall']['shelves'][2];
        $this->assertSame('month', $seasonal['category']);
        $this->assertSame('May Books', $seasonal['label']);
    }

    public function test_library_labels_name_the_floor_and_the_category(): void
    {
        $scenes = GamesWorld::scenes();
        $people = 'library.category-'.Category::where('name', 'people')->value('id');

        $this->assertSame('Floor 2', $scenes['library.floor-2']['label']);
        $this->assertSame('The People Room', $scenes[$people]['label']);
        $this->assertSame('Floor 2', $scenes[$people]['interactables'][0]['label']);
        $this->assertSame('People', collect($scenes['library.floor-2']['interactables'])->firstWhere('to', $people)['label']);
        $this->assertSame('Go upstairs', collect($scenes['library.hall']['interactables'])->firstWhere('id', 'upstairs')['label']);
        $this->assertArrayNotHasKey('labelArgs', $scenes[$people]);
    }

    public function test_landing_doors_stand_clear_of_the_stairs(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            if (! str_starts_with($sceneId, 'library.floor-')) {
                continue;
            }
            // A doorway is 180 wide; a flight reaches 90 in off its wall.
            foreach (collect($scene['interactables'])->where('wall', 'back') as $door) {
                $this->assertTrue($door['open'] ?? false, "{$sceneId}.{$door['id']} is an open doorway");
                $this->assertGreaterThanOrEqual(90 + 90, $door['x'], "{$sceneId}.{$door['id']}");
                $this->assertLessThanOrEqual($scene['size']['w'] - 90 - 90, $door['x'], "{$sceneId}.{$door['id']}");
            }
        }
    }

    public function test_stairs_stand_the_same_way_out_from_the_back_wall_on_either_side(): void
    {
        $stairs = collect(GamesWorld::definitions())
            ->filter(fn ($scene) => $scene['kind'] === 'room')
            ->flatMap(fn ($scene) => collect($scene['interactables'])->whereNotNull('stairs'));

        $this->assertEqualsCanonicalizing(['left', 'right'], $stairs->pluck('wall')->unique()->values()->all());
        foreach ($stairs as $flight) {
            $this->assertSame(220, $flight['z'], $flight['id']);
        }
    }

    private function tv(): array
    {
        return collect(GamesWorld::scenes()['house.bedroom']['interactables'])->firstWhere('type', 'tv');
    }

    public function test_the_tv_plays_family_videos_anyone_can_see(): void
    {
        $book = Book::factory()->create(['title' => 'Bath Time']);
        $video = Page::factory()->create([
            'book_id' => $book->id,
            'media_path' => 'https://cdn.test/bath.mp4',
            'media_poster' => 'https://cdn.test/bath.jpg',
        ]);
        // Not on the TV: a blocked video, a YouTube link and a photo.
        Page::factory()->create(['media_path' => 'https://cdn.test/no.mp4', 'media_poster' => 'https://cdn.test/no.jpg', 'blocked' => true]);
        Page::factory()->create(['media_path' => '', 'media_poster' => 'https://cdn.test/yt.jpg', 'video_link' => 'https://youtu.be/abc']);
        Page::factory()->create();

        $tv = $this->tv();

        $this->assertSame('TV', $tv['label']);
        $this->assertSame([[
            'id' => $video->id,
            'video' => 'https://cdn.test/bath.mp4',
            'poster' => 'https://cdn.test/bath.jpg',
            'title' => 'Bath Time',
        ]], $tv['channels']);
    }

    public function test_a_blocked_video_is_on_the_tv_while_blocking_is_off(): void
    {
        SiteSetting::updateOrCreate(['key' => ContentBlockService::SETTING], ['value' => false]);
        Page::factory()->create(['media_path' => 'https://cdn.test/a.mp4', 'media_poster' => 'https://cdn.test/a.jpg', 'blocked' => true]);

        $this->assertCount(1, $this->tv()['channels']);
    }

    public function test_the_tv_has_a_few_channels_and_a_line_for_none(): void
    {
        $this->assertSame([], $this->tv()['channels']);
        $this->assertSame(__('messages.games.world.toys.tv_line'), $this->tv()['line']);

        // The day's empty pick is kept until the cache is cleared.
        $this->videos(GamesWorld::TV_CHANNELS + 2);
        $this->assertSame([], $this->tv()['channels']);
        Cache::flush();

        $this->assertCount(GamesWorld::TV_CHANNELS, $this->tv()['channels']);
    }

    public function test_the_butts_hall_is_folded_onto_its_four_walls(): void
    {
        $hall = GamesWorld::definitions()['house.hall'];
        $items = collect($hall['interactables'])->keyBy('id');
        $wallOf = fn (array $thing) => $this->wallSpot($thing, $hall['size'])[0];

        // No longer one long hall: a little wider than the frame, no deeper.
        $this->assertLessThanOrEqual(1300, $hall['size']['w']);
        $this->assertSame(500, $hall['size']['d']);

        // A door on every wall, the way out on the back, where you come in.
        $this->assertSame(
            ['front-door' => 'back', 'bedroom-door' => 'left', 'bathroom-door' => 'right', 'kitchen-door' => 'front'],
            $items->where('type', 'door')->map($wallOf)->all(),
        );
        $this->assertTrue($items['front-door']['exit']);

        // All eight clocks, on every wall, and the radio on the front.
        $clocks = $items->filter(fn ($item) => str_starts_with($item['id'], 'clock-'));
        $this->assertCount(8, $clocks);
        $this->assertEqualsCanonicalizing(['back', 'left', 'right', 'front'], $clocks->map($wallOf)->unique()->values()->all());
        $this->assertSame('front', $wallOf($items['radio']));
        $this->assertSame('front', $wallOf($hall['entertainment'][0]));
    }

    private function radio(): array
    {
        return collect(GamesWorld::scenes()['house.hall']['interactables'])->firstWhere('type', 'radio');
    }

    public function test_the_radio_stands_on_the_hall_entertainment_center(): void
    {
        $hall = GamesWorld::scenes()['house.hall'];
        $center = $hall['entertainment'][0];
        $radio = $this->radio();
        [$wall, $along] = $this->wallSpot($center, $hall['size']);
        [$radioWall, $radioAlong, $radioOut] = $this->wallSpot($radio, $hall['size']);

        // On top of it, against the same wall.
        $this->assertSame($wall, $radioWall);
        $this->assertSame($along, $radioAlong);
        $this->assertSame($center['h'], $radio['y']);
        $this->assertLessThan($center['d'], $radioOut);
        $this->assertNull(collect(GamesWorld::scenes()['house.kitchen']['interactables'])->firstWhere('type', 'radio'));
        $this->assertSame('radio', $radio['model']);
    }

    public function test_a_table_lamp_on_the_entertainment_center_switches_its_own_light(): void
    {
        $hall = GamesWorld::scenes()['house.hall'];
        $center = $hall['entertainment'][0];
        $lamp = collect($hall['interactables'])->firstWhere('id', 'table-lamp');

        $this->assertSame('table-lamp', $lamp['model']);
        $this->assertSame('table-lamp', $lamp['light']);
        $this->assertSame('Table lamp', $lamp['label']);
        $this->assertSame($center['h'], $lamp['y']);
        [$wall, $along] = $this->wallSpot($center, $hall['size']);
        [$lampWall, $lampAlong, $lampOut] = $this->wallSpot($lamp, $hall['size']);
        $this->assertSame($wall, $lampWall);
        $this->assertLessThan($center['w'] / 2, abs($lampAlong - $along));
        $this->assertLessThan($center['d'], $lampOut);
        // Its light hangs where it stands, in its shade.
        $light = collect($hall['lights'])->firstWhere('id', 'table-lamp');
        $this->assertSame([$lamp['x'], $lamp['z']], [$light['x'], $light['z']]);
    }

    public function test_the_kitchen_games_are_its_fridge_and_oven_between_the_counters(): void
    {
        $kitchen = GamesWorld::scenes()['house.kitchen'];
        $items = collect($kitchen['interactables'])->keyBy('id');
        $fridge = $items['toot-foods'];
        $oven = $items['costco-pizza-poop'];

        $this->assertSame('fridge', $fridge['model']);
        $this->assertSame('oven', $oven['model']);
        foreach ([$fridge, $oven] as $game) {
            // Against the back wall, with no gold name over it.
            $this->assertSame(0, $game['z']);
            $this->assertFalse($game['titled']);
        }
        // Their cards keep the burger and the Pizza.
        $this->assertSame('🍔', $fridge['card']['landmark']);
        $this->assertSame('pizza', $oven['card']['cast']);

        // The oven stands in the gap between the counters, its cooktop at
        // their worktop and as wide as the gap (three/footprints.js: its
        // cooktop at 0.84 of its size); the fridge stands between the door
        // and the counters.
        [$left, $right] = $kitchen['counters'];
        $gap = [$left['x'] + $left['w'] / 2, $right['x'] - $right['w'] / 2];
        $this->assertSame($oven['x'], array_sum($gap) / 2);
        $this->assertEqualsWithDelta($gap[1] - $gap[0], $this->modelWidth($oven), 1);
        $this->assertEqualsWithDelta(GamesWorld::KITCHEN_COUNTER['h'], $oven['size'] * 0.84, 1);
        $this->assertLessThanOrEqual($gap[0] - $left['w'], $fridge['x'] + $this->modelWidth($fridge) / 2);
        $this->assertGreaterThan($items['hall-door']['x'] + 60, $fridge['x'] - $this->modelWidth($fridge) / 2);

        foreach ($kitchen['counters'] as $counter) {
            // Shallow enough that the Butt never walks into it.
            $this->assertLessThan(50, $counter['d']);
            $this->assertLessThanOrEqual($kitchen['size']['w'], $counter['x'] + $counter['w'] / 2);
        }

        // The pot and the fruit stand on the worktops.
        foreach (['sprout-pot', 'grapes', 'apple', 'blueberries'] as $id) {
            $this->assertSame(GamesWorld::KITCHEN_COUNTER['h'], $items[$id]['y'], $id);
            $this->assertLessThan(GamesWorld::KITCHEN_COUNTER['d'], $items[$id]['z'], $id);
            $on = collect($kitchen['counters'])->contains(fn ($c) => abs($items[$id]['x'] - $c['x']) + $items[$id]['size'] / 2 <= $c['w'] / 2);
            $this->assertTrue($on, "{$id} is on no counter");
        }

        // The fruit can be thrown about the room.
        foreach (['grapes', 'apple', 'blueberries'] as $id) {
            $this->assertTrue($items[$id]['throwable'], $id);
        }
        $this->assertArrayNotHasKey('throwable', $items['sprout-pot']);
    }

    public function test_the_nests_games_are_its_armchair_and_grandfather_clock(): void
    {
        $nest = GamesWorld::scenes()['cockroach-house.hall'];
        $items = collect($nest['interactables'])->keyBy('id');
        $chair = $items['cockroach'];
        $clock = $items['cockroach-fight'];

        $this->assertSame('armchair', $chair['model']);
        $this->assertSame('grandfather-clock', $clock['model']);
        foreach ([$chair, $clock] as $game) {
            // On the floor against the back wall, with no gold name over
            // it, like the kitchen's appliances; their cards keep the
            // Cockroach.
            $this->assertSame(0, $game['z']);
            $this->assertArrayNotHasKey('y', $game);
            $this->assertFalse($game['titled']);
            $this->assertSame('cockroach', $game['card']['cast']);
        }

        // Side by side past Hank's right-hand photo (its ornate moulding
        // and all) and short of the music room's door, the clock first so
        // the door's name arcs over the low armchair, not its face, with a
        // candle between them.
        $photo = collect($nest['photos'])->firstWhere('id', 'hank-right');
        $clockHalf = $this->modelWidth($clock) / 2;
        $chairHalf = $this->modelWidth($chair) / 2;
        $candle = $items['sconce-right'];
        $this->assertGreaterThan($photo['x'] + $photo['image']['w'] / 2 + GamesWorld::PICTURE_FRAMES['ornate'], $clock['x'] - $clockHalf);
        $this->assertLessThan($candle['x'] - $candle['size'] / 2, $clock['x'] + $clockHalf);
        $this->assertLessThan($chair['x'] - $chairHalf, $candle['x'] + $candle['size'] / 2);
        $this->assertLessThan($items['music-door']['x'] - 60, $chair['x'] + $chairHalf);
        $this->assertLessThan($candle['y'], $chair['size']);
        // Shallow enough that the Butt never walks into them (useRoom.js
        // MARGIN keeps it 50 off the wall).
        foreach ([$chair, $clock] as $game) {
            $this->assertLessThan(50, $game['size'] * GamesWorld::MODEL_FOOTPRINTS[$game['model']]['d'], $game['id']);
        }
        $this->assertLessThan($this->decorationsBottom($nest), $clock['size']);
    }

    public function test_only_sized_toys_can_be_thrown(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach (collect($scene['interactables'])->where('throwable', true) as $item) {
                // Thrown about a room, it needs its size to bounce off the walls.
                $this->assertSame('room', $scene['kind'], "{$sceneId}.{$item['id']}");
                $this->assertSame('toy', $item['type'], "{$sceneId}.{$item['id']}");
                $this->assertGreaterThan(0, $item['size'] ?? 0, "{$sceneId}.{$item['id']}");
            }
        }
    }

    public function test_the_cockroach_house_has_a_music_room_off_the_nest(): void
    {
        $scenes = GamesWorld::definitions();
        $nest = collect($scenes['cockroach-house.hall']['interactables']);
        $room = $scenes['cockroach-house.music'];
        $back = collect($room['interactables'])->firstWhere('exit', true);

        // A door at the Nest's far end, and its way back the Nest's door.
        $door = $nest->firstWhere('id', 'music-door');
        $this->assertSame('cockroach-house.music', $door['to']);
        $this->assertSame($back['id'], $door['toSpot']);
        $this->assertSame('cockroach-house.hall', $back['to']);
        $this->assertSame($door['id'], $back['toSpot']);
        $this->assertGreaterThan($scenes['cockroach-house.hall']['size']['w'] / 2, $door['x']);

        // The organ is the music room's, not the Nest's, and the room is
        // the Nest's stone, lit by candles alone.
        $this->assertEmpty($nest->where('type', 'organ'));
        $this->assertSame($room['walls'], $scenes['cockroach-house.hall']['walls']);
        $this->assertTrue($room['crawlers']);
        foreach ($room['lights'] as $light) {
            $this->assertTrue($light['flicker'] ?? false, $light['id']);
        }

        $this->assertSame('The Music Room', GamesWorld::scenes()['cockroach-house.music']['label']);
        $this->assertSame('The Music Room', collect(GamesWorld::scenes()['cockroach-house.hall']['interactables'])->firstWhere('id', 'music-door')['label']);
    }

    public function test_the_cockroach_house_music_room_has_a_pipe_organ_in_its_back_right_corner(): void
    {
        $room = GamesWorld::definitions()['cockroach-house.music'];
        $organ = collect($room['interactables'])->firstWhere('type', 'organ');

        // Across the room from the way out, so a press on the keys can't
        // be a press on the door.
        $this->assertSame('back-right', $organ['wall']);
        $this->assertSame($room['size']['w'] - $organ['z'], $organ['x']);
        $this->assertGreaterThan($room['size']['w'] / 2, $organ['x']);
        $door = collect($room['interactables'])->firstWhere('exit', true);
        $this->assertLessThan($room['size']['w'] / 2, $door['x']);
        $this->assertCount(count(GamesWorld::ORGAN_ZONES), $organ['zones']);
        foreach ([$organ['label'], ...$organ['zones']] as $key) {
            foreach (['en', 'es', 'fr'] as $locale) {
                $this->assertTrue(Lang::has($key, $locale, false), "{$key} missing in {$locale}");
            }
        }

        $shown = collect(GamesWorld::scenes()['cockroach-house.music']['interactables'])->firstWhere('type', 'organ');
        $this->assertSame('Pipe organ', $shown['label']);
        $this->assertSame(
            ['Pipe organ, deep notes', 'Pipe organ, low notes', 'Pipe organ, high notes', 'Pipe organ, squeaky notes'],
            $shown['zones'],
        );
    }

    public function test_the_music_room_has_a_bass_drum_and_a_harp_between_the_door_and_the_organ(): void
    {
        $room = GamesWorld::definitions()['cockroach-house.music'];
        $items = collect($room['interactables']);
        $door = $items->firstWhere('exit', true);
        $drum = $items->firstWhere('type', 'drum');
        $harp = $items->firstWhere('type', 'harp');
        $organ = $items->firstWhere('type', 'organ');

        // Door, drum, harp, organ, along the room: each played where it
        // stands, clear of the others (a drum's cradle and a harp reach
        // about 120 either side of their middles).
        $this->assertGreaterThan($door['x'] + 60 + 120, $drum['x']);
        $this->assertGreaterThan($drum['x'] + 240, $harp['x']);
        $this->assertLessThan($organ['x'] - 300, $harp['x']);
        foreach ([$drum, $harp] as $thing) {
            foreach (['en', 'es', 'fr'] as $locale) {
                $this->assertTrue(Lang::has($thing['label'], $locale, false), "{$thing['label']} missing in {$locale}");
            }
        }

        $shown = collect(GamesWorld::scenes()['cockroach-house.music']['interactables'])->keyBy('id');
        $this->assertSame('Bass drum', $shown['bass-drum']['label']);
        $this->assertSame('Harp', $shown['harp']['label']);
    }

    public function test_hanks_portrait_stands_on_the_cockroach_house_mantel_over_a_fire(): void
    {
        $room = GamesWorld::scenes()['cockroach-house.hall'];
        $fireplace = $room['fireplaces'][0];
        $items = collect($room['interactables']);
        $portrait = $items->firstWhere('id', 'portrait');
        $fire = $items->firstWhere('id', 'fire');

        $this->assertSame($fireplace['h'], $portrait['y']);
        $this->assertSame($fireplace['x'], $portrait['x']);
        $tribute = $items->firstWhere('id', 'tribute');
        $this->assertSame('📜', $tribute['emoji']);
        $this->assertSame('This house is dedicated to the memory of Hank Bailey. May your hiss live on forever.', $tribute['line']);
        $this->assertSame('fire', $fire['light']);
        $this->assertLessThan($fireplace['d'], $fire['z']);
        $this->assertLessThan($fireplace['h'] - $fire['size'], $fire['y']);
    }

    public function test_the_radio_plays_the_family_songs(): void
    {
        $song = Song::factory()->create([
            'title' => 'Toot Toot Song',
            'youtube_video_id' => 'abc123',
        ]);

        $radio = $this->radio();

        $this->assertSame('Radio', $radio['label']);
        $this->assertSame('📻', $radio['emoji']);
        $this->assertSame([$song->id], array_column($radio['songs'], 'id'));
        $this->assertSame(
            ['id', 'title', 'description', 'youtube_video_id', 'thumbnail_default', 'thumbnail_high'],
            array_keys($radio['songs'][0]),
        );
        $this->assertSame('abc123', $radio['songs'][0]['youtube_video_id']);
    }

    public function test_the_radio_has_a_few_songs_and_a_line_for_none(): void
    {
        $this->assertSame([], $this->radio()['songs']);
        $this->assertSame(__('messages.games.world.toys.radio_line'), $this->radio()['line']);

        Song::factory()->count(GamesWorld::RADIO_STATIONS + 2)->create();
        Cache::flush();

        $this->assertCount(GamesWorld::RADIO_STATIONS, $this->radio()['songs']);
    }

    public function test_the_radio_is_silent_while_the_music_is_off(): void
    {
        Song::factory()->create();
        SiteSetting::updateOrCreate(['key' => 'music_enabled'], ['value' => false]);

        $this->assertSame([], $this->radio()['songs']);
    }

    /** `$count` videos the TV can show. */
    private function videos(int $count): void
    {
        Page::factory()->count($count)->create(['media_path' => 'https://cdn.test/v.mp4', 'media_poster' => 'https://cdn.test/v.jpg']);
    }

    /** The queries for the world's pages and songs run while `$callback`
     * does. */
    private function pickQueries(callable $callback): array
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $callback();
        DB::disableQueryLog();

        return array_values(array_filter(
            array_column(DB::getQueryLog(), 'query'),
            // Quoted "pages" in SQLite, `pages` in MySQL.
            fn ($sql) => preg_match('/from ["`](pages|songs|sounds)["`]/', $sql),
        ));
    }

    public function test_the_tv_and_radio_keep_the_same_picks_all_day_and_change_the_next(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 10, 11, 9, 0, 0, config('app.local_timezone')));
        $this->videos(GamesWorld::TV_CHANNELS * 4);
        Song::factory()->count(GamesWorld::RADIO_STATIONS * 4)->create();

        $channels = array_column($this->tv()['channels'], 'id');
        $songs = array_column($this->radio()['songs'], 'id');
        $this->assertCount(GamesWorld::TV_CHANNELS, $channels);

        // Same set, same order, later that day, from the cache: a second
        // visit runs no query for them, nor for Hank's (empty) frames.
        Carbon::setTestNow(Carbon::create(2026, 10, 11, 23, 30, 0, config('app.local_timezone')));
        $this->assertSame([], $this->pickQueries(function () use ($channels, $songs) {
            $this->assertSame($channels, array_column($this->tv()['channels'], 'id'));
            $this->assertSame($songs, array_column($this->radio()['songs'], 'id'));
        }));

        // After midnight in Los Angeles, a fresh pick.
        Carbon::setTestNow(Carbon::create(2026, 10, 12, 0, 30, 0, config('app.local_timezone')));
        $this->assertNotEmpty($this->pickQueries(function () use (&$next) {
            $next = array_column($this->tv()['channels'], 'id');
        }));
        $this->assertNotSame($channels, $next);
        $this->assertNotSame($songs, array_column($this->radio()['songs'], 'id'));
    }

    public function test_what_is_blocked_or_deleted_during_the_day_stays_until_the_next_pick(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 10, 11, 9, 0, 0, config('app.local_timezone')));
        SiteSetting::updateOrCreate(['key' => ContentBlockService::SETTING], ['value' => true]);
        $this->videos(GamesWorld::TV_CHANNELS);
        Song::factory()->count(GamesWorld::RADIO_STATIONS)->create();
        $channels = array_column($this->tv()['channels'], 'id');
        $songs = array_column($this->radio()['songs'], 'id');

        Page::whereKey($channels[0])->update(['blocked' => true]);
        Song::destroy($songs[0]);
        $this->assertSame($channels, array_column($this->tv()['channels'], 'id'));
        $this->assertSame($songs, array_column($this->radio()['songs'], 'id'));

        Carbon::setTestNow(Carbon::create(2026, 10, 12, 9, 0, 0, config('app.local_timezone')));
        $this->assertNotContains($channels[0], array_column($this->tv()['channels'], 'id'));
        $this->assertNotContains($songs[0], array_column($this->radio()['songs'], 'id'));
    }

    public function test_the_radio_plays_again_once_the_music_is_back_on(): void
    {
        SiteSetting::updateOrCreate(['key' => 'music_enabled'], ['value' => false]);
        $song = Song::factory()->create();
        $this->assertSame([], $this->radio()['songs']);

        SiteSetting::updateOrCreate(['key' => 'music_enabled'], ['value' => true]);

        $this->assertSame([$song->id], array_column($this->radio()['songs'], 'id'));
    }

    public function test_a_short_pick_is_kept_until_the_cache_is_cleared(): void
    {
        $morning = Song::factory()->create();
        $this->assertSame([$morning->id], array_column($this->radio()['songs'], 'id'));

        Song::factory()->count(GamesWorld::RADIO_STATIONS)->create();
        $this->assertSame([], $this->pickQueries(fn () => $this->assertCount(1, $this->radio()['songs'])));

        Cache::flush();
        $this->assertCount(GamesWorld::RADIO_STATIONS, $this->radio()['songs']);
    }

    /** The Cockroach's House's photos, as the page gets them. */
    private function hankPhotos(): array
    {
        return GamesWorld::scenes()['cockroach-house.hall']['photos'];
    }

    /** Hank's book, with `$count` photos in it. */
    private function hankBook(int $count): Book
    {
        $book = Book::factory()->create(['title' => 'Hank']);
        $this->assertSame(GamesWorld::HANK_BOOK, $book->slug);
        Page::factory()->count($count)->sequence(fn ($s) => ['media_path' => "https://cdn.test/hank-{$s->index}.jpg"])->create(['book_id' => $book->id]);

        return $book;
    }

    public function test_the_cockroach_house_hangs_photos_from_hanks_book(): void
    {
        SiteSetting::updateOrCreate(['key' => ContentBlockService::SETTING], ['value' => true]);
        $book = $this->hankBook(0);
        $photo = Page::factory()->create(['book_id' => $book->id, 'media_path' => 'https://cdn.test/hank.png']);
        // Not a photo, not one anyone can see, not Hank's.
        Page::factory()->create(['book_id' => $book->id, 'media_path' => 'https://cdn.test/hank.mp4']);
        Page::factory()->create(['book_id' => $book->id, 'media_path' => 'https://cdn.test/hidden.jpg', 'blocked' => true]);
        Page::factory()->create(['media_path' => 'https://cdn.test/other.jpg']);

        $photos = $this->hankPhotos();

        // One photo, so the second frame is blank.
        $this->assertSame(
            [
                ['id' => 'hank-left', 'x' => 400, 'y' => 150, 'image' => ['w' => 110, 'h' => 150, 'frame' => 'ornate', 'src' => $photo->media_path]],
                ['id' => 'hank-right', 'x' => 1350, 'y' => 150, 'image' => ['w' => 110, 'h' => 150, 'frame' => 'ornate']],
            ],
            $photos,
        );
    }

    public function test_frames_sharing_a_book_get_different_photos(): void
    {
        $this->hankBook(10);

        $srcs = array_column(array_column($this->hankPhotos(), 'image'), 'src');

        $this->assertCount(2, $srcs);
        $this->assertCount(2, array_unique($srcs));
    }

    public function test_frames_hang_blank_without_hanks_photos(): void
    {
        $blank = fn () => array_map(fn ($photo) => isset($photo['image']['src']), $this->hankPhotos());
        $this->assertSame([false, false], $blank());

        $this->hankBook(0);

        $this->assertSame([false, false], $blank());
    }

    public function test_hanks_photos_stay_all_day_and_change_the_next(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 10, 11, 9, 0, 0, config('app.local_timezone')));
        $this->hankBook(20);
        $photos = $this->hankPhotos();

        Carbon::setTestNow(Carbon::create(2026, 10, 11, 23, 30, 0, config('app.local_timezone')));
        $this->assertSame([], $this->pickQueries(fn () => $this->assertSame($photos, $this->hankPhotos())));

        // After midnight, a fresh pick.
        Carbon::setTestNow(Carbon::create(2026, 10, 12, 0, 30, 0, config('app.local_timezone')));
        $this->assertNotEmpty(preg_grep('/book_id/', $this->pickQueries(fn () => $this->hankPhotos())));
    }

    public function test_a_photo_blocked_or_deleted_during_the_day_stays_up_till_the_next_pick(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 10, 11, 9, 0, 0, config('app.local_timezone')));
        SiteSetting::updateOrCreate(['key' => ContentBlockService::SETTING], ['value' => true]);
        $this->hankBook(2);
        $src = fn () => array_column(array_column($this->hankPhotos(), 'image'), 'src');
        [$first, $second] = $src();

        Page::where('media_path', $first)->update(['blocked' => true]);
        Page::where('media_path', $second)->delete();
        $this->assertSame([$first, $second], $src());

        // The next day's frames are blank.
        Carbon::setTestNow(Carbon::create(2026, 10, 12, 9, 0, 0, config('app.local_timezone')));
        $this->assertSame([], $src());
    }

    /** How wide `$item` is drawn: its model's footprint
     * (GamesWorld::MODEL_FOOTPRINTS), or as wide as it's tall. */
    private function modelWidth(array $item): float
    {
        return $item['size'] * (GamesWorld::MODEL_FOOTPRINTS[$item['model'] ?? '']['w'] ?? 1);
    }

    /** How far up `$room`'s back wall the season's decorations reach down
     * to: they hang from 0.84 up it, the biggest 90 tall
     * (three/roomLooks.js). */
    private function decorationsBottom(array $room): float
    {
        return $room['frame'] / 2 * 0.84 - 45;
    }

    /** Where `$thing` is against a wall of a room `$size` across, as
     * views.js toView() turns a point: [wall, along it left to right as you
     * face it, the wall's length]. The wall it names, or the back if none;
     * null if it stands out from that wall in the room. GamesWorld::onWall()
     * undone, so the two change together. */
    private function againstWall(array $thing, array $size): ?array
    {
        [$wall, $along, $out, $length] = $this->wallSpot($thing, $size);

        return $out == 0 ? [$wall, $along, $length] : null;
    }

    /** Where `$thing` is from the wall it names (the back if none) in a
     * room `$size` across: [wall, along it as you face it, out from it,
     * the wall's length]. */
    private function wallSpot(array $thing, array $size): array
    {
        $wall = in_array($thing['wall'] ?? null, GamesWorld::ROOM_WALLS, true) ? $thing['wall'] : 'back';
        $x = $thing['x'];
        $z = $thing['z'] ?? 0;

        return [$wall, ...match ($wall) {
            'back' => [$x, $z, $size['w']],
            'right' => [$z, $size['w'] - $x, $size['d']],
            'front' => [$size['w'] - $x, $size['d'] - $z, $size['w']],
            'left' => [$size['d'] - $z, $x, $size['d']],
        }];
    }

    /** How wide `$item` is along its wall: a door's frame, a picture or
     * TV's panel, a flight of stairs' run, a built-in's width, or its size (its model's
     * footprint; roomLayout.js ROOM_SIZES.toy, 80, if it says none). */
    private function widthOnWall(array $item): float
    {
        return match (true) {
            isset($item['stairs']) => 300,
            ($item['open'] ?? false) => 180,
            ($item['type'] ?? null) === 'door' => 120,
            isset($item['image']) => $item['image']['w'],
            isset($item['screen']) => $item['screen']['w'],
            // Built in: an entertainment center, a counter, a fireplace.
            isset($item['w']) => $item['w'],
            default => $this->modelWidth($item + ['size' => 80]),
        };
    }

    public function test_on_wall_turns_a_thing_onto_each_wall_as_views_js_does(): void
    {
        $onWall = new \ReflectionMethod(GamesWorld::class, 'onWall');
        $size = ['w' => 1300, 'd' => 500];
        $clock = ['id' => 'clock', 'x' => 200, 'y' => 250];

        // Along each wall left to right as you face it, flat against it.
        $expected = [
            'back' => ['x' => 200, 'z' => 0],
            'right' => ['x' => 1300, 'z' => 200],
            'front' => ['x' => 1100, 'z' => 500],
            'left' => ['x' => 0, 'z' => 300],
        ];
        foreach ($expected as $wall => $at) {
            $moved = $onWall->invoke(null, $wall, $size, $clock);
            $this->assertSame([...$clock, ...$at, ...($wall === 'back' ? [] : ['wall' => $wall])], $moved, $wall);
            $this->assertSame([$wall, 200, $wall === 'left' || $wall === 'right' ? 500 : 1300], $this->againstWall($moved, $size), $wall);
        }

        // Out from the wall into the room.
        $this->assertSame(1260, $onWall->invoke(null, 'right', $size, ['x' => 200, 'z' => 40])['x']);
        $this->assertSame(460, $onWall->invoke(null, 'front', $size, ['x' => 200, 'z' => 40])['z']);

        // Off the back wall it needs the room's size.
        $this->expectException(\InvalidArgumentException::class);
        $onWall->invoke(null, 'left', [], $clock);
    }

    public function test_everything_against_a_wall_fits_along_it(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            if ($scene['kind'] !== 'room') {
                continue;
            }
            foreach ([...$scene['interactables'], ...($scene['photos'] ?? [])] as $thing) {
                $on = $this->againstWall($thing, $scene['size']);
                if ($on === null) {
                    continue;
                }
                [$wall, $along, $length] = $on;
                $half = $this->widthOnWall($thing) / 2;
                $where = "{$sceneId}.{$thing['id']} on the {$wall} wall";
                $this->assertGreaterThanOrEqual($half, $along, $where);
                $this->assertLessThanOrEqual($length - $half, $along, $where);
            }
        }
    }

    /** Asserts room `$sceneId`'s photos hang inside the wall each is on,
     * under the season's decorations, and clear of everything else on it
     * (doors with their EXIT signs, stairs, pictures and props). */
    /** `$thing`'s box on its wall in a room `$size` across, as [wall,
     * left, right, bottom, top, the wall's length] along it, or null for
     * one standing out in the room. A door reaches up to its EXIT sign or
     * name, stairs all the way up, a picture or photo its frame's moulding
     * and all, a built-in its height, anything else its size. */
    private function wallBox(array $thing, array $size): ?array
    {
        $on = $this->againstWall($thing, $size);
        if ($on === null) {
            return null;
        }
        $border = isset($thing['image']) ? GamesWorld::PICTURE_FRAMES[$thing['image']['frame'] ?? ''] ?? 0 : 0;
        $half = $this->widthOnWall($thing) / 2 + $border;
        $y = $thing['y'] ?? 0;
        [$bottom, $top] = match (true) {
            isset($thing['stairs']) => [0, PHP_INT_MAX],
            ($thing['type'] ?? null) === 'door' => [0, 300],
            isset($thing['image']) => [$y - $border, $y + $thing['image']['h'] + $border],
            isset($thing['screen']) => [$y, $y + $thing['screen']['h']],
            // A counter's cabinets hang over it, up the same wall.
            isset($thing['upper']) => [0, $thing['upper']['y'] + $thing['upper']['h']],
            isset($thing['w'], $thing['h']) => [0, $thing['h']],
            default => [$y, $y + ($thing['size'] ?? 80)],
        };

        return [$on[0], $on[1] - $half, $on[1] + $half, $bottom, $top, $on[2]];
    }

    /** Whether wall boxes `$a` and `$b` (wallBox()) don't overlap. */
    private function apart(array $a, array $b): bool
    {
        return $a[0] !== $b[0] || $a[2] <= $b[1] || $a[1] >= $b[2] || $a[4] <= $b[3] || $a[3] >= $b[4];
    }

    /** Everything against a wall of `$room`, by id: interactables, photos
     * and built-ins (entertainment centers, counters, fireplaces), each
     * as its wallBox(). */
    private function wallBoxes(array $room): Collection
    {
        $builtIns = collect(['entertainment', 'counters', 'fireplaces'])
            ->flatMap(fn ($kind) => collect($room[$kind] ?? [])->map(fn ($unit, $n) => ['id' => "{$kind}-{$n}", ...$unit]));
        $things = collect([...$room['interactables'], ...($room['photos'] ?? []), ...$builtIns]);
        // Ids are unique, so nothing is lost keying by them.
        $this->assertSame($things->count(), $things->pluck('id')->unique()->count(), $room['label']);

        return $things->keyBy('id')
            ->map(fn ($thing) => $this->wallBox($thing, $room['size']))
            ->filter();
    }

    /** The walls in the order a camera turns right through them
     * (views.js WALLS): each one's right end meets the next one's left. */
    private const TURN_ORDER = ['back', 'right', 'front', 'left'];

    /** How far from a corner two things on the walls either side of it
     * must not both reach. */
    private const CORNER = 60;

    public function test_nothing_against_a_wall_overlaps_anything_else_on_it(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $room) {
            if ($room['kind'] !== 'room') {
                continue;
            }
            $boxes = $this->wallBoxes($room);
            foreach ($boxes as $id => $box) {
                foreach ($boxes as $other => $otherBox) {
                    $this->assertTrue($id === $other || $this->apart($box, $otherBox), "{$sceneId}: {$id} overlaps {$other} on the {$box[0]} wall");
                    // Nor crowd a corner from the wall round it: facing a
                    // wall, its right end meets the next wall's left end
                    // (back, right, front, left).
                    if (self::TURN_ORDER[(array_search($box[0], self::TURN_ORDER, true) + 1) % 4] === $otherBox[0]) {
                        $high = $box[3] < $otherBox[4] && $otherBox[3] < $box[4];
                        $this->assertFalse(
                            $high && $box[5] - $box[2] < self::CORNER && $otherBox[1] < self::CORNER,
                            "{$sceneId}: {$id} and {$other} crowd the corner between the {$box[0]} and {$otherBox[0]} walls",
                        );
                    }
                }
            }
        }
    }

    /** Asserts room `$sceneId`'s photos hang on a wall, inside it, under
     * the season's decorations, and clear of everything else on it. */
    private function assertPhotosHangClear(string $sceneId): void
    {
        $room = GamesWorld::definitions()[$sceneId];
        $decorations = $this->decorationsBottom($room);
        $boxes = $this->wallBoxes($room);

        foreach ($room['photos'] as $photo) {
            $box = $boxes[$photo['id']] ?? null;
            $this->assertNotNull($box, "{$photo['id']} hangs on a wall");
            [, $left, $right, , $top, $length] = $box;
            $this->assertGreaterThan(0, $left, $photo['id']);
            $this->assertLessThan($length, $right, $photo['id']);
            $this->assertLessThan($decorations, $top, $photo['id']);
            foreach ($boxes as $other => $otherBox) {
                $this->assertTrue($photo['id'] === $other || $this->apart($box, $otherBox), "{$photo['id']} overlaps {$other}");
            }
        }
    }

    public function test_hanks_photos_hang_clear_of_the_door_its_exit_sign_sconces_portrait_and_scroll(): void
    {
        $room = GamesWorld::definitions()['cockroach-house.hall'];

        $this->assertCount(2, $room['photos']);
        foreach ($room['photos'] as $photo) {
            $this->assertSame(['book' => GamesWorld::HANK_BOOK], $photo['from']);
            $this->assertSame('ornate', $photo['image']['frame']);
        }
        $this->assertPhotosHangClear('cockroach-house.hall');
    }

    public function test_gusters_photos_hang_clear_of_his_door_washer_lamp_and_slot_machine(): void
    {
        $room = GamesWorld::definitions()['guster-house.hall'];

        $this->assertCount(4, $room['photos']);
        foreach ($room['photos'] as $photo) {
            $this->assertSame(['search' => GamesWorld::GUSTER_SEARCH], $photo['from']);
        }
        $this->assertPhotosHangClear('guster-house.hall');
    }

    /** Guster's House's photos' pictures, as the page gets them. */
    private function gusterPhotos(): array
    {
        return array_values(array_filter(array_map(
            fn ($photo) => $photo['image']['src'] ?? null,
            GamesWorld::scenes()['guster-house.hall']['photos'],
        )));
    }

    public function test_gusters_house_hangs_photos_of_pages_that_mention_him(): void
    {
        SiteSetting::updateOrCreate(['key' => ContentBlockService::SETTING], ['value' => true]);
        $said = Page::factory()->create(['content' => '<p>Big GUSTER nap</p>', 'media_path' => 'https://cdn.test/nap.jpg']);
        $book = Book::factory()->create(['title' => 'Guster at the beach']);
        $titled = Page::factory()->create(['book_id' => $book->id, 'content' => 'Sand', 'media_path' => 'https://cdn.test/sand.webp']);
        // Not a photo, not one anyone can see, not about him.
        Page::factory()->create(['content' => 'Guster video', 'media_path' => 'https://cdn.test/guster.mp4']);
        Page::factory()->create(['content' => 'Guster hiding', 'media_path' => 'https://cdn.test/hidden.jpg', 'blocked' => true]);
        Page::factory()->create(['content' => 'The cockroach', 'media_path' => 'https://cdn.test/other.jpg']);

        // Two photos for four frames: the rest hang blank.
        $this->assertEqualsCanonicalizing([$said->media_path, $titled->media_path], $this->gusterPhotos());
    }

    public function test_forgetting_the_photo_picks_lets_new_photos_hang_the_same_day(): void
    {
        $this->assertSame([], $this->gusterPhotos());
        Page::factory()->create(['content' => 'Guster', 'media_path' => 'https://cdn.test/guster.jpg']);
        $this->assertSame([], $this->gusterPhotos());

        GamesWorld::forgetPhotoPicks();

        $this->assertSame(['https://cdn.test/guster.jpg'], $this->gusterPhotos());
    }

    public function test_gusters_photos_stay_all_day_and_change_the_next(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 10, 11, 9, 0, 0, config('app.local_timezone')));
        Page::factory()->count(20)->sequence(fn ($s) => ['media_path' => "https://cdn.test/guster-{$s->index}.jpg"])->create(['content' => 'Guster']);
        $photos = $this->gusterPhotos();
        $this->assertCount(4, $photos);
        $this->assertCount(4, array_unique($photos));

        // A second visit that day runs no query for them.
        Carbon::setTestNow(Carbon::create(2026, 10, 11, 23, 30, 0, config('app.local_timezone')));
        $this->assertSame([], $this->pickQueries(fn () => $this->assertSame($photos, $this->gusterPhotos())));

        // After midnight, a fresh pick.
        Carbon::setTestNow(Carbon::create(2026, 10, 12, 0, 30, 0, config('app.local_timezone')));
        $this->assertNotEmpty(preg_grep('/content/', $this->pickQueries(fn () => $this->gusterPhotos())));
    }

    public function test_guster_toots_the_sounds_named_after_him(): void
    {
        $eek = Sound::factory()->create(['title' => 'Guster eek', 'audio_path' => 'sounds/eek.m4a']);
        $sigh = Sound::factory()->create(['title' => 'big GUSTER sigh', 'audio_path' => 'sounds/sigh.m4a']);
        // His voice even blocked on the Sounds page.
        $burp = Sound::factory()->create(['title' => 'Guster burp', 'audio_path' => 'sounds/burp.m4a', 'blocked' => true]);
        // Not his, nor one whose upload never finished.
        Sound::factory()->create(['title' => 'Cockroach hiss']);
        Sound::factory()->create(['title' => 'Guster hum', 'audio_path' => '']);

        $sounds = GamesWorld::castSounds();

        // The URLs Sound gives their keys.
        $this->assertSame(['guster' => [$eek->audio_path, $sigh->audio_path, $burp->audio_path]], $sounds);
        $this->assertStringEndsWith('sounds/eek.m4a', $sounds['guster'][0]);
        $this->assertNotSame('sounds/eek.m4a', $sounds['guster'][0]);
    }

    public function test_gusters_hello_is_not_one_of_his_toots(): void
    {
        $eek = Sound::factory()->create(['title' => 'Guster eek', 'audio_path' => 'sounds/eek.m4a']);
        Sound::factory()->create(['title' => 'guster hello', 'audio_path' => GamesWorld::GUSTER_HELLO]);
        Sound::factory()->create(['title' => 'guster hello', 'audio_path' => 'https://cdn.example.com/'.GamesWorld::GUSTER_HELLO]);

        $this->assertSame(['guster' => [$eek->audio_path]], GamesWorld::castSounds());
    }

    public function test_guster_has_only_so_many_sounds(): void
    {
        Sound::factory()->count(GamesWorld::CAST_SOUNDS_MAX + 2)->create(['title' => 'Guster']);

        $this->assertCount(GamesWorld::CAST_SOUNDS_MAX, GamesWorld::castSounds()['guster']);
    }

    public function test_guster_has_no_sounds_with_none_named_after_him(): void
    {
        Sound::factory()->create(['title' => 'Fanfare']);

        $this->assertSame(['guster' => []], GamesWorld::castSounds());
    }

    public function test_gusters_sounds_are_looked_up_once_a_day(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 10, 12, 9, 0, 0, config('app.local_timezone')));
        $sound = Sound::factory()->create(['title' => 'Guster eek']);
        $sounds = GamesWorld::castSounds();
        $this->assertCount(1, $sounds['guster']);

        // Deleted later that day, it plays on from the cache: a second
        // visit runs no query for his sounds.
        $sound->delete();
        $this->assertSame([], $this->pickQueries(fn () => $this->assertSame($sounds, GamesWorld::castSounds())));

        // The next day's pick leaves it out.
        Carbon::setTestNow(Carbon::create(2026, 10, 13, 9, 0, 0, config('app.local_timezone')));
        $this->assertNotEmpty($this->pickQueries(fn () => $this->assertSame(['guster' => []], GamesWorld::castSounds())));
    }
}
