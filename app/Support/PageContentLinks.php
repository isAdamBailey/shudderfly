<?php

namespace App\Support;

use App\Models\Page;

/**
 * Links from one page's rich text to another page.
 *
 * Video snapshots are saved with an attribution line that links back to the
 * page the frame was grabbed from ("... took this screenshot from this
 * video"), and that link is baked into the snapshot's stored content as a
 * plain `/pages/{id}` href. The page it points at can stop being viewable
 * long after the snapshot was written -- it is deleted by hand or by
 * pages:cleanup-stale, it gets blocked, or YouTube pages are switched off --
 * and PageController::show() answers 404 for every one of those, so the link
 * drops the reader on the "we couldn't find anything here" page.
 *
 * The link is therefore resolved when the content is rendered rather than
 * trusted as written: a target that is still viewable keeps its anchor, and
 * anything else keeps the sentence but loses the link.
 */
final class PageContentLinks
{
    /**
     * An anchor pointing at this app's pages.show, in either quote style and
     * either as a bare path or against the app's own URL -- a link to
     * /pages/{id} somewhere else on the web is somebody else's page and is
     * left alone. Group 1 is the quote, 2 the page id, 3 the label.
     */
    private static function linkPattern(): string
    {
        $appUrl = preg_quote(rtrim((string) config('app.url'), '/'), '#');

        return '#<a\b[^>]*\bhref=(["\'])(?:'.$appUrl.')?/pages/(\d+)(?:[?\#][^"\']*)?\1[^>]*>(.*?)</a>#is';
    }

    /**
     * The attribution line a snapshot page is created with.
     *
     * The link is left out when the source page is already gone, so a
     * snapshot never starts life pointing at a 404.
     */
    public static function snapshotAttribution(string $userName, int $sourcePageId): string
    {
        $source = "<strong>{$userName}</strong> took this screenshot from ";

        if (! Page::whereKey($sourcePageId)->exists()) {
            return "<p>{$source}<strong>this video</strong>.</p>";
        }

        $url = route('pages.show', $sourcePageId, absolute: false);

        return "<p>{$source}<strong><a href='{$url}'>this video</a></strong>.</p>";
    }

    /**
     * The same rich text with links to pages the reader cannot open replaced
     * by their own label, so a dead link reads as plain words instead of
     * leading to a 404. Content without page links is returned untouched and
     * costs no query.
     */
    public static function unlinkUnviewable(?string $html, bool $youtubeEnabled): ?string
    {
        if ($html === null || $html === '') {
            return $html;
        }

        $pattern = self::linkPattern();

        if (! preg_match_all($pattern, $html, $matches)) {
            return $html;
        }

        $viewable = Page::query()
            ->notBlocked()
            ->whereIn('id', array_map('intval', $matches[2]))
            ->when(! $youtubeEnabled, fn ($query) => $query->whereNull('video_link'))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        return preg_replace_callback(
            $pattern,
            fn ($match) => in_array((int) $match[2], $viewable, true) ? $match[0] : $match[3],
            $html
        );
    }
}
