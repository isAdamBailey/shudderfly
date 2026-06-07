<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorldClockSetting extends Model
{
    protected $fillable = [
        'key',
        'cities',
        'face_preset',
        'hand_preset',
        'numerals',
        'second_hand_mode',
        'logo',
        'timer_ends_at',
    ];

    protected $casts = [
        'cities' => 'array',
        'logo' => 'array',
        'timer_ends_at' => 'datetime',
    ];

    /**
     * The single global row of world clock settings. Always returns exactly one
     * record, seeding the city list from config on first creation so the page
     * works before anyone has customized it.
     */
    public static function instance(): self
    {
        $setting = static::firstOrCreate(['key' => 'global']);
        $max = config('world_clock.max_cities', 6);
        $cities = $setting->cities ?? [];

        if (empty($cities)) {
            // Seed from config on first use.
            $setting->cities = array_slice(config('world_clock.default_cities', []), 0, $max);
            $setting->save();
        } elseif (count($cities) > $max) {
            // Heal rows that exceed the limit (e.g. seeded before the cap), so
            // saving settings — which sends the whole city list — doesn't fail
            // validation and silently drop appearance changes.
            $setting->cities = array_slice($cities, 0, $max);
            $setting->save();
        }

        return $setting;
    }
}
