<?php

namespace App\Http\Controllers;

use App\Events\WorldClockUpdated;
use App\Models\WorldClockSetting;
use App\Support\WorldClockState;
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
            'worldClock' => WorldClockState::payload(WorldClockSetting::instance()),
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

    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cities' => ['present', 'array', 'max:'.config('world_clock.max_cities')],
            'cities.*.name' => ['required', 'string', 'max:100'],
            'cities.*.timezone' => ['required', 'string', 'max:100'],
            'cities.*.country' => ['nullable', 'string', 'max:100'],
            'face_preset' => ['required', 'string', 'max:50'],
            'hand_preset' => ['required', 'string', 'max:50'],
            'numerals' => ['required', 'string', 'max:50'],
            'second_hand_mode' => ['required', 'string', 'max:50'],
        ]);

        $setting = WorldClockSetting::instance();
        $setting->update([
            'cities' => collect($validated['cities'])->map(fn ($c) => [
                'name' => $c['name'],
                'timezone' => $c['timezone'],
                'country' => $c['country'] ?? '',
            ])->values()->all(),
            'face_preset' => $validated['face_preset'],
            'hand_preset' => $validated['hand_preset'],
            'numerals' => $validated['numerals'],
            'second_hand_mode' => $validated['second_hand_mode'],
        ]);

        return $this->broadcastAndRespond($setting);
    }

    public function updateLogo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
            'cityName' => ['nullable', 'string', 'max:100'],
            'timezone' => ['nullable', 'string', 'max:100'],
        ]);

        $setting = WorldClockSetting::instance();
        $setting->update(['logo' => [
            'enabled' => $validated['enabled'],
            'cityName' => $validated['cityName'] ?? '',
            'timezone' => $validated['timezone'] ?? '',
        ]]);

        return $this->broadcastAndRespond($setting);
    }

    public function startTimer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'seconds' => ['required', 'integer', 'min:1', 'max:'.(24 * 60 * 60)],
        ]);

        $setting = WorldClockSetting::instance();
        $setting->update(['timer_ends_at' => now()->addSeconds($validated['seconds'])]);

        return $this->broadcastAndRespond($setting);
    }

    public function stopTimer(): JsonResponse
    {
        $setting = WorldClockSetting::instance();
        $setting->update(['timer_ends_at' => null]);

        return $this->broadcastAndRespond($setting);
    }

    /**
     * Broadcast the change to every other connected client (the originator is
     * excluded via the X-Socket-ID header) and return the fresh state so the
     * caller can reconcile even when websockets are unavailable.
     */
    private function broadcastAndRespond(WorldClockSetting $setting): JsonResponse
    {
        broadcast(new WorldClockUpdated($setting))->toOthers();

        return response()->json(WorldClockState::payload($setting));
    }
}
