// How much of an item's description the timeline shows in its caption.
export const EXCERPT_LIMIT = 120;

/**
 * Turn stored rich text into a single plain-text line, safe to drop into an
 * alt attribute or a caption. Pair it with lodash's `truncate` to shorten the
 * result — lodash has no HTML-aware equivalent of this.
 */
export const stripHtml = (html) => {
    if (!html) return "";

    const tmp = document.createElement("div");
    tmp.innerHTML = html;

    return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
};

/**
 * Removes tags only, leaving entities and spacing alone: the text a page or
 * book title is read aloud as. Must match App\Support\SpokenText::fromHtml(),
 * which warms AI voice clips on the server; if they differ, the warmed clip
 * is never the one played. Unlike stripHtml, it needs no DOM.
 */
export const stripTags = (html) =>
    String(html ?? "").replace(/<\/?[^>]+(>|$)/g, "");
