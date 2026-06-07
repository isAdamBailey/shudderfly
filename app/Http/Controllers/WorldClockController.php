<?php

namespace App\Http\Controllers;

use App\Models\TimezoneLabel;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WorldClockController extends Controller
{
    public function index(): Response
    {
        $defaultCities = collect(config('world_clock.default_cities'))
            ->map(fn (string $timezone) => $this->describeTimezone($timezone))
            ->values()
            ->all();

        return Inertia::render('WorldClock/Index', [
            'defaultCities' => $defaultCities,
            'maxCities' => config('world_clock.max_cities'),
            'timezoneLabels' => TimezoneLabel::pluck('label', 'timezone'),
        ]);
    }

    public function searchCities(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $needle = mb_strtolower($validated['q']);

        $results = collect(DateTimeZone::listIdentifiers(DateTimeZone::ALL))
            ->map(fn (string $identifier) => $this->describeTimezone($identifier))
            ->filter(fn (array $city) => str_contains(mb_strtolower($city['timezone']), $needle)
                || str_contains(mb_strtolower($city['name']), $needle)
                || str_contains(mb_strtolower($city['region']), $needle))
            ->unique('timezone')
            ->take(15)
            ->values()
            ->all();

        return response()->json($results);
    }

    public function updateLabel(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'timezone' => ['required', 'string', Rule::in(DateTimeZone::listIdentifiers(DateTimeZone::ALL))],
            'label' => ['nullable', 'string', 'max:100'],
        ]);

        $timezone = $validated['timezone'];
        $label = trim((string) ($validated['label'] ?? ''));

        if ($label === '') {
            TimezoneLabel::where('timezone', $timezone)->delete();

            return response()->json(['timezone' => $timezone, 'label' => null]);
        }

        TimezoneLabel::updateOrCreate(['timezone' => $timezone], ['label' => $label]);

        return response()->json(['timezone' => $timezone, 'label' => $label]);
    }

    /**
     * Derive a friendly display name and region from an IANA timezone
     * identifier, e.g. "America/Argentina/Buenos_Aires" becomes
     * name "Buenos Aires" and region "America / Argentina".
     */
    private function describeTimezone(string $identifier): array
    {
        $segments = explode('/', $identifier);
        $name = str_replace('_', ' ', array_pop($segments));
        $region = implode(' / ', array_map(fn (string $segment) => str_replace('_', ' ', $segment), $segments));

        return [
            'name' => $name,
            'timezone' => $identifier,
            'region' => $region,
        ];
    }
}
