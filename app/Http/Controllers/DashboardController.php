<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use App\Models\User;
use App\Models\SiteSetting;
use Inertia\Inertia;
use Illuminate\Http\Request;

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
                    'type' => in_array($setting->key, SiteSetting::$booleanSettings) ? 'boolean' : 'text'
                ];
            })
        ]);
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['required', function ($attribute, $value, $fail) {
                if (!is_string($value) && !is_numeric($value) && !is_bool($value) && $value !== '0' && $value !== '1') {
                    $fail('The '.$attribute.' must be a string, numeric, or boolean value.');
                }
            }],
        ]);

        foreach ($validated['settings'] as $key => $value) {
            if (is_bool($value)) {
                $value = $value ? '1' : '0';
            }
            
            SiteSetting::where('key', $key)->update(['value' => $value]);
        }

        return redirect(route('dashboard'));
    }
}
