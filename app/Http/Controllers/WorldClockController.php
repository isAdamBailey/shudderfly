<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorldClockController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('WorldClock/Index', [
            'defaultCities' => config('world_clock.default_cities'),
            'maxCities' => config('world_clock.max_cities'),
        ]);
    }

    public function searchCities(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $needle = mb_strtolower($validated['q']);

        $results = collect(config('world_clock.cities'))
            ->filter(fn (array $city) => str_contains(mb_strtolower($city['name']), $needle)
                || str_contains(mb_strtolower($city['country'] ?? ''), $needle))
            ->unique(fn (array $city) => $city['timezone'].'|'.$city['name'])
            ->take(15)
            ->values()
            ->all();

        return response()->json($results);
    }
}
