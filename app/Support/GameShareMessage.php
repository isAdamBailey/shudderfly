<?php

namespace App\Support;

final class GameShareMessage
{
    /**
     * Remove embedded game slug marker from chat message text (see GameController::shareScore): `m:` a minigame or game; older messages carry `g:` and a game's slug.
     */
    public static function stripSlugMarker(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        return preg_replace('/\x{E000}[gm]:[a-z0-9-]+\x{E000}/u', '', $text);
    }

    /**
     * Extract embedded game slug from chat message text (see GameController::shareScore).
     */
    public static function slugFromContent(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return null;
        }

        return preg_match('/\x{E000}[gm]:([a-z0-9-]+)\x{E000}/u', $text, $matches) === 1
            ? $matches[1]
            : null;
    }
}
