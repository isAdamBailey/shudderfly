<?php

namespace App\Support;

use App\Models\SiteSetting;

/**
 * Gate for the third-party AI text calls: media descriptions and the weekly
 * profile overviews. The AI voice has its own gate, App\Support\AiVoice.
 */
class AiFeature
{
    public const SETTING_KEY = 'ai_descriptions_enabled';

    public static function enabled(): bool
    {
        return (bool) SiteSetting::where('key', self::SETTING_KEY)->first()?->value;
    }
}
