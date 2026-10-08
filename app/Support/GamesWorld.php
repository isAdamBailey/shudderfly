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
    /** Ids of the cast registry, CAST in resources/js/constants/characters.js
     * (a Vitest test keeps the two in step). Scenes name characters by these
     * ids, never by emoji. */
    public const CAST = [
        'butt', 'poop', 'toilet', 'cockroach', 'pizza', 'face',
        'blueberries', 'grapes', 'strawberry', 'taco', 'apple', 'sprout',
    ];

    public static function definitions(?array $games = null): array
    {
        return [
            'road' => [
                'kind' => 'road',
                // Generated, not listed: a game added to games() gets its
                // landmark on the road without an edit here.
                'interactables' => collect($games ?? GameController::games())
                    ->map(fn ($game, $slug) => [
                        'id' => $slug,
                        'type' => 'game',
                        'x' => $game['distance'],
                        'game' => $slug,
                        ...(isset($game['landmark_cast'])
                            ? ['cast' => $game['landmark_cast']]
                            : ['emoji' => $game['landmark']]),
                    ])
                    ->values()
                    ->all(),
            ],
        ];
    }

    public static function scenes(): array
    {
        $games = GameController::games();

        return collect(self::definitions($games))
            ->map(fn ($scene) => [
                ...$scene,
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
        }

        return $item;
    }
}
