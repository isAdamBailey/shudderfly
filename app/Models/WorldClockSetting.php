<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorldClockSetting extends Model
{
    protected $fillable = [
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
        $setting = static::firstOrCreate([]);

        if (empty($setting->cities)) {
            $setting->cities = array_slice(
                config('world_clock.default_cities', []),
                0,
                config('world_clock.max_cities', 6)
            );
            $setting->save();
        }

        return $setting;
    }
}
