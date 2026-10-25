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
use App\Models\Sound;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Str;
use InvalidArgumentException;

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

    /** Library category doors along each of a landing's long walls, the
     * back and the front. */
    public const LIBRARY_DOORS_PER_WALL = 4;

    /** Library category rooms per landing: a wall of doors on the back,
     * and another on the front. */
    public const LIBRARY_ROOMS_PER_FLOOR = 2 * self::LIBRARY_DOORS_PER_WALL;

    /** A category room's shelves: rows of books, how far apart along the
     * back wall (world units), and where they start (past the door). */
    public const LIBRARY_SHELF_ROWS = 3;

    public const LIBRARY_BOOK_SPAN = 110;

    public const LIBRARY_SHELVES_FROM = 260;

    /** The most books a shelf in the Library's hall holds (its Popular,
     * Forgotten and seasonal shelves): three columns, within one page of
     * books.category. */
    public const LIBRARY_HALL_SHELF = 9;

    /** How much of a room's width the camera shows at once, the same in
     * every room so everything in the world is drawn at one size (walls are
     * half this tall). A wider room scrolls as the Butt walks; a narrower
     * one doesn't fill the view. room() sets it. */
    public const ROOM_FRAME = 900;

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

    /**
     * The site setting that lets logged-in people in the world see each
     * other (issue #174). Off, the page joins no presence channel and the
     * channels refuse anyone who tries; whoever already joined stays until
     * they leave the page.
     */
    public const TOGETHER_SETTING = 'world_together_enabled';

    /** How many songs a radio turns through, picked once a day
     * (pickedToday()). */
    public const RADIO_STATIONS = 6;

    /** An entertainment center's size in world units (scenes/
     * entertainmentCenter.js draws it): `w` along the wall, `h` to its top,
     * where a radio stands, `d` deep: its knobs stay clear of where the
     * Butt walks (useRoom.js MARGIN). */
    public const ENTERTAINMENT_CENTER = ['w' => 380, 'h' => 120, 'd' => 36];

    /** A kitchen counter (scenes/kitchenCounter.js draws it): `h` to its
     * worktop, where things stand on it, `d` deep, clear of where the Butt
     * walks (useRoom.js MARGIN). Its wall cabinets hang from `y` up the
     * wall, `h` tall and `d` deep, under the season's decorations. */
    public const KITCHEN_COUNTER = ['h' => 92, 'd' => 44];

    public const KITCHEN_CABINETS = ['y' => 200, 'h' => 90, 'd' => 34];

    /** The Cockroach's fireplace (scenes/fireplace.js draws it), its size in
     * world units: `w` along the wall, `h` to its mantel, where Hank's
     * portrait stands, `d` deep. */
    public const FIREPLACE = ['w' => 440, 'h' => 200, 'd' => 50];

    /** Where the fire burns in that fireplace: `y` up off the hearth, `z`
     * out from the wall. */
    private const HEARTH_FIRE = ['y' => 6, 'z' => 20];

    /** The most sounds of his own a cast member toots (castSounds()): each
     * one loads on the visitor's first tap in the world. */
    public const CAST_SOUNDS_MAX = 8;

    /** The slug of Hank's book: the Cockroach's House hangs his photos. */
    public const HANK_BOOK = 'hank';

    /** What Guster's House searches the family's pages for: his photos
     * hang on his wall. */
    public const GUSTER_SEARCH = 'guster';

    /** Guster's hello, a recording on the Sounds page ("guster hello"): its
     * S3 key, his toot when he's tapped (the puff with it). Only production has
     * the file: elsewhere his toot falls back to the fart. */
    public const GUSTER_HELLO = 'sounds/d81e2f70-318a-44f3-b967-c48d1c91ce0f.m4a';

    /** How far out from the back wall a flight of stairs stands. */
    private const STAIRS_FROM_BACK = 220;

    /** How high up the wall the Cockroach's candle sconces hang. */
    private const SCONCE_Y = 270;

    /** The walls of a room things can go on (onWall()). `back` is the far
     * wall, as you come in, and `front` the one across from it, behind you
     * (hidden while you face the back); `left` and `right` are the ends. */
    public const ROOM_WALLS = ['back', 'left', 'right', 'front'];

    /** A room's looks, by name: `walls.back` (and `walls.sides`, and
     * `walls.front`, which is like the sides unless it says) from WALLS,
     * `walls.floor` from FLOORS. three/roomLooks.js draws each one (a Vitest
     * test keeps the lists in step). */
    public const WALLS = ['wallpaper-stripes', 'wallpaper-dots', 'wallpaper-green', 'tiles', 'brick', 'plaster', 'stone'];

    public const FLOORS = ['wood', 'lino', 'tiles', 'carpet', 'moss', 'concrete', 'flagstones'];

    /** Front doors a building on the road may have instead of the plain
     * wooden one (a road door's `door`): scenes/streetGeometry.js DOORS (a
     * Vitest test keeps them in step). */
    public const DOORS = ['guster'];

    /** Named sounds a toy's `sound` may use: sounds.js (a Vitest test keeps
     * them in step). */
    public const SOUNDS = ['hiss', 'tick', 'bell', 'chomp', 'bonk', 'whoosh', 'pop', 'thud', 'fanfare'];

    /** The minigames a `minigame` interactable may start:
     * World/minigames/index.js (a Vitest test keeps them in step). */
    public const MINIGAMES = ['toot-catch', 'toot-slots'];

    /** Clock faces a hall clock may wear: three/clockFaces.js (a Vitest test
     * keeps them in step). */
    public const CLOCKS = ['round', 'school', 'octagon', 'cuckoo', 'sunburst', 'arch', 'hex', 'banjo'];

    /** A pipe organ's keyboard zones, deepest first: each is a button of
     * its own, named `toys.organ_<zone>` (scenes/organLayout.js draws as
     * many). */
    public const ORGAN_ZONES = ['deep', 'low', 'high', 'squeaky'];

    /** Props modelled in 3D that an interactable's `model` may name:
     * three/models.js (a Vitest test keeps them in step). */
    public const MODELS = ['radio', 'table-lamp', 'slot-machine', 'fridge', 'oven', 'washing-machine', 'grandfather-clock', 'armchair'];

    /** What a model that stands on the floor takes up, per unit of its
     * size: `w` across and `d` out from the wall, three/footprints.js's (a
     * Vitest test keeps them in step), so a room's layout can be checked
     * here. */
    public const MODEL_FOOTPRINTS = [
        'fridge' => ['w' => 0.48, 'd' => 0.18],
        'oven' => ['w' => 1.09, 'd' => 0.4],
        'washing-machine' => ['w' => 0.7, 'd' => 0.36],
        'grandfather-clock' => ['w' => 0.3, 'd' => 0.14],
        'armchair' => ['w' => 0.8, 'd' => 0.3],
    ];

    /** Frames a wall picture or a room's photo can hang in (its
     * `image.frame`), drawn by three/pictureFrame.js; with none it hangs on
     * a plain panel. Each by how far its moulding reaches past the picture
     * (its `border` there; a Vitest test keeps them in step), so leave
     * that much room. */
    public const PICTURE_FRAMES = ['ornate' => 18, 'green' => 14];

    /** The moves a toy may play: CAST_MOVES in characters.js (a Vitest test
     * keeps them in step). A prop can play any; a cast member only its own. */
    public const MOVES = [
        'idle', 'excited', 'hop', 'walk', 'wiggle', 'toot', 'thrown', 'eat',
        'bounce', 'flush', 'gulp', 'scuttle', 'hiss', 'wobble', 'chomp',
    ];

    /** An interactable's fields that are lang keys in definitions() and
     * visible text in scenes() (games are named by GameController::games()),
     * as is a scene's `label`. A field may take `<field>Args` to fill it in. */
    public const TRANSLATED = ['label', 'line', 'score'];

    /** Ids of the cast registry, CAST in resources/js/constants/characters.js
     * (a Vitest test keeps the two in step). Scenes name characters by these
     * ids, never by emoji. */
    public const CAST = [
        'butt', 'guster', 'toilet', 'cockroach', 'pizza', 'face',
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
        // The Butt's hall, folded onto its four walls (issue #183): the
        // front door in the middle of the back wall, where you come in,
        // the bedroom off the left wall, the bathroom off the right, and
        // the kitchen on the front wall, beside the radio. A little wider than the frame, so the long walls scroll
        // a little; no deeper than before, so the back wall is no smaller.
        $hall = ['w' => 1300, 'd' => 500];
        $entry = intdiv($hall['w'], 2);
        // Where the radio stands on its entertainment center, along the
        // front wall as you face it, and the table lamp beside it.
        $den = 800;
        $tableLamp = $den - 120;
        $on = fn (string $wall, array $thing) => self::onWall($wall, $hall, $thing);
        // Guster's hall: no wider than the frame now his photos and slot
        // machine hang round the walls.
        $gusterHall = ['w' => self::ROOM_FRAME, 'd' => 450];
        $gusterOn = fn (string $wall, array $thing) => self::onWall($wall, $gusterHall, $thing);
        // The Cockroach's Nest, folded onto its walls (issue #183): its
        // fireplace on the back wall, and its candles, where each burns
        // ([wall, x along it], up it at SCONCE_Y): one by the hearth, one
        // between the grandfather clock and the armchair on the right
        // wall, one by the music room's door on the front wall.
        $nest = ['w' => 1400, 'd' => 480];
        $nestOn = fn (string $wall, array $thing) => self::onWall($wall, $nest, $thing);
        $hearth = 840;
        $sconces = ['sconce-left' => ['back', 560], 'sconce-right' => ['right', 230], 'sconce-front' => ['front', 460]];
        // Its music room: an instrument on every wall but the front, each
        // seen face on from its wall, and a candle by each.
        $music = ['w' => self::ROOM_FRAME, 'd' => 480];
        $musicSconces = ['sconce-left' => ['left', 380], 'sconce-middle' => ['back', 300], 'sconce-right' => ['right', 435]];
        // The kitchen's back wall, from the door: the fridge, a counter,
        // the oven, and a counter to the far wall, with cabinets over both
        // counters and the lamp over the oven. Things on a counter stand
        // on its worktop, halfway back.
        $fridge = 264;
        $oven = 560;
        $worktop = ['y' => self::KITCHEN_COUNTER['h'], 'z' => intdiv(self::KITCHEN_COUNTER['d'], 2)];

        return [
            'road' => [
                'kind' => 'road',
                'label' => 'messages.games.world.places.street',
                'interactables' => [
                    // The buildings you can go into. The road keeps a gap (600
                    // on the far side) for another.
                    self::roadDoor('house', 1050, 'near', '🏠', 'house', 'house.hall'),
                    self::roadDoor('library', 1500, 'far', '📚', 'library', 'library.hall'),
                    // Guster himself is the sign over his green door.
                    self::roadDoor('guster-house', 2400, 'far', null, 'guster_house', 'guster-house.hall', cast: 'guster', door: 'guster'),
                    self::roadDoor('cockroach-house', 3300, 'far', '🪳', 'cockroach_house', 'cockroach-house.hall'),
                ],
            ],

            // --- The Butt's House ---------------------------------------------
            'house.hall' => self::room('house_hall', [
                // Floor size in world units: x across, z from the back wall
                // to the front wall.
                'size' => $hall,
                'spawn' => ['x' => $entry, 'z' => 330],
                'walls' => ['back' => 'wallpaper-stripes', 'floor' => 'wood'],
                // Against the front wall, with the radio on it.
                'entertainment' => [$on('front', self::entertainmentCenter($den))],
                // A lamp you can switch, and the table lamp by the radio
                // (its light hangs in its shade).
                'lights' => [
                    ['id' => 'lamp', 'x' => $entry + 300, 'z' => 240, 'y' => 200, 'color' => '#fbbf24', 'intensity' => 1.4],
                    // Hung in the lamp's shade by the room (RoomScene.js), wherever this says.
                    $on('front', ['id' => 'table-lamp', 'x' => $tableLamp, 'z' => 16, 'y' => 190, 'color' => '#ffd58a', 'intensity' => 1.1]),
                ],
            ], [
                // A door on every wall, each facing into the hall: the way
                // out on the back, the bedroom and bathroom at the ends,
                // the kitchen on the front.
                self::roomDoor('front-door', $entry, 'road', 'house', exit: true),
                self::roomDoor('bedroom-door', 300, 'house.bedroom', 'hall-door', 'house_bedroom', wall: 'left', size: $hall),
                self::roomDoor('bathroom-door', 200, 'house.bathroom', 'hall-door', 'house_bathroom', wall: 'right', size: $hall),
                self::roomDoor('kitchen-door', 200, 'house.kitchen', 'hall-door', 'house_kitchen', wall: 'front', size: $hall),
                // A toy plays `move`, toots as `toot` (a cast id), says `line`
                // and switches `light`, whichever it has. `y` lifts one off the
                // floor (onto a wall).
                self::toy('doorbell', $entry + 160, 0, '🔔', 'doorbell', ['y' => 120, 'size' => 50, 'move' => 'wiggle', 'toot' => 'butt', 'line' => true]),
                // Clocks round the walls, each a different shape: four on
                // the back, either side of the front door, one by each end
                // door, and two on the front, either side of the radio.
                // Every other one chimes, the others tick.
                self::clock(1, 200, 'school', 'tick', 250),
                self::clock(2, 420, 'banjo', 'bell', 280),
                self::clock(3, 960, 'hex', 'tick', 240),
                self::clock(4, 1140, 'cuckoo', 'bell', 270),
                $on('left', self::clock(5, 110, 'round', 'tick', 250)),
                $on('right', self::clock(6, 390, 'sunburst', 'bell', 280)),
                $on('front', self::clock(7, 430, 'octagon', 'tick', 240)),
                $on('front', self::clock(8, 1120, 'arch', 'bell', 270)),
                $on('front', self::radio('radio', $den, 16, self::ENTERTAINMENT_CENTER['h'], 120)),
                $on('front', self::toy('table-lamp', $tableLamp, 16, null, 'table_lamp', ['y' => self::ENTERTAINMENT_CENTER['h'], 'size' => 110, 'model' => 'table-lamp', 'move' => 'wiggle', 'light' => 'table-lamp'])),
                self::toy('lamp-switch', $entry + 300, 240, '💡', 'lamp', ['move' => 'bounce', 'light' => 'lamp']),
                self::resident('strawberry', $entry - 220, 280, ['move' => 'hop', 'toot' => 'strawberry']),
            ]),

            'house.kitchen' => self::room('house_kitchen', [
                'size' => ['w' => 900, 'd' => 500],
                'spawn' => ['x' => 450, 'z' => 330],
                'walls' => ['back' => 'tiles', 'sides' => 'wallpaper-dots', 'floor' => 'lino'],
                'counters' => [self::kitchenCounter(320, 500), self::kitchenCounter(620, 900)],
                'lights' => [self::lamp('lamp', $oven, 240, 0)],
            ], [
                self::roomDoor('hall-door', 120, 'house.hall', 'kitchen-door', 'house_hall', exit: true),
                self::lampSwitch($oven, 240),
                // The kitchen's games are its appliances, untitled: the
                // snacks in the fridge, the pizza in the oven. Their cards
                // still show the burger and the Pizza. Each is as wide and
                // deep as its model (three/footprints.js: the oven 1.09 of
                // its size across, its cooktop at 0.84, the worktop), and a
                // thrown fruit can land on either.
                self::game('toot-foods', $fridge, 0, ['size' => 230, 'emoji' => '🍔', 'model' => 'fridge', 'titled' => false]),
                self::game('costco-pizza-poop', $oven, 0, ['size' => 110, 'cast' => 'pizza', 'model' => 'oven', 'titled' => false]),
                self::toy('sprout-pot', 410, $worktop['z'], '🍲', 'sprout_pot', ['y' => $worktop['y'], 'size' => 70, 'move' => 'wobble', 'toot' => 'sprout', 'line' => true]),
                // The fruit bowl, along the far counter: each toots at its
                // own pitch, and can be picked up and thrown about the room
                // (useThrowables.js), as the road's foods can.
                ...array_map(
                    fn ($fruit, $x) => self::resident($fruit, $x, $worktop['z'], ['y' => $worktop['y'], 'size' => 55, 'move' => 'hop', 'toot' => $fruit, 'throwable' => true]),
                    ['grapes', 'apple', 'blueberries'],
                    [690, 770, 845],
                ),
            ]),
            'house.bathroom' => self::room('house_bathroom', [
                'size' => ['w' => self::ROOM_FRAME, 'd' => 450],
                'spawn' => ['x' => 450, 'z' => 300],
                'walls' => ['back' => 'tiles', 'floor' => 'tiles'],
                'lights' => [self::lamp('lamp', 300, 280, 0)],
            ], [
                self::roomDoor('hall-door', 150, 'house.hall', 'bathroom-door', 'house_hall', exit: true),
                self::lampSwitch(300, 280),
                self::toy('toilet-roll', 450, 0, '🧻', 'toilet_roll', ['y' => 140, 'size' => 50, 'move' => 'wobble', 'line' => true]),
                self::game('boom', 610, 40, ['size' => 110, 'cast' => 'toilet']),
                self::toy('plunger', 760, 140, '🪠', 'plunger', ['move' => 'bounce', 'line' => true]),
                self::toy('air-freshener', 300, 230, '🧴', 'air_freshener', ['move' => 'hop', 'line' => true]),
            ]),
            'house.bedroom' => self::room('house_bedroom', [
                'size' => ['w' => 900, 'd' => 500],
                'spawn' => ['x' => 450, 'z' => 330],
                'walls' => ['back' => 'wallpaper-dots', 'sides' => 'plaster', 'floor' => 'carpet'],
                // A nightlight you can switch.
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

            // --- Guster's House: all in his greens -------------------------------
            // The way in on the back wall, by his washing machine with a
            // photo of him over it; his slot machine on the right wall, and
            // more photos of him (pages that mention him), a new set each
            // day, on the left and front walls. Guster stands in the room,
            // toward the slot machine, where he's seen from three walls.
            'guster-house.hall' => self::room('guster_house_hall', [
                'size' => $gusterHall,
                'spawn' => ['x' => 350, 'z' => 300],
                'walls' => ['back' => 'wallpaper-green', 'floor' => 'moss'],
                'photos' => array_map(
                    fn ($at) => $gusterOn($at[1], self::photoFrame($at[0], $at[2], 160, 100, 130, ['search' => self::GUSTER_SEARCH], 'green')),
                    [['guster-1', 'back', 180], ['guster-2', 'left', 225], ['guster-3', 'front', 330], ['guster-4', 'front', 570]],
                ),
                // A second, unseen lamp toward the front lights the side
                // and front walls and their photos: the bulb by the door is
                // the switch for both.
                'lights' => [self::lamp('lamp', 650, 280, 0), self::lamp('front-lamp', 450, 340, 330)],
            ], [
                self::roomDoor('front-door', 450, 'road', 'guster-house', exit: true),
                self::lampSwitch(650, 280, ['lamp', 'front-lamp']),
                self::resident('guster', 700, 240, ['size' => 150, 'move' => 'bounce', 'toot' => 'guster', 'clip' => self::GUSTER_HELLO]),
                // Guster's game is his washing machine, untitled like the
                // kitchen's appliances: catch the falling foods. As wide
                // and deep as its model (three/footprints.js: 0.7 of its
                // size across), and a thrown thing can land on it.
                self::minigame('toot-catch', 180, 0, '🧺', ['size' => 140, 'model' => 'washing-machine', 'titled' => false]),
                // His slot machine, in his greens with a toot cloud on top,
                // hung on the right wall: three Gusters wins.
                $gusterOn('right', self::minigame('toot-slots', 225, 0, '🎰', ['y' => 90, 'size' => 130, 'model' => 'slot-machine'])),
            ]),

            // --- The Cockroach's House: the Nest, and a music room off it.
            // Cockroach Fight and Cockroach Fart are the Nest's grandfather
            // clock and armchair, on its right wall.
            // Little cockroaches crawl the walls, the same picture as the
            // site header. Dark-ages stone, its lamps all flames: a fire in
            // the hearth under Hank's portrait on the back wall, and
            // candles in sconces. Every flame flickers. Photos of Hank from
            // his book hang either side of the fireplace, past the door's
            // EXIT sign and past the scroll, a new pair each day. The music
            // room's door is on the front wall, at its left end as you face
            // it: at the right end, across from the way in, the music tab
            // covered it on a phone.
            'cockroach-house.hall' => self::room('cockroach_house_hall', [
                'size' => $nest,
                'spawn' => ['x' => 280, 'z' => 320],
                'walls' => ['back' => 'stone', 'sides' => 'stone', 'floor' => 'flagstones'],
                'crawlers' => true,
                'fireplaces' => [['x' => $hearth, ...self::FIREPLACE]],
                'photos' => [
                    self::photoFrame('hank-left', 400, 150, 110, 150, ['book' => self::HANK_BOOK], 'ornate'),
                    self::photoFrame('hank-right', 1270, 150, 110, 150, ['book' => self::HANK_BOOK], 'ornate'),
                ],
                'lights' => [
                    self::flame('fire', $hearth, self::HEARTH_FIRE['y'], self::HEARTH_FIRE['z'], '#f97316', 1.3),
                    ...self::sconceFlames($sconces, $nest),
                ],
            ], [
                self::roomDoor('front-door', 160, 'road', 'cockroach-house', exit: true),
                self::roomDoor('music-door', 300, 'cockroach-house.music', 'nest-door', 'cockroach_house_music', wall: 'front', size: $nest),
                // Hank, remembered over the fire, and on a scroll beside it
                // that reads itself aloud.
                self::picture('portrait', $hearth, self::FIREPLACE['h'], '/img/cockroach.png', 372, 200, 'cockroach_portrait'),
                self::toy('tribute', $hearth + 295, 0, '📜', 'tribute', ['y' => 110, 'size' => 70, 'move' => 'wiggle', 'line' => true]),
                self::toy('fire', $hearth, self::HEARTH_FIRE['z'], '🔥', 'fire', ['y' => self::HEARTH_FIRE['y'], 'size' => 96, 'move' => 'wiggle', 'light' => 'fire']),
                // Its games are its furniture, untitled like the kitchen's
                // appliances, their cards still showing the Cockroach. Each
                // is as wide as its model (MODEL_FOOTPRINTS) and shallow
                // enough that the Butt never walks into it.
                $nestOn('right', self::game('cockroach-fight', 120, 0, ['size' => 300, 'cast' => 'cockroach', 'model' => 'grandfather-clock', 'titled' => false])),
                $nestOn('right', self::game('cockroach', 350, 0, ['size' => 150, 'cast' => 'cockroach', 'model' => 'armchair', 'titled' => false])),
                ...self::sconceToys($sconces, $nest),
            ]),
            // The harp stands out from the back wall past the door, facing
            // out to be strummed; the pipe organ fills the middle of the
            // right wall, across the room from the way out; and the bass
            // drum hangs on the left wall, its head facing into the room
            // to be hit.
            'cockroach-house.music' => self::room('cockroach_house_music', [
                'size' => $music,
                'spawn' => ['x' => 300, 'z' => 320],
                'walls' => ['back' => 'stone', 'sides' => 'stone', 'floor' => 'flagstones'],
                'crawlers' => true,
                'lights' => self::sconceFlames($musicSconces, $music),
            ], [
                self::roomDoor('nest-door', 160, 'cockroach-house.hall', 'music-door', 'cockroach_house_hall', exit: true),
                self::onWall('right', $music, self::organ('organ', intdiv($music['d'], 2))),
                self::onWall('left', $music, self::drum('bass-drum', 200, 40)),
                self::harp('harp', 520, 30),
                ...self::sconceToys($musicSconces, $music),
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

        $roomW = self::ROOM_FRAME;
        // A landing: a stairwell's width at each end, and a door's width
        // apart for each category door between them, on the back wall and
        // again on the front.
        $stairsEnd = 150;
        $doorGap = 240;
        $landingW = 2 * $stairsEnd + self::LIBRARY_DOORS_PER_WALL * $doorGap;
        // Every Library room is as deep.
        $libraryD = 450;
        $landingSize = ['w' => $landingW, 'd' => $libraryD];

        // The hall: the front door at the left end, then the special
        // shelves, then the stairs up at the right.
        $shelves = self::hallShelves();
        $hallW = max($roomW, (int) (collect($shelves)->max(fn ($shelf) => self::shelfEnd($shelf)) ?? 0) + 220);
        $hallLights = [
            self::ceilingLamp($hallW),
            ...($shelves ? self::readingLamps($shelves[0]['x'], self::shelfEnd(end($shelves)), self::ROOM_LIGHTS_MAX - 1) : []),
        ];
        $hallSize = ['w' => $hallW, 'd' => $libraryD];
        $scenes = [
            'library.hall' => self::room('library_hall', [
                'size' => $hallSize,
                'spawn' => ['x' => 300, 'z' => 300],
                'walls' => ['back' => 'brick', 'sides' => 'plaster', 'floor' => 'wood'],
                'lights' => $hallLights,
                ...($shelves ? ['shelves' => $shelves] : []),
            ], [
                self::roomDoor('front-door', 110, 'road', 'library', exit: true),
                self::lightSwitch(220, $hallLights),
                ...($floors->isEmpty() ? [] : [self::stairs(true, $floorId(0), $hallSize)]),
            ]),
        ];

        // A pair of wall lamps high between a wall's outer doors: on the
        // back wall, and on the front once it has doors.
        $wallLamps = fn (string $wall) => array_map(
            fn ($side, $x) => self::onWall($wall, $landingSize, self::lamp("{$wall}-{$side}", $x, 390, 20, '💡')),
            ['left', 'right'],
            [$stairsEnd + $doorGap, $landingW - $stairsEnd - $doorGap],
        );

        foreach ($floors as $i => $categories) {
            $landing = $floorId($i);
            $floor = ['number' => $i + 2];
            $landingLights = [
                ...$wallLamps('back'),
                ...($categories->count() > self::LIBRARY_DOORS_PER_WALL ? $wallLamps('front') : []),
            ];
            $scenes[$landing] = [
                ...self::room('library_floor', [
                    'size' => $landingSize,
                    'spawn' => ['x' => $landingW / 2, 'z' => 300],
                    'walls' => ['back' => 'wallpaper-stripes', 'sides' => 'plaster', 'floor' => 'carpet'],
                    'lights' => $landingLights,
                ], [
                    // Down the way you came on the left, up on the right.
                    self::stairs(false, $floorId($i - 1), $landingSize),
                    self::lightSwitch(intdiv($landingW, 2), $landingLights),
                    // The first wall of categories along the back, the rest
                    // along the front, each left to right as you face it.
                    ...$categories->values()->map(fn ($category, $n) => [
                        ...self::roomDoor(
                            "category-{$category->id}",
                            $stairsEnd + intdiv($doorGap, 2) + ($n % self::LIBRARY_DOORS_PER_WALL) * $doorGap,
                            "library.category-{$category->id}",
                            'landing-door',
                            key: 'messages.games.world.doors.library_category',
                            wall: ['back', 'front'][intdiv($n, self::LIBRARY_DOORS_PER_WALL)],
                            size: $landingSize,
                        ),
                        // The Library's rooms open onto each other: a wide
                        // doorway, not a door (doorway.js).
                        'open' => true,
                        'labelArgs' => self::categoryName($category),
                    ])->all(),
                    ...($i < $floors->count() - 1 ? [self::stairs(true, $floorId($i + 1), $landingSize)] : []),
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
                        'size' => ['w' => $width, 'd' => $libraryD],
                        'spawn' => ['x' => 300, 'z' => 300],
                        'walls' => ['back' => 'wallpaper-dots', 'sides' => 'plaster', 'floor' => 'wood'],
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

    /** The candles in the Cockroach's sconces in a room `size` across, by
     * id: [wall, x along it] (onWall()), up the wall at SCONCE_Y. */
    private static function sconceFlames(array $sconces, array $size): array
    {
        return array_map(
            fn ($id, $at) => self::onWall($at[0], $size, self::flame($id, $at[1], self::SCONCE_Y, 0, '#f59e0b', 1.1)),
            array_keys($sconces),
            $sconces,
        );
    }

    /** The sconces those candles burn in, each switching its own. */
    private static function sconceToys(array $sconces, array $size): array
    {
        return array_map(
            fn ($id, $at) => self::onWall($at[0], $size, self::toy($id, $at[1], 0, '🕯️', 'sconce', ['y' => self::SCONCE_Y, 'size' => 50, 'move' => 'wiggle', 'light' => $id])),
            array_keys($sconces),
            $sconces,
        );
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

    /** A bulb on a room's back wall (onWall() moves it), `y` up it, that is the room's `lamp`
     * and its switch, or the switch for all of `$lights`. */
    private static function lampSwitch(int $x, int $y, array $lights = ['lamp']): array
    {
        return self::toy('lamp-switch', $x, 0, '💡', 'lamp', ['y' => $y, 'size' => 50, 'move' => 'wiggle', 'light' => count($lights) === 1 ? $lights[0] : $lights]);
    }

    /** A switch near the open front of a room that turns all of `$lights`
     * on or off together. */
    private static function lightSwitch(int $x, array $lights): array
    {
        return self::toy('light-switch', $x, 390, '💡', 'light_switch', ['size' => 60, 'move' => 'wiggle', 'light' => array_column($lights, 'id')]);
    }

    /** Stairs up (`$up`) or down to `$to` in a room `size` across,
     * arriving at the stairs going back. Up is on the right wall, down on
     * the left, each STAIRS_FROM_BACK out from the back wall; down is the
     * way out. A door with `stairs` is drawn as a flight of steps
     * (staircase.js), not as its emoji. Coming up or down them, you face
     * the back (`arriveFacing`), where a landing's doors are, not the flight. */
    private static function stairs(bool $up, string $to, array $size): array
    {
        $id = $up ? 'upstairs' : 'downstairs';

        return [
            ...self::roomDoor(
                $id,
                // Along each wall as you face it: the right runs out from
                // the back, the left toward it.
                $up ? self::STAIRS_FROM_BACK : $size['d'] - self::STAIRS_FROM_BACK,
                $to,
                $up ? 'downstairs' : 'upstairs',
                exit: ! $up,
                wall: $up ? 'right' : 'left',
                size: $size,
                key: "messages.games.world.doors.{$id}",
            ),
            'stairs' => $up ? 'up' : 'down',
            'arriveFacing' => 'back',
        ];
    }

    /** A category's name as the Books pages show it, for a label's
     * `:name`. */
    private static function categoryName(Category $category): array
    {
        return ['name' => Str::ucfirst($category->name)];
    }

    /** A building on the road you can go into, named `places.<label>`,
     * leading to its room's `front-door`. Its sign is its `emoji`, or a
     * `cast` member over its door instead. Its front door is plain
     * wood, or the `door` named from DOORS. */
    private static function roadDoor(string $id, int $x, string $side, ?string $emoji, string $label, string $to, ?string $cast = null, ?string $door = null): array
    {
        return [
            'id' => $id,
            'type' => 'door',
            'x' => $x,
            'side' => $side,
            ...($cast ? ['cast' => $cast] : ['emoji' => $emoji]),
            'label' => "messages.games.world.places.{$label}",
            'to' => $to,
            'toSpot' => 'front-door',
            ...($door ? ['door' => $door] : []),
        ];
    }

    /**
     * `thing` laid out as if on the back wall (`x` along it, `z` out from
     * it, 0 if it doesn't say) moved onto `wall` of a room `size` ({ w, d })
     * across, as views.js fromView() turns a point: `x` runs along that wall
     * left to right as you face it, and `z` out from it into the room. On
     * any wall but the back it names its `wall`, so it's drawn facing out
     * from it. Works for anything with an `x`: an interactable, a photo, a
     * light, an entertainment center, a counter or a fireplace.
     */
    private static function onWall(string $wall, array $size, array $thing): array
    {
        if ($wall !== 'back' && ! isset($size['w'], $size['d'])) {
            throw new InvalidArgumentException("A thing on the {$wall} wall needs the room's size.");
        }
        $along = $thing['x'];
        $out = $thing['z'] ?? 0;
        [$x, $z] = match ($wall) {
            'back' => [$along, $out],
            'right' => [$size['w'] - $out, $along],
            'front' => [$size['w'] - $along, $size['d'] - $out],
            'left' => [$out, $size['d'] - $along],
        };

        return [
            ...$thing,
            'x' => $x,
            'z' => $z,
            ...($wall === 'back' ? [] : ['wall' => $wall]),
        ];
    }

    /** A room named `places.<label>`, seen ROOM_FRAME wide. */
    private static function room(string $label, array $room, array $interactables): array
    {
        return [
            'kind' => 'room',
            'label' => "messages.games.world.places.{$label}",
            'frame' => self::ROOM_FRAME,
            ...$room,
            'interactables' => $interactables,
        ];
    }

    /** A door `at` along `wall` of a room `size` across (onWall()), named
     * `doors.outside` if it leads out to the road, `places.<label>` after
     * the room it leads to, or by the lang `key` it's given. */
    private static function roomDoor(string $id, int $at, string $to, string $toSpot, ?string $label = null, bool $exit = false, string $wall = 'back', array $size = [], ?string $key = null): array
    {
        return [
            ...self::onWall($wall, $size, ['x' => $at]),
            'id' => $id,
            'type' => 'door',
            // A door names its wall even on the back.
            'wall' => $wall,
            'emoji' => '🚪',
            'label' => $key ?? ($to === 'road'
                ? 'messages.games.world.doors.outside'
                : "messages.games.world.places.{$label}"),
            'to' => $to,
            'toSpot' => $toSpot,
            ...($exit ? ['exit' => true] : []),
        ];
    }

    /** Game `slug` in a room, drawn as its `emoji` or `cast` (`$look`),
     * or as a `model` with them on its card. `titled: false` leaves off
     * the gold name over it. */
    private static function game(string $slug, int $x, int $z, array $look): array
    {
        return ['id' => $slug, 'type' => 'game', 'x' => $x, 'z' => $z, 'game' => $slug, ...$look];
    }

    /** A clock on the back wall (onWall() moves it). `face` is one of CLOCKS; `sound` is `tick` or `bell`. */
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

    /** A picture on a room's back wall (onWall() moves it), its bottom `y` up it: `src`
     * `w` × `h` (the photo's own shape), in one of PICTURE_FRAMES or on a
     * plain panel. The room draws it as an image over that, the way a book
     * cover sits on a shelf. Named `toys.<key>`, and it says
     * `toys.<key>_line`. */
    private static function picture(string $id, int $x, int $y, string $src, int $w, int $h, string $key, ?string $frame = null): array
    {
        return [
            'id' => $id,
            'type' => 'toy',
            'x' => $x,
            'z' => 0,
            'y' => $y,
            'image' => ['src' => $src, 'w' => $w, 'h' => $h, ...($frame ? ['frame' => $frame] : [])],
            'label' => "messages.games.world.toys.{$key}",
            'line' => "messages.games.world.toys.{$key}_line",
            'sound' => 'hiss',
        ];
    }

    /** A photo frame on a room's back wall (onWall() moves it), its bottom `y` up it, `w` ×
     * `h`, filled with one of the photos `from` names (`['book' =>
     * '<slug>']`, that book's pictures, or `['search' => '<term>']`, the
     * pictures on pages mentioning it), picked once a day by
     * scenes(); blank if there's none to give it. In one of PICTURE_FRAMES,
     * or on a plain panel. A room's `photos` are decor: nothing to tap. */
    private static function photoFrame(string $id, int $x, int $y, int $w, int $h, array $from, ?string $frame = null): array
    {
        return [
            'id' => $id,
            'x' => $x,
            'y' => $y,
            'image' => ['w' => $w, 'h' => $h, ...($frame ? ['frame' => $frame] : [])],
            'from' => $from,
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

    /** A flat-screen TV on a room's back wall (onWall() moves it), its bottom `y` up it (a
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

    /** A kitchen counter against the back wall (onWall() moves it) from x `from` to `to`,
     * KITCHEN_COUNTER in size, with KITCHEN_CABINETS over it. */
    private static function kitchenCounter(int $from, int $to): array
    {
        return [
            'x' => intdiv($from + $to, 2),
            'w' => $to - $from,
            ...self::KITCHEN_COUNTER,
            'upper' => self::KITCHEN_CABINETS,
        ];
    }

    /** An entertainment center against the back wall (onWall() moves it), its middle `x` along
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

    /** A pipe organ against a room's back wall (onWall() moves it), its
     * middle at `x` (three/pipeOrgan.js draws it, scenes/organLayout.js
     * sizes it, and the Butt can't walk into it). Each of its keyboard's
     * ORGAN_ZONES is a button of its own that plays the key it's pressed
     * on; using the organ as a whole plays a chord. */
    private static function organ(string $id, int $x): array
    {
        return [
            'id' => $id,
            'type' => 'organ',
            'x' => $x,
            'z' => 0,
            // Where the Butt stands to play it: clear of its keydesk and
            // pedals, the Butt's own half-width out (useRoom.js keeps it
            // off them).
            'stand' => 200,
            'label' => 'messages.games.world.toys.organ',
            'zones' => array_map(fn ($zone) => "messages.games.world.toys.organ_{$zone}", self::ORGAN_ZONES),
        ];
    }

    /** A harp standing on the floor, facing out (three/harp.js draws it,
     * scenes/harpLayout.js sizes it). A strum across its strings plucks
     * each one it crosses; using the harp as a whole runs up them all. */
    private static function harp(string $id, int $x, int $z): array
    {
        return [
            'id' => $id,
            'type' => 'harp',
            'x' => $x,
            'z' => $z,
            // Where the Butt stands to play it: clear of its frame, its
            // own half-width out.
            'stand' => 120,
            'label' => 'messages.games.world.toys.harp',
        ];
    }

    /** A bass drum hung on its side in a cradle, its head facing out
     * (three/bassDrum.js draws it, scenes/drumLayout.js sizes it). A hit
     * on its head booms, deeper nearer the middle; using the drum as a
     * whole hits the middle. */
    private static function drum(string $id, int $x, int $z): array
    {
        return [
            'id' => $id,
            'type' => 'drum',
            'x' => $x,
            'z' => $z,
            // Where the Butt stands to hit it: clear of its cradle (the
            // Butt keeps off it, useRoom.js), its own half-width out.
            'stand' => 170,
            'label' => 'messages.games.world.toys.bass_drum',
        ];
    }

    /** A minigame (one of MINIGAMES) played where it stands, drawn as
     * `emoji`, named by minigameKey() and explained by its `_line` as its
     * card opens. Titled like a game. Its `score` is the words its card
     * gives the score in (`_score`), their `:score` left for the card to
     * fill in. `$does` adds to it, or changes its
     * size: `y` hangs it up the back wall (with `z` 0). */
    private static function minigame(string $minigame, int $x, int $z, string $emoji, array $does = []): array
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
            'score' => "{$key}_score",
            ...$does,
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
        return self::findIn(self::definitions(), $kind, $name);
    }

    /** Where a game or minigame is played, as a shared score tells it
     * mid-sentence: its room's `where` line, the room's `places` key under
     * `where` ("the Bathroom at the Butt's House", "the street"). Null for
     * one not placed, or in a room with no such line. */
    public static function whereIsSaid(string $kind, string $name): ?string
    {
        $definitions = self::definitions();
        $place = self::findIn($definitions, $kind, $name);
        if ($place === null) {
            return null;
        }

        return self::said($definitions[$place['scene']]);
    }

    /** Scene `$id` as an invite names it mid-sentence: its `where` line
     * ("the Kitchen at the Butt's House"), or its label where it has none.
     * Null for a scene that isn't in the world. */
    public static function sceneSaid(string $id): ?string
    {
        $scene = self::definitions()[$id] ?? null;
        if ($scene === null) {
            return null;
        }

        return self::said($scene) ?? self::translate($scene)['label'];
    }

    /** A scene's `where` line: its `places` key under `where`, or null. */
    private static function said(array $scene): ?string
    {
        $key = str_replace('.places.', '.where.', $scene['label']);

        return Lang::has($key) ? __($key) : null;
    }

    /** whereIs() in `$definitions`, so a caller can share one build of them. */
    private static function findIn(array $definitions, string $kind, string $name): ?array
    {
        // A game's score shares as a minigame (issue #144: every game plays
        // in the world). Its launcher is still a game.
        if ($kind === 'minigame' && array_key_exists($name, GameController::games())) {
            $kind = 'game';
        }

        foreach ($definitions as $sceneId => $scene) {
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
        $definitions = self::definitions();
        // A TV's channels and a radio's songs: each asked for once, and only
        // if a scene has one.
        $tuned = [];
        $tune = function (string $what) use (&$tuned) {
            return $tuned[$what] ??= self::$what();
        };
        // Each photo source's pictures today, enough for every frame in the
        // world that names it, handed out in turn so frames sharing one
        // differ.
        $photos = self::photoFrames($definitions)
            ->map(fn ($frames) => collect(self::photos($frames->first()['from'], $frames->count())));

        return collect($definitions)
            ->map(fn ($scene) => [
                ...self::translate($scene),
                ...(isset($scene['shelves'])
                    ? ['shelves' => array_map(fn ($shelf) => self::translate($shelf), $scene['shelves'])]
                    : []),
                ...(isset($scene['photos'])
                    ? ['photos' => array_map(fn ($frame) => self::hang($frame, $photos), $scene['photos'])]
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
        if (isset($item['clip'])) {
            $item['clip'] = Sound::urlForPath($item['clip']);
        }

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
                ...(isset($game['figure'])
                    ? ['figure' => $game['figure']]
                    : ['emoji' => $game['emoji']]),
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
        return self::pickedToday('channels', fn () => Page::query()
            ->notBlocked()
            ->whereNotNull('media_poster')
            ->where('media_poster', '!=', '')
            ->whereNull('video_link')
            ->with('book:id,title')
            ->inRandomOrder()
            ->limit(self::TV_CHANNELS)
            ->get()
            ->map(fn (Page $page) => [
                'id' => $page->id,
                'video' => $page->media_path,
                'poster' => $page->media_poster,
                'title' => $page->book?->title ?? '',
            ])
            ->all());
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

        return self::pickedToday('songs', fn () => Song::query()
            ->inRandomOrder()
            ->limit(self::RADIO_STATIONS)
            ->get(['id', 'title', 'description', 'youtube_video_id', 'thumbnail_default', 'thumbnail_high'])
            ->toArray());
    }

    /** The sounds cast members toot instead of the fart, by cast id, as
     * URLs: Guster's are the Sounds with his name in their title (issue
     * #164), looked up once a day, so a new one joins the next day. One
     * with none toots the fart. They're his voice in the world, not the
     * sound board, so they play even while the Sounds page is turned off
     * (`sounds_enabled`) or one of them is blocked there. */
    public static function castSounds(): array
    {
        return ['guster' => self::pickedToday('guster-sounds', fn () => Sound::query()
            ->where('title', 'like', '%guster%')
            ->whereNotNull('audio_path')
            ->where('audio_path', '!=', '')
            // His hello is what he says when tapped, not a toot.
            ->where('audio_path', 'not like', '%'.self::GUSTER_HELLO)
            ->orderBy('id')
            ->limit(self::CAST_SOUNDS_MAX)
            ->get(['audio_path'])
            ->pluck('audio_path')
            ->all())];
    }

    /** The key photo source `$photos` is known by: `book:<slug>` or
     * `search:<term>`. */
    private static function photoSource(array $photos): string
    {
        return self::photoKind($photos).':'.reset($photos);
    }

    /** Which kind of photo source `$photos` is: `book` or `search`. */
    private static function photoKind(array $photos): string
    {
        $kind = array_key_first($photos);

        return in_array($kind, ['book', 'search'], true)
            ? $kind
            : throw new InvalidArgumentException("Unknown photo source: {$kind}");
    }

    /** Up to `$count` pictures from photo source `$photos`, picked at
     * random once a day, from the image pages anyone can see on the Photos
     * page: a book's, or those its search for a term finds
     * (Page::mentioning()). */
    private static function photos(array $photos, int $count): array
    {
        return self::pickedToday(self::photoSource($photos).":{$count}", fn () => Page::query()
            ->notBlocked()
            ->when(
                self::photoKind($photos) === 'book',
                fn ($pages) => $pages->whereIn('book_id', Book::select('id')->where('slug', $photos['book'])),
                fn ($pages) => $pages->mentioning($photos['search']),
            )
            ->hasImage()
            ->inRandomOrder()
            ->limit($count)
            ->get(['id', 'media_path'])
            ->pluck('media_path')
            ->all());
    }

    /** Every room's photo frames in `$definitions`, grouped by
     * photoSource(). */
    private static function photoFrames(array $definitions): Collection
    {
        return collect($definitions)
            ->flatMap(fn ($scene) => $scene['photos'] ?? [])
            ->groupBy(fn ($frame) => self::photoSource($frame['from']));
    }

    private const SCENE_IDS_KEY = 'games-world.scene-ids';

    /** How long the scene ids are cached at most, s: a deploy that adds a
     * room in code is joinable within this long (a category is at once). */
    public const SCENE_IDS_TTL = 600;

    /**
     * Every scene's id, for the together channels (routes/channels.php),
     * which check one on every room change. Cached, since definitions()
     * queries the book categories each time it's built; the only ids that
     * change between deploys are the Library's category rooms, so a
     * category saved or deleted forgets them (Category::booted()).
     *
     * @return list<string>
     */
    public static function sceneIds(): array
    {
        return Cache::remember(
            self::SCENE_IDS_KEY,
            self::SCENE_IDS_TTL,
            fn () => array_keys(self::definitions())
        );
    }

    /** Forgets the cached scene ids (sceneIds()), so the next join reads
     * them afresh. */
    public static function forgetSceneIds(): void
    {
        Cache::forget(self::SCENE_IDS_KEY);
    }

    /** Whether togetherness is on. A missing row counts as off. */
    public static function togetherEnabled(): bool
    {
        return (bool) (SiteSetting::where('key', self::TOGETHER_SETTING)->first()?->value);
    }

    /** Forgets today's pick of photos for every frame, so the next visit
     * picks again (a seeder that has just added some). */
    public static function forgetPhotoPicks(): void
    {
        foreach (self::photoFrames(self::definitions()) as $source => $frames) {
            Cache::forget(self::dayPickKey("{$source}:{$frames->count()}"));
        }
    }

    /** Frame `$frame`, given the next of its source's pictures in
     * `$photos` (by photoSource()) as its `image.src`; once its source has
     * run out it hangs blank. */
    private static function hang(array $frame, Collection $photos): array
    {
        $src = $photos[self::photoSource($frame['from'])]->shift();
        unset($frame['from']);

        return $src === null ? $frame : [...$frame, 'image' => [...$frame['image'], 'src' => $src]];
    }

    /** What `$pick` chooses at random, once a day (Los Angeles time, like
     * the scheduler), cached as it is until midnight: the rest of the day's
     * visits run no query for it at all, and see it in the same order, so a
     * TV's channel numbers hold. Whatever it picks is kept, even a short or
     * empty pick, and what's blocked, deleted or added during the day waits
     * for the next pick (or the cache being cleared). The first pick stored
     * wins, so visitors who arrive together at midnight share one. */
    private static function pickedToday(string $key, Closure $pick): array
    {
        $today = CarbonImmutable::now(config('app.local_timezone'));
        $cacheKey = self::dayPickKey($key, $today);

        $picked = Cache::get($cacheKey);
        if ($picked === null) {
            $picked = $pick();
            if (! Cache::add($cacheKey, $picked, $today->endOfDay())) {
                $picked = Cache::get($cacheKey, $picked);
            }
        }

        return $picked;
    }

    /** The cache key of pick `$key` on `$day` (today, Los Angeles time). */
    private static function dayPickKey(string $key, ?CarbonImmutable $day = null): string
    {
        $day ??= CarbonImmutable::now(config('app.local_timezone'));

        return "games-world:day-picks:{$key}:{$day->toDateString()}";
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
