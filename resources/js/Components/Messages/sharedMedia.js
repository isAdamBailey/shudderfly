// Sizing for the media attached to a timeline message — page images, video
// embeds, song and movie art, book covers, collage previews and the excerpt
// caption that sits under them. The timeline column is narrow on a phone and
// very wide on a desktop, so the media scales with the viewport instead of
// sitting at one fixed thumbnail size. Width and height step together so a
// square image stays square at every breakpoint.
//
// Kept in a plain module so the shared-content branches read from one place
// rather than repeating the same literal a dozen times.
export const SHARED_MEDIA_WIDTH_CLASS =
    "w-full max-w-[260px] sm:max-w-[360px] lg:max-w-[460px]";

// The sound share is a text row (emoji, title, play icon) rather than a media
// box, so it stays narrow — stretched to the full media width it would be
// mostly gap.
export const SHARED_SOUND_WIDTH_CLASS = "w-full max-w-[260px]";

export const SHARED_MEDIA_HEIGHT_CLASS =
    "max-h-[260px] sm:max-h-[360px] lg:max-h-[460px]";

// Fallback placeholders (no cover, no poster, no preview) get their size from
// the aspect ratio instead. Capping their height would fight that ratio and
// square them off, so they take an explicit height and let the width follow.
export const SHARED_MEDIA_FIXED_HEIGHT_CLASS =
    "h-[260px] sm:h-[360px] lg:h-[460px]";
