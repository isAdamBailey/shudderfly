<?php

namespace App\Support;

use App\Models\SiteSetting;

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
     */
    public static function enabled(): bool
    {
        return self::configured()
            && (bool) SiteSetting::where('key', self::SETTING_KEY)->first()?->value;
    }

    public static function configured(): bool
    {
        return trim((string) config('services.ai_voice.api_key')) !== '';
    }
}
