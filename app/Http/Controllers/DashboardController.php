<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function show()
    {
        return Inertia::render('Dashboard/Index', [
            'users' => Inertia::defer(fn () => User::all()),
            'categories' => Inertia::defer(fn () => Category::withCount('books')->get()),
            'stats' => Inertia::defer(fn () => [
                'numberOfBooks' => Book::count(),
                'numberOfPages' => Page::count(),
                'leastPages' => Book::withCount('pages')
                    ->orderBy('pages_count')
                    ->orderBy('created_at')
                    ->first()
                    ->toArray(),
                'mostPages' => Book::withCount('pages')
                    ->orderBy('pages_count', 'desc')
                    ->orderBy('created_at')
                    ->first()
                    ->toArray(),
            ]),
            'settings' => SiteSetting::all()->map(function ($setting) {
                return [
                    'id' => $setting->id,
                    'key' => $setting->key,
                    'value' => $setting->value,
                    'description' => $setting->description,
                    'type' => in_array($setting->key, SiteSetting::$booleanSettings) ? 'boolean' : 'text',
                ];
            }),
        ]);
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['required', function ($attribute, $value, $fail) {
                if (!isset($value['value']) || (!is_string($value['value']) && !is_numeric($value['value']) && !is_bool($value['value']) && $value['value'] !== '0' && $value['value'] !== '1')) {
                    $fail('The '.$attribute.' value must be a string, numeric, or boolean value.');
                }
                if (!isset($value['description']) || !is_string($value['description'])) {
                    $fail('The '.$attribute.' description must be a string.');
                }
            }],
        ]);

        foreach ($validated['settings'] as $key => $data) {
            $value = $data['value'];
            if (is_bool($value)) {
                $value = $value ? '1' : '0';
            }

            SiteSetting::where('key', $key)->update([
                'value' => $value,
                'description' => $data['description']
            ]);
        }

        return redirect(route('dashboard'));
    }
}
