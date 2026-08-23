<?php

namespace App\Support;

/**
 * Helpers for the rich-text HTML stored in Page::$content.
 */
final class Content
{
    /**
     * Whether the given rich text holds no actual words.
     *
     * The editor leaves markup behind even when the user typed nothing, so
     * "<p></p>", "<p><br></p>" and "<p>&nbsp;</p>" all count as blank.
     */
    public static function isBlank(?string $html): bool
    {
        $text = html_entity_decode(strip_tags((string) $html), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // trim() alone leaves the non-breaking space that &nbsp; decodes to.
        return preg_replace('/[\s\x{00A0}]+/u', '', $text) === '';
    }
}
