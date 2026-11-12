<?php

namespace App\Support;

use App\Models\SiteSetting;

/** Gate for recording voice clips in the Message Builder. */
class VoiceMessages
{
    public const SETTING_KEY = 'voice_messages_enabled';

    public static function enabled(): bool
    {
        return (bool) SiteSetting::where('key', self::SETTING_KEY)->first()?->value;
    }
}
