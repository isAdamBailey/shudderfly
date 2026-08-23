<?php

namespace App\Support;

use App\Models\SiteSetting;

/**
 * Single gate for every third-party AI call the app makes: media
 * descriptions and the weekly profile overviews.
 */
class AiFeature
{
    public const SETTING_KEY = 'ai_descriptions_enabled';

    public static function enabled(): bool
    {
        return (bool) SiteSetting::where('key', self::SETTING_KEY)->first()?->value;
    }
}
