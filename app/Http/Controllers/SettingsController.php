<?php

namespace App\Http\Controllers;

use App\Models\SiteSetting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        return SiteSetting::all()->map(function ($setting) {
            // Get raw value from database to avoid accessor conversion
            $rawValue = $setting->getAttributes()['value'] ?? $setting->value;

            return [
                'id' => $setting->id,
                'key' => $setting->key,
                'value' => $rawValue,
                'description' => $setting->description,
                'type' => $setting->type,
            ];
        });
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*' => ['required', function ($attribute, $value, $fail) {
                // Allow null/undefined values (they will be handled as empty strings)
                if (! isset($value['value'])) {
                    return;
                }
                
                $val = $value['value'];
                // Accept string, numeric, boolean, null, or the specific strings '0'/'1'
                if (! is_string($val) && ! is_numeric($val) && ! is_bool($val) && $val !== null && $val !== '0' && $val !== '1') {
                    $fail('The '.$attribute.' value must be a string, numeric, or boolean value.');
                }
                if (! isset($value['description']) || ! is_string($value['description'])) {
                    $fail('The '.$attribute.' description must be a string.');
                }
            }],
        ]);

        foreach ($validated['settings'] as $key => $data) {
            $setting = SiteSetting::where('key', $key)->first();

            if (! $setting) {
                continue;
            }

            $value = $data['value'] ?? null;

            if ($setting->type === 'boolean') {
                // Handle boolean values: true/1/'1' -> '1', false/0/'0'/null -> '0'
                if ($value === true || $value === 1 || $value === '1') {
                    $value = '1';
                } else {
                    $value = '0';
                }
            } else {
                // For non-boolean values, convert to string (handle null as empty string)
                $value = $value !== null ? (string) $value : '';
            }

            // Update directly using update() - Laravel will handle the value correctly
            $setting->update([
                'value' => $value,
                'description' => $data['description'] ?? '',
            ]);
        }

        return redirect(route('dashboard'));
    }
}
