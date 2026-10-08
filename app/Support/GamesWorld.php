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
            // A placeholder until the room engine (issue #130, Phase 5):
            // just the way back out.
            'house.hall' => [
                'kind' => 'room',
                'label' => 'messages.games.world.places.house_hall',
                // Floor size in world units: x across, z from the back wall
                // to the open front.
                'size' => ['w' => 900, 'd' => 500],
                'spawn' => ['x' => 450, 'z' => 330],
                'interactables' => [
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

        $item['label'] = __($item['label']);

        return $item;
    }
}
