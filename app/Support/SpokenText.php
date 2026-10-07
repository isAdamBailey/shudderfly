<?php

namespace App\Support;

/**
 * The words the frontend reads aloud from stored HTML (page content, book
 * titles and excerpts), so a clip made on the server matches the one the
 * browser asks for.
 */
class SpokenText
{
    /**
     * Strips tags only; entities are left as they are. Must match the
     * browser's version: `plainText` in resources/js/Pages/Page/Show.vue
     * and `stripHtml` in resources/js/Pages/Book/Show.vue. If they differ,
     * the clip warmed here is never the one played.
     */
    public static function fromHtml(?string $html): string
    {
        return preg_replace('/<\/?[^>]+(>|$)/', '', (string) $html);
    }
}
