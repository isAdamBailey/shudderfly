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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'key' => [
                'required',
                'string',
                'unique:site_settings,key',
                'regex:/^[^\s]+$/',
            ],
            'value' => ['required'],
            'description' => ['required', 'string'],
            'type' => ['required', 'string', 'in:boolean,text'],
        ], [
            'key.regex' => 'The key cannot contain spaces.',
            'type.in' => 'The type must be either boolean or text.',
        ]);

        $value = $validated['value'];
        if ($validated['type'] === 'boolean') {
            $value = filter_var($value, FILTER_VALIDATE_BOOLEAN) ? '1' : '0';
        }

        SiteSetting::create([
            'key' => $validated['key'],
            'value' => $value,
            'description' => $validated['description'],
            'type' => $validated['type'],
        ]);

        return redirect(route('dashboard'));
    }

    public function destroy(SiteSetting $setting)
    {
        $setting->delete();

        return redirect(route('dashboard'));
    }
}
