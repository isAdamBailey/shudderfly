<?php

namespace App\Support;

use App\Models\SiteSetting;
use Illuminate\Support\Collection;

/**
 * Gate for the AI voice: while off, the app speaks with the device's
 * speechSynthesis voice and never calls the TTS provider.
 */
class AiVoice
{
    public const SETTING_KEY = 'ai_voice_enabled';

    /**
     * The flag is on and the provider has a key. Without the key every
     * request would fail, so the client should not even try.
     *
     * @param  Collection<int, SiteSetting>|null  $settings  every SiteSetting,
     *                                                       when the caller has
     *                                                       already loaded them
     */
    public static function enabled(?Collection $settings = null): bool
    {
        if (! self::configured()) {
            return false;
        }

        $setting = $settings
            ? $settings->firstWhere('key', self::SETTING_KEY)
            : SiteSetting::where('key', self::SETTING_KEY)->first();

        return (bool) $setting?->value;
    }

    public static function configured(): bool
    {
        return trim((string) config('services.ai_voice.api_key')) !== '';
    }
}
