<?php

namespace App\Support;

use App\Http\Controllers\GameController;

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

    /** A room's looks, by name: `walls.back` (and `walls.sides`) from WALLS,
     * `walls.floor` from FLOORS. three/roomLooks.js draws each one (a Vitest
     * test keeps the lists in step). */
    public const WALLS = ['wallpaper-stripes', 'wallpaper-dots', 'tiles', 'brick', 'plaster'];

    public const FLOORS = ['wood', 'lino', 'tiles', 'carpet', 'concrete'];

    /** The moves a toy may play: CAST_MOVES in characters.js (a Vitest test
     * keeps them in step). A prop can play any; a cast member only its own. */
    public const MOVES = [
        'idle', 'excited', 'hop', 'walk', 'wiggle', 'toot', 'thrown', 'eat',
        'bounce', 'flush', 'gulp', 'scuttle', 'hiss', 'wobble', 'chomp',
    ];

    /** An interactable's fields that are lang keys in definitions() and
     * visible text in scenes() (games are named by GameController::games()). */
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
     */
    public static function definitions(?array $games = null): array
    {
        return [
            'road' => [
                'kind' => 'road',
                'label' => 'messages.games.world.places.street',
                // Generated, not listed: a game added to games() gets its
                // landmark on the road without an edit here.
                'interactables' => [...collect($games ?? GameController::games())
                    ->map(fn ($game, $slug) => [
                        'id' => $slug,
                        'type' => 'game',
                        'x' => $game['distance'],
                        // Which side of the street it stands on: "far" or
                        // "near". Every game is on the far side for now.
                        'side' => $game['side'] ?? 'far',
                        'game' => $slug,
                        ...(isset($game['landmark_cast'])
                            ? ['cast' => $game['landmark_cast']]
                            : ['emoji' => $game['landmark']]),
                    ])
                    ->values()
                    ->all(),
                    // The House, across the street from the first games.
                    [
                        'id' => 'house',
                        'type' => 'door',
                        'x' => 1050,
                        'side' => 'near',
                        'emoji' => '🏠',
                        'label' => 'messages.games.world.places.house',
                        'to' => 'house.hall',
                        'toSpot' => 'front-door',
                    ],
                ],
            ],
            // The way in. Phase 6 gives it the doors to the other rooms.
            'house.hall' => [
                'kind' => 'room',
                'label' => 'messages.games.world.places.house_hall',
                // Floor size in world units: x across, z from the back wall
                // to the open front.
                'size' => ['w' => 900, 'd' => 500],
                'spawn' => ['x' => 450, 'z' => 330],
                'walls' => ['back' => 'wallpaper-stripes', 'floor' => 'wood'],
                // A dim hall: low daylight, and a lamp you can switch.
                'ambient' => 0.35,
                'lights' => [
                    ['id' => 'lamp', 'x' => 760, 'z' => 140, 'y' => 200, 'color' => '#fbbf24', 'intensity' => 1.4],
                ],
                'interactables' => [
                    // A toy plays `move`, toots as `toot` (a cast id), says
                    // `line` and switches `light`, whichever it has. `y` lifts
                    // one off the floor (onto a wall).
                    [
                        'id' => 'doorbell',
                        'type' => 'toy',
                        'x' => 560,
                        'z' => 0,
                        'y' => 120,
                        'size' => 50,
                        'emoji' => '🔔',
                        'label' => 'messages.games.world.toys.doorbell',
                        'line' => 'messages.games.world.toys.doorbell_line',
                        'move' => 'wiggle',
                        'toot' => 'butt',
                    ],
                    [
                        'id' => 'lamp-switch',
                        'type' => 'toy',
                        'x' => 760,
                        'z' => 140,
                        'emoji' => '💡',
                        'label' => 'messages.games.world.toys.lamp',
                        'move' => 'bounce',
                        'light' => 'lamp',
                    ],
                    [
                        'id' => 'strawberry',
                        'type' => 'toy',
                        'x' => 180,
                        'z' => 260,
                        'cast' => 'strawberry',
                        'label' => 'messages.games.cast.strawberry',
                        'move' => 'hop',
                        'toot' => 'strawberry',
                    ],
                    [
                        'id' => 'front-door',
                        'type' => 'door',
                        'x' => 450,
                        'z' => 0,
                        'emoji' => '🚪',
                        'label' => 'messages.games.world.doors.outside',
                        'to' => 'road',
                        'toSpot' => 'house',
                        'exit' => true,
                    ],
                ],
            ],
        ];
    }

    public static function scenes(): array
    {
        $games = GameController::games();

        return collect(self::definitions($games))
            ->map(fn ($scene) => [
                ...$scene,
                'label' => __($scene['label']),
                'interactables' => array_map(
                    fn ($item) => self::resolve($item, $games),
                    $scene['interactables'],
                ),
            ])
            ->all();
    }

    private static function resolve(array $item, array $games): array
    {
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

        foreach (self::TRANSLATED as $field) {
            if (isset($item[$field])) {
                $item[$field] = __($item[$field]);
            }
        }

        return $item;
    }
}
