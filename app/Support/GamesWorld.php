<?php

namespace App\Support;

use App\Http\Controllers\BookController;
use App\Http\Controllers\GameController;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Models\SiteSetting;
use App\Models\Song;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * The Games World scene registry: every place in the world (the road, and
 * later the rooms of a house) and the interactables in it. See issue #130.
 *
 * definitions() is the raw registry, with games by slug only, so tests can
 * validate it. scenes() is what the page receives: each `game` interactable
 * given its name and its confirm card from GameController::games(), so
 * nothing about a game is written down twice.
 */
final class GamesWorld
{
    /** The two sides of the road a road interactable can stand on. */
    public const ROAD_SIDES = ['far', 'near'];

    /** Library category rooms per landing. */
    public const LIBRARY_ROOMS_PER_FLOOR = 4;

    /** A category room's shelves: rows of books, how far apart along the
     * back wall (world units), and where they start (past the door). */
    public const LIBRARY_SHELF_ROWS = 3;

    public const LIBRARY_BOOK_SPAN = 110;

    public const LIBRARY_SHELVES_FROM = 260;

    /** The most books a shelf in the Library's hall holds (its Popular,
     * Forgotten and seasonal shelves): three columns, within one page of
     * books.category. */
    public const LIBRARY_HALL_SHELF = 9;

    /** The most lamps (point lights) a room may have: each one costs every
     * lit material in it. Every room has at least one, so night isn't dark. */
    public const ROOM_LIGHTS_MAX = 4;

    /** A Library room's reading lamps: about one for this much shelf, up
     * to ROOM_LIGHTS_MAX, hung this high and this far out from the wall. A
     * ceiling light hangs further out, over the middle of the floor. */
    private const LIBRARY_LAMP_SPACING = 600;

    private const LIBRARY_LAMP_Y = 440;

    private const LIBRARY_LAMP_Z = 140;

    private const LIBRARY_CEILING_Z = 250;

    /** How many of the family's videos a TV flicks between, picked once a
     * day (pickedToday()). */
    public const TV_CHANNELS = 6;

    /** How many songs a radio turns through, picked once a day
     * (pickedToday()). */
    public const RADIO_STATIONS = 6;

    /** An entertainment center's size in world units (scenes/
     * entertainmentCenter.js draws it): `w` along the wall, `h` to its top,
     * where a radio stands, `d` deep: its knobs stay clear of where the
     * Butt walks (useRoom.js MARGIN). */
    public const ENTERTAINMENT_CENTER = ['w' => 380, 'h' => 120, 'd' => 36];

    /** The Cockroach's fireplace (scenes/fireplace.js draws it), its size in
     * world units: `w` along the wall, `h` to its mantel, where Hank's
     * portrait stands, `d` deep. */
    public const FIREPLACE = ['w' => 440, 'h' => 200, 'd' => 50];

    /** Where the fire burns in that fireplace: `y` up off the hearth, `z`
     * out from the wall. */
    private const HEARTH_FIRE = ['y' => 6, 'z' => 20];

    /** How high up the wall the Cockroach's candle sconces hang. */
    private const SCONCE_Y = 270;

    /** The walls of a room a door can sit on. `back` is the far wall, facing
     * the open front; `left` and `right` are the ends. */
    public const ROOM_WALLS = ['back', 'left', 'right'];

    /** A room's looks, by name: `walls.back` (and `walls.sides`) from WALLS,
     * `walls.floor` from FLOORS. three/roomLooks.js draws each one (a Vitest
     * test keeps the lists in step). */
    public const WALLS = ['wallpaper-stripes', 'wallpaper-dots', 'tiles', 'brick', 'plaster', 'stone'];

    public const FLOORS = ['wood', 'lino', 'tiles', 'carpet', 'concrete', 'flagstones'];

    /** Named sounds a toy's `sound` may use: sounds.js (a Vitest test keeps
     * them in step). */
    public const SOUNDS = ['hiss', 'tick', 'bell', 'chomp', 'bonk', 'whoosh', 'pop', 'thud', 'fanfare'];

    /** The minigames a `minigame` interactable may start:
     * World/minigames/index.js (a Vitest test keeps them in step). */
    public const MINIGAMES = ['toot-catch'];

    /** Clock faces a hall clock may wear: three/clockFaces.js (a Vitest test
     * keeps them in step). */
    public const CLOCKS = ['round', 'school', 'octagon', 'cuckoo', 'sunburst', 'arch', 'hex', 'banjo'];

    /** A pipe organ's keyboard zones, deepest first: each is a button of
     * its own, named `toys.organ_<zone>` (scenes/organLayout.js draws as
     * many). */
    public const ORGAN_ZONES = ['deep', 'low', 'high', 'squeaky'];

    /** Props modelled in 3D that an interactable's `model` may name:
     * three/models.js (a Vitest test keeps them in step). */
    public const MODELS = ['radio', 'table-lamp'];

    /** The moves a toy may play: CAST_MOVES in characters.js (a Vitest test
     * keeps them in step). A prop can play any; a cast member only its own. */
    public const MOVES = [
        'idle', 'excited', 'hop', 'walk', 'wiggle', 'toot', 'thrown', 'eat',
        'bounce', 'flush', 'gulp', 'scuttle', 'hiss', 'wobble', 'chomp',
    ];

    /** An interactable's fields that are lang keys in definitions() and
     * visible text in scenes() (games are named by GameController::games()),
     * as is a scene's `label`. A field may take `<field>Args` to fill it in. */
    public const TRANSLATED = ['label', 'line'];

    /** Ids of the cast registry, CAST in resources/js/constants/characters.js
     * (a Vitest test keeps the two in step). Scenes name characters by these
     * ids, never by emoji. */
    public const CAST = [
        'butt', 'poop', 'toilet', 'cockroach', 'pizza', 'face',
        'blueberries', 'grapes', 'strawberry', 'taco', 'apple', 'sprout',
    ];

    /**
     * The raw registry. Visible text is a lang key here (`label`); scenes()
     * translates it. A `door` leads `to` a scene and puts the Butt at
     * `toSpot`, the id of an interactable there (the door back, usually).
     * Every room has one door marked `exit`: its way out, which Escape takes
     * when there's no way back to retrace (a reload, a shared link).
     *
     * Every game in GameController::games() is placed exactly once, on the
     * road or in a room.
     */
    public static function definitions(): array
    {
        // The hall runs long. `frame` is the width the camera shows, and the
        // walls stay as tall as that; the rest of the hall is off-screen
        // until the Butt walks there. The front door is in that first view.
        $hallW = 3200;
        $entry = intdiv($hallW, 2);
        // Where the radio stands on its entertainment center.
        $den = 2500;
        // The table lamp beside the radio.
        $tableLamp = $den - 120;
        // The Cockroach's fireplace, and its candles: where each burns
        // ([x, z], up the wall at SCONCE_Y).
        $nestW = 1000;
        $hearth = 500;
        $sconces = ['sconce-left' => [250, 0], 'sconce-right' => [780, 0], 'sconce-side' => [20, 260]];

        return [
            'road' => [
                'kind' => 'road',
                'label' => 'messages.games.world.places.street',
                'interactables' => [
                    // The buildings you can go into. The road keeps a gap (600
                    // on the far side) for another.
                    self::roadDoor('house', 1050, 'near', '🏠', 'house', 'house.hall'),
                    self::roadDoor('library', 1500, 'far', '📚', 'library', 'library.hall'),
                    self::roadDoor('poop-house', 2400, 'far', '🏡', 'poop_house', 'poop-house.hall'),
                    self::roadDoor('cockroach-house', 3300, 'far', '🪳', 'cockroach_house', 'cockroach-house.hall'),
                ],
            ],

            // --- The Butt's House ---------------------------------------------
            'house.hall' => self::room('house_hall', [
                // Floor size in world units: x across, z from the back wall
                // to the open front. `frame` is how much of x the camera shows.
                'size' => ['w' => $hallW, 'd' => 500],
                'frame' => 900,
                'spawn' => ['x' => $entry, 'z' => 330],
                'walls' => ['back' => 'wallpaper-stripes', 'floor' => 'wood'],
                // Under the clocks past the front door, with the radio on it.
                'entertainment' => [self::entertainmentCenter($den)],
                // A dim hall: low daylight, a lamp you can switch, and the
                // table lamp by the radio (its light hangs in its shade).
                'ambient' => 0.35,
                'lights' => [
                    ['id' => 'lamp', 'x' => $entry + 300, 'z' => 240, 'y' => 200, 'color' => '#fbbf24', 'intensity' => 1.4],
                    // Hung in the lamp's shade by the room (RoomScene.js), wherever this says.
                    ['id' => 'table-lamp', 'x' => $tableLamp, 'z' => 16, 'y' => 190, 'color' => '#ffd58a', 'intensity' => 1.1],
                ],
            ], [
                // Every door on the back wall, facing the camera, so a phone
                // can read and reach them: the bedroom at the left end, the
                // kitchen just along from the front door, the bathroom at
                // the right end.
                self::roomDoor('bedroom-door', 160, 'house.bedroom', 'hall-door', 'house_bedroom'),
                self::roomDoor('kitchen-door', 1320, 'house.kitchen', 'hall-door', 'house_kitchen'),
                self::roomDoor('front-door', $entry, 'road', 'house', exit: true),
                // A toy plays `move`, toots as `toot` (a cast id), says `line`
                // and switches `light`, whichever it has. `y` lifts one off the
                // floor (onto a wall).
                self::toy('doorbell', $entry + 160, 0, '🔔', 'doorbell', ['y' => 120, 'size' => 50, 'move' => 'wiggle', 'toot' => 'butt', 'line' => true]),
                // Clocks along the back wall, each a different shape: three
                // between the bedroom and the kitchen, the rest past the
                // front door, the cuckoo first. Every other one chimes, the
                // others tick.
                self::clock(1, 440, 'school', 'tick', 250),
                self::clock(2, 720, 'banjo', 'bell', 280),
                self::clock(3, 1000, 'hex', 'tick', 240),
                self::clock(4, 2000, 'cuckoo', 'bell', 270),
                self::clock(5, 2200, 'round', 'tick', 250),
                self::clock(6, 2400, 'sunburst', 'bell', 280),
                self::clock(7, 2600, 'octagon', 'tick', 240),
                self::clock(8, 2800, 'arch', 'bell', 270),
                self::radio('radio', $den, 16, self::ENTERTAINMENT_CENTER['h'], 120),
                self::toy('table-lamp', $tableLamp, 16, null, 'table_lamp', ['y' => self::ENTERTAINMENT_CENTER['h'], 'size' => 110, 'model' => 'table-lamp', 'move' => 'wiggle', 'light' => 'table-lamp']),
                self::roomDoor('bathroom-door', $hallW - 160, 'house.bathroom', 'hall-door', 'house_bathroom'),
                self::toy('lamp-switch', $entry + 300, 240, '💡', 'lamp', ['move' => 'bounce', 'light' => 'lamp']),
                self::resident('strawberry', $entry - 220, 280, ['move' => 'hop', 'toot' => 'strawberry']),
            ]),
            'house.kitchen' => self::room('house_kitchen', [
                'size' => ['w' => 900, 'd' => 500],
                'spawn' => ['x' => 450, 'z' => 330],
                'walls' => ['back' => 'tiles', 'sides' => 'wallpaper-dots', 'floor' => 'lino'],
                'ambient' => 0.8,
                'lights' => [self::lamp('lamp', 520, 300, 0)],
            ], [
                self::roomDoor('hall-door', 120, 'house.hall', 'kitchen-door', 'house_hall', exit: true),
                self::lampSwitch(520, 300),
                self::game('toot-foods', 360, 40, ['size' => 110, 'emoji' => '🍔']),
                self::game('costco-pizza-poop', 600, 180, ['size' => 100, 'cast' => 'pizza']),
                self::toy('sprout-pot', 200, 290, '🍲', 'sprout_pot', ['move' => 'wobble', 'toot' => 'sprout', 'line' => true]),
                // The fruit bowl: each toots at its own pitch.
                self::resident('grapes', 710, 320, ['size' => 60, 'move' => 'hop', 'toot' => 'grapes']),
                self::resident('apple', 820, 300, ['size' => 60, 'move' => 'hop', 'toot' => 'apple']),
                self::resident('blueberries', 770, 420, ['size' => 60, 'move' => 'hop', 'toot' => 'blueberries']),
            ]),
            'house.bathroom' => self::room('house_bathroom', [
                'size' => ['w' => 800, 'd' => 450],
                'spawn' => ['x' => 400, 'z' => 300],
                'walls' => ['back' => 'tiles', 'floor' => 'tiles'],
                'ambient' => 0.65,
                'lights' => [self::lamp('lamp', 250, 280, 0)],
            ], [
                self::roomDoor('hall-door', 100, 'house.hall', 'bathroom-door', 'house_hall', exit: true),
                self::lampSwitch(250, 280),
                self::toy('toilet-roll', 400, 0, '🧻', 'toilet_roll', ['y' => 140, 'size' => 50, 'move' => 'wobble', 'line' => true]),
                self::game('boom', 560, 40, ['size' => 110, 'cast' => 'toilet']),
                self::toy('plunger', 710, 140, '🪠', 'plunger', ['move' => 'bounce', 'line' => true]),
                self::toy('air-freshener', 250, 230, '🧴', 'air_freshener', ['move' => 'hop', 'line' => true]),
            ]),
            'house.bedroom' => self::room('house_bedroom', [
                'size' => ['w' => 900, 'd' => 500],
                'spawn' => ['x' => 450, 'z' => 330],
                'walls' => ['back' => 'wallpaper-dots', 'sides' => 'plaster', 'floor' => 'carpet'],
                // Night-time dark, but for a nightlight you can switch.
                'ambient' => 0.25,
                'lights' => [
                    ['id' => 'nightlight', 'x' => 820, 'z' => 30, 'y' => 80, 'color' => '#a5b4fc', 'intensity' => 1.2],
                ],
            ], [
                self::roomDoor('hall-door', 110, 'house.hall', 'bedroom-door', 'house_hall', exit: true),
                // The Face, sick in bed, with the TV on the wall to watch.
                self::tv('tv', 300, 230),
                self::game('sprout-pox', 440, 60, ['size' => 120, 'cast' => 'face']),
                self::toy('bed', 640, 130, '🛏️', 'bed', ['size' => 110, 'move' => 'bounce', 'toot' => 'butt', 'line' => true]),
                self::toy('nightlight', 820, 0, '🌙', 'nightlight', ['y' => 60, 'size' => 50, 'move' => 'wiggle', 'light' => 'nightlight']),
            ]),

            // --- The Library: a floor of rooms per few book categories ------------
            ...self::library(),

            // --- The Poop's House --------------------------------------------------
            'poop-house.hall' => self::room('poop_house_hall', [
                'size' => ['w' => 800, 'd' => 450],
                'spawn' => ['x' => 300, 'z' => 300],
                'walls' => ['back' => 'wallpaper-stripes', 'sides' => 'plaster', 'floor' => 'concrete'],
                'ambient' => 0.7,
                'lights' => [self::lamp('lamp', 600, 280, 0)],
            ], [
                self::roomDoor('front-door', 400, 'road', 'poop-house', exit: true),
                self::lampSwitch(600, 280),
                self::resident('poop', 620, 220, ['move' => 'bounce', 'toot' => 'poop']),
                // The Poop's game, played on the spot: catch the falling foods.
                self::minigame('toot-catch', 170, 180, '🧺'),
            ]),

            // --- The Cockroach's House: one dark room. Cockroach Fart and
            // Cockroach Fight stand on the floor. Little cockroaches crawl
            // the back wall, the same picture as the site header. Dark-ages
            // stone, lit only by flames: a fire in the hearth under Hank's
            // portrait, and candles in sconces either side of it (the right
            // one by the pipe organ that fills the right wall, well clear of
            // the way out) and on the left wall. Every flame flickers.
            'cockroach-house.hall' => self::room('cockroach_house_hall', [
                'size' => ['w' => $nestW, 'd' => 480],
                'spawn' => ['x' => 280, 'z' => 320],
                'walls' => ['back' => 'stone', 'sides' => 'stone', 'floor' => 'flagstones'],
                'crawlers' => true,
                'fireplaces' => [['x' => $hearth, ...self::FIREPLACE]],
                'ambient' => 0.2,
                'lights' => [
                    self::flame('fire', $hearth, self::HEARTH_FIRE['y'], self::HEARTH_FIRE['z'], '#f97316', 1.3),
                    ...array_map(
                        fn ($id, $at) => self::flame($id, $at[0], self::SCONCE_Y, $at[1], '#f59e0b', 1.1),
                        array_keys($sconces),
                        $sconces,
                    ),
                ],
            ], [
                self::roomDoor('front-door', 160, 'road', 'cockroach-house', exit: true),
                self::organ('organ', 200, $nestW),
                // Hank, remembered over the fire, and on a scroll beside it
                // that reads itself aloud.
                self::picture('portrait', $hearth, self::FIREPLACE['h'], '/img/cockroach.png', 372, 200, 'cockroach_portrait'),
                self::toy('tribute', 800, 0, '📜', 'tribute', ['y' => 110, 'size' => 70, 'move' => 'wiggle', 'line' => true]),
                self::toy('fire', $hearth, self::HEARTH_FIRE['z'], '🔥', 'fire', ['y' => self::HEARTH_FIRE['y'], 'size' => 96, 'move' => 'wiggle', 'light' => 'fire']),
                self::game('cockroach', 300, 180, ['size' => 110, 'cast' => 'cockroach']),
                self::game('cockroach-fight', 700, 260, ['size' => 110, 'cast' => 'cockroach']),
                // The side wall's faces the room just off it, as a card
                // turned to its wall would be seen edge on.
                ...array_map(
                    fn ($id, $at) => self::toy($id, $at[0], $at[1], '🕯️', 'sconce', ['y' => self::SCONCE_Y, 'size' => 50, 'move' => 'wiggle', 'light' => $id]),
                    array_keys($sconces),
                    $sconces,
                ),
            ]),
        ];
    }

    /**
     * The Library, built from the book categories so a new one gets a room
     * with no code change. The ground floor (`library.hall`) is off the
     * street; stairs climb to landings (`library.floor-2`, …) with a door
     * each to a few category rooms (`library.category-<id>`, by id so a
     * rename keeps saved places and links). A category room is as long as
     * its shelves: LIBRARY_SHELF_ROWS rows of books, LIBRARY_BOOK_SPAN apart,
     * from LIBRARY_SHELVES_FROM along the back wall.
     */
    private static function library(): array
    {
        $floors = Category::query()
            ->select(['id', 'name'])
            ->withCount('books')
            ->orderBy('name')
            ->get()
            ->chunk(self::LIBRARY_ROOMS_PER_FLOOR)
            ->values();
        // The ground floor is the first; landing $i is floor $i + 2.
        $floorId = fn (int $i) => $i < 0 ? 'library.hall' : 'library.floor-'.($i + 2);

        $roomW = 900;
        // A landing: a stairwell's width at each end, and a door's width
        // apart for each category door between them.
        $stairsEnd = 150;
        $doorGap = 240;
        $landingW = 2 * $stairsEnd + self::LIBRARY_ROOMS_PER_FLOOR * $doorGap;

        // The hall: the front door at the left end, then the special
        // shelves, then the stairs up at the right.
        $shelves = self::hallShelves();
        $hallW = max($roomW, (int) (collect($shelves)->max(fn ($shelf) => self::shelfEnd($shelf)) ?? 0) + 220);
        $hallLights = [
            self::ceilingLamp($hallW),
            ...($shelves ? self::readingLamps($shelves[0]['x'], self::shelfEnd(end($shelves)), self::ROOM_LIGHTS_MAX - 1) : []),
        ];
        $scenes = [
            'library.hall' => self::room('library_hall', [
                'size' => ['w' => $hallW, 'd' => 450],
                ...($hallW > $roomW ? ['frame' => $roomW] : []),
                'spawn' => ['x' => 300, 'z' => 300],
                'walls' => ['back' => 'brick', 'sides' => 'plaster', 'floor' => 'wood'],
                // Dim, so the lamps' light pools on the shelves.
                'ambient' => 0.4,
                'lights' => $hallLights,
                ...($shelves ? ['shelves' => $shelves] : []),
            ], [
                self::roomDoor('front-door', 110, 'road', 'library', exit: true),
                self::lightSwitch(220, $hallLights),
                ...($floors->isEmpty() ? [] : [self::stairs(true, $floorId(0), $hallW)]),
            ]),
        ];

        // A landing's pair of wall lamps, high between its outer doors.
        $landingLights = [
            self::lamp('wall-left', $stairsEnd + $doorGap, 390, 20, '💡'),
            self::lamp('wall-right', $landingW - $stairsEnd - $doorGap, 390, 20, '💡'),
        ];

        foreach ($floors as $i => $categories) {
            $landing = $floorId($i);
            $floor = ['number' => $i + 2];
            $scenes[$landing] = [
                ...self::room('library_floor', [
                    'size' => ['w' => $landingW, 'd' => 450],
                    // Shown at a room's usual scale, so the door titles
                    // have room: the ends scroll into view.
                    'frame' => $roomW,
                    'spawn' => ['x' => $landingW / 2, 'z' => 300],
                    'walls' => ['back' => 'wallpaper-stripes', 'sides' => 'plaster', 'floor' => 'carpet'],
                    'ambient' => 0.45,
                    'lights' => $landingLights,
                ], [
                    // Down the way you came on the left, up on the right.
                    self::stairs(false, $floorId($i - 1)),
                    self::lightSwitch(intdiv($landingW, 2), $landingLights),
                    ...$categories->values()->map(fn ($category, $n) => [
                        ...self::roomDoor(
                            "category-{$category->id}",
                            $stairsEnd + intdiv($doorGap, 2) + $n * $doorGap,
                            "library.category-{$category->id}",
                            'landing-door',
                            key: 'messages.games.world.doors.library_category',
                        ),
                        // The Library's rooms open onto each other: a wide
                        // doorway, not a door (doorway.js).
                        'open' => true,
                        'labelArgs' => self::categoryName($category),
                    ])->all(),
                    ...($i < $floors->count() - 1 ? [self::stairs(true, $floorId($i + 1), $landingW)] : []),
                ]),
                'labelArgs' => $floor,
            ];

            foreach ($categories as $category) {
                $shelf = self::shelf('books', $category->name, $category->books_count, self::LIBRARY_SHELVES_FROM);
                // Past the shelves, room for a second doorway back out.
                $width = max($roomW, self::shelfEnd($shelf) + 270);
                // Reading lamps along the shelves; an emptied category's
                // bare room has a ceiling light.
                $lights = $category->books_count > 0
                    ? self::readingLamps($shelf['x'], self::shelfEnd($shelf), self::ROOM_LIGHTS_MAX)
                    : [self::ceilingLamp($width)];
                $scenes["library.category-{$category->id}"] = [
                    ...self::room('library_category', [
                        'size' => ['w' => $width, 'd' => 450],
                        ...($width > $roomW ? ['frame' => $roomW] : []),
                        'spawn' => ['x' => 300, 'z' => 300],
                        'walls' => ['back' => 'wallpaper-dots', 'sides' => 'plaster', 'floor' => 'wood'],
                        // Dim, so the lamps' light pools on the shelves.
                        'ambient' => 0.4,
                        'lights' => $lights,
                        // An emptied category (its books cleaned up) is a bare room.
                        ...($category->books_count > 0 ? ['shelves' => [$shelf]] : []),
                    ], [
                        [
                            ...self::roomDoor('landing-door', 130, $landing, "category-{$category->id}", 'library_floor', exit: true),
                            'open' => true,
                            'labelArgs' => $floor,
                        ],
                        self::lightSwitch(220, $lights),
                        // The same way out at the far end of the shelves,
                        // so a long room needn't be walked back.
                        [
                            ...self::roomDoor('far-door', $width - 130, $landing, "category-{$category->id}", 'library_floor'),
                            'open' => true,
                            // Its EXIT sign says it all (exitSign.js).
                            'titled' => false,
                            'labelArgs' => $floor,
                        ],
                    ]),
                    'labelArgs' => self::categoryName($category),
                ];
            }
        }

        return $scenes;
    }

    /** The Library hall's shelves, as the Books page has them: the
     * forgotten books, the favourites and, when one is on, the season's or
     * the month's. Each holds up to LIBRARY_HALL_SHELF; an empty one isn't
     * put up. */
    private static function hallShelves(): array
    {
        $all = Book::count();
        $theme = HandleInertiaRequests::getCurrentTheme();
        $seasonal = match (true) {
            $theme !== '' => [
                'themed',
                ThemeBooks::count($theme),
                "messages.games.world.shelves.{$theme}",
                [],
            ],
            MonthBooks::isActive() => [
                'month',
                MonthBooks::getBookIds()->count(),
                'messages.books.month_books',
                ['month' => MonthBooks::monthName()],
            ],
            default => null,
        };
        $lists = [
            ['forgotten', $all, 'messages.games.world.shelves.forgotten', []],
            ['popular', $all, 'messages.games.world.shelves.popular', []],
            ...($seasonal ? [$seasonal] : []),
        ];

        $shelves = [];
        $from = self::LIBRARY_SHELVES_FROM;
        foreach ($lists as [$category, $count, $label, $args]) {
            if ($count === 0) {
                continue;
            }
            $shelf = [
                ...self::shelf($category, $category, min($count, self::LIBRARY_HALL_SHELF), $from),
                'label' => $label,
                ...($args ? ['labelArgs' => $args] : []),
            ];
            $shelves[] = $shelf;
            $from = self::shelfEnd($shelf) + 80;
        }

        return $shelves;
    }

    /** A bookcase on a room's back wall, from x `from`: `count` books of
     * the Books pages' list `category` (books.category, `perPage` a page),
     * `rows` high and a book every `span` along. The client fetches the
     * books as they come into view; scenes/bookshelf.js lays them out the
     * same way (shelfEnd()). */
    private static function shelf(string $id, string $category, int $count, int $from): array
    {
        return [
            'id' => $id,
            'category' => $category,
            'count' => $count,
            'x' => $from,
            'rows' => self::LIBRARY_SHELF_ROWS,
            'span' => self::LIBRARY_BOOK_SPAN,
            'perPage' => BookController::PER_PAGE,
        ];
    }

    /** Where `shelf` ends along the back wall (as bookshelf.js shelfEnd()). */
    private static function shelfEnd(array $shelf): int
    {
        return $shelf['x'] + (int) ceil($shelf['count'] / $shelf['rows']) * $shelf['span'];
    }

    /** A warm lamp (a point light) at x, y, z. With an `emoji` it's drawn
     * as that, glowing while it's on; otherwise it's unseen unless a toy is
     * its bulb (a `light` naming only it). */
    private static function lamp(string $id, int $x, int $y, int $z, ?string $emoji = null): array
    {
        return [
            'id' => $id,
            'x' => $x,
            'y' => $y,
            'z' => $z,
            'color' => '#fcd34d',
            'intensity' => 1.3,
            ...($emoji ? ['emoji' => $emoji] : []),
        ];
    }

    /** A flickering flame (a point light) at x, y, z: where its toy (a
     * candle, a fire) burns, which the room hangs it in. */
    private static function flame(string $id, int $x, int $y, int $z, string $color, float $intensity): array
    {
        return ['id' => $id, 'x' => $x, 'y' => $y, 'z' => $z, 'color' => $color, 'intensity' => $intensity, 'flicker' => true];
    }

    /** A ceiling light over the middle of a Library room `$width` wide. */
    private static function ceilingLamp(int $width): array
    {
        return self::lamp('ceiling', intdiv($width, 2), self::LIBRARY_LAMP_Y, self::LIBRARY_CEILING_Z);
    }

    /** Reading lamps hung evenly over the shelves from x `$from` to `$to`:
     * one per LIBRARY_LAMP_SPACING, at least one and at most `$max`. */
    private static function readingLamps(int $from, int $to, int $max): array
    {
        $count = max(1, min($max, (int) ceil(($to - $from) / self::LIBRARY_LAMP_SPACING)));
        $step = ($to - $from) / $count;

        return array_map(
            fn (int $i) => self::lamp('reading-'.($i + 1), (int) round($from + ($i + 0.5) * $step), self::LIBRARY_LAMP_Y, self::LIBRARY_LAMP_Z),
            range(0, $count - 1),
        );
    }

    /** A bulb on a room's back wall, `y` up it, that is the room's `lamp`
     * and its switch. */
    private static function lampSwitch(int $x, int $y): array
    {
        return self::toy('lamp-switch', $x, 0, '💡', 'lamp', ['y' => $y, 'size' => 50, 'move' => 'wiggle', 'light' => 'lamp']);
    }

    /** A switch near the open front of a room that turns all of `$lights`
     * on or off together. */
    private static function lightSwitch(int $x, array $lights): array
    {
        return self::toy('light-switch', $x, 390, '💡', 'light_switch', ['size' => 60, 'move' => 'wiggle', 'light' => array_column($lights, 'id')]);
    }

    /** Stairs up (`$up`) or down to `$to`, arriving at the stairs going
     * back. Up is on the right wall (a room `span` wide), down on the left;
     * down is the way out. A door with `stairs` is drawn as a flight of
     * steps (staircase.js), not as its emoji. */
    private static function stairs(bool $up, string $to, int $span = 0): array
    {
        $id = $up ? 'upstairs' : 'downstairs';

        return [
            ...self::roomDoor(
                $id,
                220,
                $to,
                $up ? 'downstairs' : 'upstairs',
                exit: ! $up,
                wall: $up ? 'right' : 'left',
                span: $span,
                key: "messages.games.world.doors.{$id}",
            ),
            'stairs' => $up ? 'up' : 'down',
        ];
    }

    /** A category's name as the Books pages show it, for a label's
     * `:name`. */
    private static function categoryName(Category $category): array
    {
        return ['name' => Str::ucfirst($category->name)];
    }

    /** A building on the road you can go into, its sign `emoji`, named
     * `places.<label>`, leading to its room's `front-door`. */
    private static function roadDoor(string $id, int $x, string $side, string $emoji, string $label, string $to): array
    {
        return [
            'id' => $id,
            'type' => 'door',
            'x' => $x,
            'side' => $side,
            'emoji' => $emoji,
            'label' => "messages.games.world.places.{$label}",
            'to' => $to,
            'toSpot' => 'front-door',
        ];
    }

    /** A room named `places.<label>`. */
    private static function room(string $label, array $room, array $interactables): array
    {
        return [
            'kind' => 'room',
            'label' => "messages.games.world.places.{$label}",
            ...$room,
            'interactables' => $interactables,
        ];
    }

    /** A door on `wall` of a room (`back`, `left` or `right`), named
     * `doors.outside` if it leads out to the road, `places.<label>` after
     * the room it leads to, or by the lang `key` it's given. `at` is x
     * along the back wall, or z
     * along a side wall; a right-hand door needs the room's `span`. */
    private static function roomDoor(string $id, int $at, string $to, string $toSpot, ?string $label = null, bool $exit = false, string $wall = 'back', int $span = 0, ?string $key = null): array
    {
        [$x, $z] = match ($wall) {
            'left' => [0, $at],
            'right' => [$span, $at],
            default => [$at, 0],
        };

        return [
            'id' => $id,
            'type' => 'door',
            'wall' => $wall,
            'x' => $x,
            'z' => $z,
            'emoji' => '🚪',
            'label' => $key ?? ($to === 'road'
                ? 'messages.games.world.doors.outside'
                : "messages.games.world.places.{$label}"),
            'to' => $to,
            'toSpot' => $toSpot,
            ...($exit ? ['exit' => true] : []),
        ];
    }

    /** Game `slug` in a room, drawn as its `emoji` or `cast` (`$look`). */
    private static function game(string $slug, int $x, int $z, array $look): array
    {
        return ['id' => $slug, 'type' => 'game', 'x' => $x, 'z' => $z, 'game' => $slug, ...$look];
    }

    /** A clock on the back wall. `face` is one of CLOCKS; `sound` is `tick` or `bell`. */
    private static function clock(int $n, int $x, string $face, string $sound, int $y): array
    {
        return [
            'id' => "clock-{$n}",
            'type' => 'toy',
            'x' => $x,
            'z' => 0,
            'face' => $face,
            'label' => "messages.games.world.toys.clock_{$face}",
            'y' => $y,
            'size' => 72,
            'move' => 'wiggle',
            'sound' => $sound,
        ];
    }

    /** A picture on a room's back wall, its bottom `y` up it: `src` in a
     * frame `w` × `h` (the photo's own shape). The room draws it as an
     * image over a panel, the way a book cover sits on a shelf. Named
     * `toys.<key>`, and it says `toys.<key>_line`. */
    private static function picture(string $id, int $x, int $y, string $src, int $w, int $h, string $key): array
    {
        return [
            'id' => $id,
            'type' => 'toy',
            'x' => $x,
            'z' => 0,
            'y' => $y,
            'image' => ['src' => $src, 'w' => $w, 'h' => $h],
            'label' => "messages.games.world.toys.{$key}",
            'line' => "messages.games.world.toys.{$key}_line",
            'sound' => 'hiss',
        ];
    }

    /** A prop to play with, named `toys.<key>`; with `line: true` in `$does`
     * it says `toys.<key>_line`. Drawn as `emoji`, or with none, as what
     * `$does` says (a `model`). */
    private static function toy(string $id, int $x, int $z, ?string $emoji, string $key, array $does = []): array
    {
        $line = $does['line'] ?? false;
        unset($does['line']);

        return [
            'id' => $id,
            'type' => 'toy',
            'x' => $x,
            'z' => $z,
            ...($emoji !== null ? ['emoji' => $emoji] : []),
            'label' => "messages.games.world.toys.{$key}",
            ...$does,
            ...($line ? ['line' => "messages.games.world.toys.{$key}_line"] : []),
        ];
    }

    /** A flat-screen TV on a room's back wall, its bottom `y` up it (a
     * black panel, `screen` units wide and high). scenes() tunes it to a
     * few of the family's videos (`channels`); with none it says
     * `toys.tv_line`. */
    private static function tv(string $id, int $x, int $y): array
    {
        return [
            'id' => $id,
            'type' => 'tv',
            'x' => $x,
            'z' => 0,
            'y' => $y,
            'screen' => ['w' => 192, 'h' => 108],
            'label' => 'messages.games.world.toys.tv',
            'line' => 'messages.games.world.toys.tv_line',
        ];
    }

    /** An entertainment center against the back wall, its middle `x` along
     * it, ENTERTAINMENT_CENTER in size. */
    private static function entertainmentCenter(int $x): array
    {
        return ['x' => $x, ...self::ENTERTAINMENT_CENTER];
    }

    /** An old wooden radio (three/antiqueRadio.js draws it), `y` up a room's
     * wall or on top of something (0 on the floor). scenes() tunes it to a
     * few of the family's songs (`songs`); with none, or the music turned
     * off, it says `toys.radio_line`. */
    private static function radio(string $id, int $x, int $z, int $y = 0, int $size = 60): array
    {
        return [
            'id' => $id,
            'type' => 'radio',
            'x' => $x,
            'z' => $z,
            'y' => $y,
            'size' => $size,
            'emoji' => '📻',
            'model' => 'radio',
            'label' => 'messages.games.world.toys.radio',
            'line' => 'messages.games.world.toys.radio_line',
        ];
    }

    /** A pipe organ against the right wall of a room `span` wide, its
     * middle `z` along it (three/pipeOrgan.js draws it, scenes/
     * organLayout.js sizes it, and the Butt can't walk into it). Each of its
     * keyboard's ORGAN_ZONES is a button of its own that plays the key it's
     * pressed on; using the organ as a whole plays a chord. */
    private static function organ(string $id, int $z, int $span): array
    {
        return [
            'id' => $id,
            'type' => 'organ',
            'wall' => 'right',
            'x' => $span,
            'z' => $z,
            // Where the Butt stands to play it: clear of its keydesk and
            // pedals, the Butt's own half-width out (useRoom.js keeps it
            // off them).
            'stand' => 200,
            'label' => 'messages.games.world.toys.organ',
            'zones' => array_map(fn ($zone) => "messages.games.world.toys.organ_{$zone}", self::ORGAN_ZONES),
        ];
    }

    /** A minigame (one of MINIGAMES) played where it stands, drawn as
     * `emoji`, named by minigameKey() and explained by its `_line` as its
     * card opens. Titled like a game. */
    private static function minigame(string $minigame, int $x, int $z, string $emoji): array
    {
        $key = self::minigameKey($minigame);

        return [
            'id' => $minigame,
            'type' => 'minigame',
            'minigame' => $minigame,
            'x' => $x,
            'z' => $z,
            'size' => 90,
            'emoji' => $emoji,
            'titled' => true,
            'label' => $key,
            'line' => "{$key}_line",
        ];
    }

    /** Minigame `name`'s lang key (`minigames.toot_catch`). */
    private static function minigameKey(string $minigame): string
    {
        return 'messages.games.world.minigames.'.str_replace('-', '_', $minigame);
    }

    /** Minigame `name`'s translated name, as a shared score gives it. */
    public static function minigameName(string $minigame): string
    {
        return __(self::minigameKey($minigame));
    }

    /** Where the launcher of a game (`$kind` `game`, by slug) or a
     * minigame (`minigame`, by name) stands: its scene and its id there,
     * the spot a shared score's link arrives at. Null if it isn't placed. */
    public static function whereIs(string $kind, string $name): ?array
    {
        // A game's score shares as a minigame (issue #144: every game plays
        // in the world). Its launcher is still a game.
        if ($kind === 'minigame' && array_key_exists($name, GameController::games())) {
            $kind = 'game';
        }

        foreach (self::definitions() as $sceneId => $scene) {
            foreach ($scene['interactables'] as $item) {
                if ($item['type'] === $kind && ($item[$kind] ?? null) === $name) {
                    return ['scene' => $sceneId, 'spot' => $item['id']];
                }
            }
        }

        return null;
    }

    /** A cast member living in a room, as a toy: its id is its cast id. */
    private static function resident(string $cast, int $x, int $z, array $does = []): array
    {
        return [
            'id' => $cast,
            'type' => 'toy',
            'x' => $x,
            'z' => $z,
            'cast' => $cast,
            'label' => "messages.games.cast.{$cast}",
            ...$does,
        ];
    }

    public static function scenes(): array
    {
        $games = GameController::games();
        // A TV's channels and a radio's songs: each asked for once, and only
        // if a scene has one.
        $tuned = [];
        $tune = function (string $what) use (&$tuned) {
            return $tuned[$what] ??= self::$what();
        };

        return collect(self::definitions())
            ->map(fn ($scene) => [
                ...self::translate($scene),
                ...(isset($scene['shelves'])
                    ? ['shelves' => array_map(fn ($shelf) => self::translate($shelf), $scene['shelves'])]
                    : []),
                'interactables' => array_map(
                    fn ($item) => self::resolve($item, $games, $tune),
                    $scene['interactables'],
                ),
            ])
            ->all();
    }

    private static function resolve(array $item, array $games, callable $tune): array
    {
        if ($item['type'] === 'tv') {
            return [...self::translate($item), 'channels' => $tune('channels')];
        }

        if ($item['type'] === 'radio') {
            return [...self::translate($item), 'songs' => $tune('songs')];
        }

        if ($item['type'] === 'organ') {
            return [...self::translate($item), 'zones' => array_map(fn ($zone) => __($zone), $item['zones'])];
        }

        if ($item['type'] === 'game') {
            $game = $games[$item['game']];
            $item['label'] = $game['name'];
            // What the confirm card shows, in the shape it already takes.
            $item['card'] = [
                'slug' => $item['game'],
                'name' => $game['name'],
                'emoji' => $game['emoji'],
                'description' => $game['description'],
                ...(isset($item['cast'])
                    ? ['cast' => $item['cast']]
                    : ['landmark' => $item['emoji']]),
            ];

            return $item;
        }

        return self::translate($item);
    }

    /** A few of the family's uploaded videos, picked at random once a day,
     * for a TV: only pages anyone can see on the Photos page (not blocked),
     * and not YouTube links, which play on their pages. Paths are the media
     * URLs Page gives. */
    private static function channels(): array
    {
        $videos = fn () => Page::query()
            ->notBlocked()
            ->whereNotNull('media_poster')
            ->where('media_poster', '!=', '')
            ->whereNull('video_link');

        return self::pickedToday(
            'channels',
            self::TV_CHANNELS,
            fn () => $videos()->inRandomOrder()->limit(self::TV_CHANNELS)->pluck('id'),
            fn (array $ids) => $videos()->with('book:id,title')->whereKey($ids)->get(),
        )
            ->map(fn (Page $page) => [
                'id' => $page->id,
                'video' => $page->media_path,
                'poster' => $page->media_poster,
                'title' => $page->book?->title ?? '',
            ])
            ->all();
    }

    /** A few of the family's songs, picked at random once a day, for a
     * radio, with what the music player needs to play one. None while the
     * music is turned off: the player lives in the music flyout, which is
     * only there while it's on. Asked before the day's pick, so turning the
     * music back on never waits on a cached nothing. */
    private static function songs(): array
    {
        if (! (SiteSetting::where('key', 'music_enabled')->first()?->value ?? false)) {
            return [];
        }

        return self::pickedToday(
            'songs',
            self::RADIO_STATIONS,
            fn () => Song::query()->inRandomOrder()->limit(self::RADIO_STATIONS)->pluck('id'),
            fn (array $ids) => Song::query()
                ->whereKey($ids)
                ->get(['id', 'title', 'description', 'youtube_video_id', 'thumbnail_default', 'thumbnail_high']),
        )->toArray();
    }

    /** Up to `$count` ids picked at random once a day (Los Angeles time,
     * like the scheduler) and cached until midnight; each request looks them
     * up afresh by primary key through `$fetch`, so what's blocked or deleted
     * since drops out at once, and returns them in the order picked, so a
     * TV's channel numbers hold all day. A short pick isn't cached: until
     * there are `$count` to choose from, what's uploaded later that day
     * still shows. The first pick stored wins, so visitors who arrive
     * together at midnight share one. */
    private static function pickedToday(string $key, int $count, Closure $pickIds, Closure $fetch): Collection
    {
        $today = CarbonImmutable::now(config('app.local_timezone'));
        $cacheKey = "games-world:picks:{$key}:{$today->toDateString()}";

        $ids = Cache::get($cacheKey);
        if ($ids === null) {
            $ids = $pickIds()->all();
            if (count($ids) === $count && ! Cache::add($cacheKey, $ids, $today->endOfDay())) {
                $ids = Cache::get($cacheKey, $ids);
            }
        }

        $order = array_flip($ids);

        return $fetch($ids)->sortBy(fn ($model) => $order[$model->getKey()])->values();
    }

    /** A scene's or interactable's TRANSLATED fields, each filled in from
     * its `<field>Args` if it has them (a Library room's category name, a
     * floor's number). */
    private static function translate(array $thing): array
    {
        foreach (self::TRANSLATED as $field) {
            $args = $thing["{$field}Args"] ?? [];
            unset($thing["{$field}Args"]);
            if (isset($thing[$field])) {
                $thing[$field] = __($thing[$field], $args);
            }
        }

        return $thing;
    }
}
