<?php

namespace App\Support;

use App\Models\WorldClockSetting;

final class WorldClockState
{
    /**
     * The canonical world clock payload shared everywhere: Inertia props,
     * broadcast events, and JSON responses. `server_now` lets clients compute a
     * clock-skew offset so the timer counts down identically for everyone.
     *
     * @return array<string, mixed>
     */
    public static function payload(WorldClockSetting $setting): array
    {
        return [
            'cities' => $setting->cities ?? [],
            'face_preset' => $setting->face_preset,
            'hand_preset' => $setting->hand_preset,
            'numerals' => $setting->numerals,
            'second_hand_mode' => $setting->second_hand_mode,
            'logo' => $setting->logo ?? ['enabled' => false],
            'timer_ends_at' => optional($setting->timer_ends_at)->toIso8601String(),
            'server_now' => now()->toIso8601String(),
        ];
    }
}
