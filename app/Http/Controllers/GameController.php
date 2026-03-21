<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class GameController extends Controller
{
    private const GAMES = [
        'boom'      => 'Boom',
        'cockroach' => 'Cockroach',
    ];

    public function index(): Response
    {
        return Inertia::render('Games/Index');
    }

    public function show(string $game): Response
    {
        abort_if(!array_key_exists($game, self::GAMES), 404);

        return Inertia::render('Games/' . self::GAMES[$game]);
    }
}
