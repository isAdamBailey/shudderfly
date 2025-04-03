<?php

namespace App\Http\Controllers;

use App\Models\SiteSetting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index()
    {
        return SiteSetting::all()->map(function ($setting) {
            return [
                'id' => $setting->id,
                'key' => $setting->key,
                'value' => $setting->value,
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
                if (! isset($value['value']) || (! is_string($value['value']) && ! is_numeric($value['value']) && ! is_bool($value['value']) && $value['value'] !== '0' && $value['value'] !== '1')) {
                    $fail('The '.$attribute.' value must be a string, numeric, or boolean value.');
                }
                if (! isset($value['description']) || ! is_string($value['description'])) {
                    $fail('The '.$attribute.' description must be a string.');
                }
            }],
        ]);

        foreach ($validated['settings'] as $key => $data) {
            $setting = SiteSetting::where('key', $key)->first();
            $value = $data['value'];

            if ($setting->type === 'boolean') {
                $value = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? '1' : '0';
            }

            $setting->update([
                'value' => $value,
                'description' => $data['description'],
            ]);
        }

        return redirect(route('dashboard'));
    }
}
