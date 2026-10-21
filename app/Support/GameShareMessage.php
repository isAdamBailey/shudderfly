<?php

namespace App\Support;

final class GameShareMessage
{
    /** An invite's place (GameController::invite): the scene id, then the
     * place's name, which is kept when the marker is stripped. Scene ids
     * have dots (`house.hall`), so unlike a score's slug this allows them. */
    public const INVITE_MARKER = '/\x{E000}w:([a-z0-9.-]+)\x{E000}([^\x{E000}]*)\x{E000}/u';

    /**
     * Remove embedded game slug marker from chat message text (see GameController::shareScore): `m:` a minigame or game; older messages carry `g:` and a game's slug. An invite's marker leaves the place's name.
     */
    public static function stripSlugMarker(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        $text = preg_replace(self::INVITE_MARKER, '$2', $text);

        return preg_replace('/\x{E000}[gm]:[a-z0-9-]+\x{E000}/u', '', $text);
    }

    /** Marks `$place` in an invite as the way into scene `$scene`. */
    public static function invitePlace(string $scene, string $place): string
    {
        return "\u{E000}w:{$scene}\u{E000}{$place}\u{E000}";
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
