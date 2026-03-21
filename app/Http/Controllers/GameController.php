<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class GameController extends Controller
{
    private const GAMES = [
        'boom' => [
            'name'        => 'Poop Boom',
            'emoji'       => '💩',
            'description' => "Drag the poop into the toilet. 5 misses and it's game over!",
            'component'   => 'Boom',
        ],
        'cockroach' => [
            'name'        => 'Cockroach Fart',
            'emoji'       => '🪳',
            'description' => "Tap the cockroach's head to make it hiss its way to the toilet.",
            'component'   => 'Cockroach',
        ],
    ];

    public function index(): Response
    {
        $games = collect(self::GAMES)
            ->map(fn ($game, $slug) => [
                'slug'        => $slug,
                'name'        => $game['name'],
                'emoji'       => $game['emoji'],
                'description' => $game['description'],
            ])
            ->values()
            ->all();

        return Inertia::render('Games/Index', ['games' => $games]);
    }

    public function show(string $game): Response
    {
        abort_if(!array_key_exists($game, self::GAMES), 404);

        return Inertia::render('Games/' . self::GAMES[$game]['component']);
    }
}
