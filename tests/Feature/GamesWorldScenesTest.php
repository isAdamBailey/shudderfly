<?php

namespace Tests\Feature;

use App\Http\Controllers\BookController;
use App\Http\Controllers\GameController;
use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Models\SiteSetting;
use App\Models\Song;
use App\Services\ContentBlockService;
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

    public function test_minigames_are_known_and_explained(): void
    {
        $found = 0;
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach (collect($scene['interactables'])->where('type', 'minigame') as $item) {
                $where = "{$sceneId}.{$item['id']}";
                $this->assertSame('room', $scene['kind'], $where);
                $this->assertContains($item['minigame'], GamesWorld::MINIGAMES, $where);
                $this->assertArrayHasKey('line', $item, $where);
                $found++;
            }
        }
        $this->assertGreaterThan(0, $found);
    }

    public function test_the_poops_house_has_toot_catch(): void
    {
        $catch = collect(GamesWorld::scenes()['poop-house.hall']['interactables'])->firstWhere('type', 'minigame');

        $this->assertSame('toot-catch', $catch['minigame']);
        $this->assertSame('Toot Catch', $catch['label']);
        $this->assertSame(__('messages.games.world.minigames.toot_catch_line'), $catch['line']);
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

    public function test_the_library_has_a_room_per_category_over_its_floors(): void
    {
        $scenes = GamesWorld::definitions();
        $doors = fn (string $id) => collect($scenes[$id]['interactables'])->pluck('to', 'id')->all();
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
        $this->assertSame(900, $room('people')['frame']);
        // A short shelf keeps a room's usual width.
        $this->assertSame(900, $room('shows')['size']['w']);
        $this->assertArrayNotHasKey('frame', $room('shows'));
    }

    public function test_the_far_door_stands_clear_of_the_shelves(): void
    {
        foreach (GamesWorld::definitions() as $sceneId => $scene) {
            foreach ($scene['shelves'] ?? [] as $shelf) {
                $end = $shelf['x'] + (int) ceil($shelf['count'] / $shelf['rows']) * $shelf['span'];
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

        $this->assertSame(['front-door'], array_column($scenes['library.hall']['interactables'], 'id'));
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
        $end = $last['x'] + (int) ceil($last['count'] / GamesWorld::LIBRARY_SHELF_ROWS) * GamesWorld::LIBRARY_BOOK_SPAN;
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

        Page::factory()->count(GamesWorld::TV_CHANNELS + 2)->create(['media_path' => 'https://cdn.test/v.mp4', 'media_poster' => 'https://cdn.test/v.jpg']);

        $this->assertCount(GamesWorld::TV_CHANNELS, $this->tv()['channels']);
    }

    private function radio(): array
    {
        return collect(GamesWorld::scenes()['house.kitchen']['interactables'])->firstWhere('type', 'radio');
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

        $this->assertCount(GamesWorld::RADIO_STATIONS, $this->radio()['songs']);
    }

    public function test_the_radio_is_silent_while_the_music_is_off(): void
    {
        Song::factory()->create();
        SiteSetting::updateOrCreate(['key' => 'music_enabled'], ['value' => false]);

        $this->assertSame([], $this->radio()['songs']);
    }
}
