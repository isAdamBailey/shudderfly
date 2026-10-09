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

    /** How many of the family's videos a TV flicks between, picked afresh
     * on every visit. */
    public const TV_CHANNELS = 6;

    /** How many songs a radio turns through, picked afresh on every visit. */
    public const RADIO_STATIONS = 6;

    /** The walls of a room a door can sit on. `back` is the far wall, facing
     * the open front; `left` and `right` are the ends. */
    public const ROOM_WALLS = ['back', 'left', 'right'];

    /** A room's looks, by name: `walls.back` (and `walls.sides`) from WALLS,
     * `walls.floor` from FLOORS. three/roomLooks.js draws each one (a Vitest
     * test keeps the lists in step). */
    public const WALLS = ['wallpaper-stripes', 'wallpaper-dots', 'tiles', 'brick', 'plaster'];

    public const FLOORS = ['wood', 'lino', 'tiles', 'carpet', 'concrete'];

    /** Named sounds a toy's `sound` may use: sounds.js (a Vitest test keeps
     * them in step). */
    public const SOUNDS = ['hiss', 'tick', 'bell'];

    /** The minigames a `minigame` interactable may start:
     * World/minigames/index.js (a Vitest test keeps them in step). */
    public const MINIGAMES = ['toot-catch'];

    /** Clock faces a hall clock may wear: three/clockFaces.js (a Vitest test
     * keeps them in step). */
    public const CLOCKS = ['round', 'school', 'octagon', 'cuckoo', 'sunburst', 'arch', 'hex', 'banjo'];

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

        return [
            'road' => [
                'kind' => 'road',
                'label' => 'messages.games.world.places.street',
                'interactables' => [
                    // A game's building: its sign is the landmark, separate
                    // from the game's own icon (the two cockroach games share
                    // one). x is along the road, in world units.
                    self::roadGame('cockroach-fight', 2400, '🏟️'),
                    self::roadGame('cockroach', 5100, '🏚️'),
                    // The buildings you can go into. The road keeps gaps (600,
                    // 4200 on the far side) for more.
                    self::roadDoor('house', 1050, 'near', '🏠', 'house', 'house.hall'),
                    self::roadDoor('library', 1500, 'far', '📚', 'library', 'library.hall'),
                    self::roadDoor('poop-house', 3300, 'far', '🏡', 'poop_house', 'poop-house.hall'),
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
                // A dim hall: low daylight, and a lamp you can switch.
                'ambient' => 0.35,
                'lights' => [
                    ['id' => 'lamp', 'x' => $entry + 300, 'z' => 240, 'y' => 200, 'color' => '#fbbf24', 'intensity' => 1.4],
                ],
            ], [
                // Kitchen at the left end, bathroom at the right, bedroom
                // down the back wall. All three start out of view.
                self::roomDoor('kitchen-door', 220, 'house.kitchen', 'hall-door', 'house_kitchen', wall: 'left'),
                self::roomDoor('bedroom-door', 240, 'house.bedroom', 'hall-door', 'house_bedroom'),
                self::roomDoor('front-door', $entry, 'road', 'house', exit: true),
                // A toy plays `move`, toots as `toot` (a cast id), says `line`
                // and switches `light`, whichever it has. `y` lifts one off the
                // floor (onto a wall).
                self::toy('doorbell', $entry + 160, 0, '🔔', 'doorbell', ['y' => 120, 'size' => 50, 'move' => 'wiggle', 'toot' => 'butt', 'line' => true]),
                // Clocks along the empty back wall, each a different shape.
                // The cuckoo and the round one sit by the front door, in the
                // first view; the rest are down the hall. Every other one
                // chimes, the others tick.
                self::clock(1, 520, 'school', 'tick', 250),
                self::clock(2, 800, 'banjo', 'bell', 280),
                self::clock(3, 1080, 'hex', 'tick', 240),
                self::clock(4, 1360, 'cuckoo', 'bell', 270),
                self::clock(5, 1980, 'round', 'tick', 250),
                self::clock(6, 2260, 'sunburst', 'bell', 280),
                self::clock(7, 2540, 'octagon', 'tick', 240),
                self::clock(8, 2820, 'arch', 'bell', 270),
                self::roomDoor('bathroom-door', 220, 'house.bathroom', 'hall-door', 'house_bathroom', wall: 'right', span: $hallW),
                self::toy('lamp-switch', $entry + 300, 240, '💡', 'lamp', ['move' => 'bounce', 'light' => 'lamp']),
                self::resident('strawberry', $entry - 220, 280, ['move' => 'hop', 'toot' => 'strawberry']),
            ]),
            'house.kitchen' => self::room('house_kitchen', [
                'size' => ['w' => 900, 'd' => 500],
                'spawn' => ['x' => 450, 'z' => 330],
                'walls' => ['back' => 'tiles', 'sides' => 'wallpaper-dots', 'floor' => 'lino'],
                'ambient' => 0.8,
            ], [
                self::roomDoor('hall-door', 120, 'house.hall', 'kitchen-door', 'house_hall', exit: true),
                self::game('toot-foods', 360, 40, ['size' => 110, 'emoji' => '🍔']),
                self::game('costco-pizza-poop', 600, 180, ['size' => 100, 'cast' => 'pizza']),
                self::toy('sprout-pot', 200, 290, '🍲', 'sprout_pot', ['move' => 'wobble', 'toot' => 'sprout', 'line' => true]),
                // On the shelf by the window, playing the family's music.
                self::radio('radio', 820, 0, 150),
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
            ], [
                self::roomDoor('hall-door', 100, 'house.hall', 'bathroom-door', 'house_hall', exit: true),
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
            ], [
                self::roomDoor('front-door', 400, 'road', 'poop-house', exit: true),
                self::resident('poop', 620, 220, ['move' => 'bounce', 'toot' => 'poop']),
                // The Poop's game, played on the spot: catch the falling foods.
                self::minigame('toot-catch', 170, 180, '🧺', 'toot_catch'),
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
        $scenes = [
            'library.hall' => self::room('library_hall', [
                'size' => ['w' => $hallW, 'd' => 450],
                ...($hallW > $roomW ? ['frame' => $roomW] : []),
                'spawn' => ['x' => 300, 'z' => 300],
                'walls' => ['back' => 'brick', 'sides' => 'plaster', 'floor' => 'wood'],
                'ambient' => 0.55,
                ...($shelves ? ['shelves' => $shelves] : []),
            ], [
                self::roomDoor('front-door', 110, 'road', 'library', exit: true),
                ...($floors->isEmpty() ? [] : [self::stairs(true, $floorId(0), $hallW)]),
            ]),
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
                    'ambient' => 0.55,
                ], [
                    // Down the way you came on the left, up on the right.
                    self::stairs(false, $floorId($i - 1)),
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
                $scenes["library.category-{$category->id}"] = [
                    ...self::room('library_category', [
                        'size' => ['w' => $width, 'd' => 450],
                        ...($width > $roomW ? ['frame' => $roomW] : []),
                        'spawn' => ['x' => 300, 'z' => 300],
                        'walls' => ['back' => 'wallpaper-dots', 'sides' => 'plaster', 'floor' => 'wood'],
                        'ambient' => 0.6,
                        // An emptied category (its books cleaned up) is a bare room.
                        ...($category->books_count > 0 ? ['shelves' => [$shelf]] : []),
                    ], [
                        [
                            ...self::roomDoor('landing-door', 130, $landing, "category-{$category->id}", 'library_floor', exit: true),
                            'open' => true,
                            'labelArgs' => $floor,
                        ],
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

    /** Game `slug`'s building on the road, on the far side, `landmark` its
     * sign. */
    private static function roadGame(string $slug, int $x, string $landmark): array
    {
        return ['id' => $slug, 'type' => 'game', 'x' => $x, 'side' => 'far', 'game' => $slug, 'emoji' => $landmark];
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

    /** A prop to play with, named `toys.<key>`; with `line: true` in `$does`
     * it says `toys.<key>_line`. */
    private static function toy(string $id, int $x, int $z, string $emoji, string $key, array $does = []): array
    {
        $line = $does['line'] ?? false;
        unset($does['line']);

        return [
            'id' => $id,
            'type' => 'toy',
            'x' => $x,
            'z' => $z,
            'emoji' => $emoji,
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

    /** A radio, `y` up a room's wall (0 on the floor). scenes() tunes it to
     * a few of the family's songs (`songs`); with none, or the music turned
     * off, it says `toys.radio_line`. */
    private static function radio(string $id, int $x, int $z, int $y = 0): array
    {
        return [
            'id' => $id,
            'type' => 'radio',
            'x' => $x,
            'z' => $z,
            'y' => $y,
            'size' => 60,
            'emoji' => '📻',
            'label' => 'messages.games.world.toys.radio',
            'line' => 'messages.games.world.toys.radio_line',
        ];
    }

    /** A minigame (one of MINIGAMES) played where it stands, drawn as
     * `emoji`, named `minigames.<key>` and explained by
     * `minigames.<key>_line` as its card opens. Titled like a game. */
    private static function minigame(string $minigame, int $x, int $z, string $emoji, string $key): array
    {
        return [
            'id' => $minigame,
            'type' => 'minigame',
            'minigame' => $minigame,
            'x' => $x,
            'z' => $z,
            'size' => 90,
            'emoji' => $emoji,
            'titled' => true,
            'label' => "messages.games.world.minigames.{$key}",
            'line' => "messages.games.world.minigames.{$key}_line",
        ];
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

    /** A few of the family's uploaded videos, at random, for a TV: only
     * pages anyone can see on the Photos page (not blocked), and not YouTube
     * links, which play on their pages. Paths are the media URLs Page gives. */
    private static function channels(): array
    {
        return Page::query()
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
            ->all();
    }

    /** A few of the family's songs, at random, for a radio, with what the
     * music player needs to play one. None while the music is turned off:
     * the player lives in the music flyout, which is only there while it's
     * on. */
    private static function songs(): array
    {
        if (! (SiteSetting::where('key', 'music_enabled')->first()?->value ?? false)) {
            return [];
        }

        return Song::query()
            ->inRandomOrder()
            ->limit(self::RADIO_STATIONS)
            ->get(['id', 'title', 'description', 'youtube_video_id', 'thumbnail_default', 'thumbnail_high'])
            ->toArray();
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
