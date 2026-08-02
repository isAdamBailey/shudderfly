# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The whole family — kids and adults with mixed ages. Adults curate and upload; everyone browses, reads, and relives shared memories. Sessions are casual and personal, not performance-oriented.

## Product Purpose

Shudderfly is a private family media app for collecting, organizing, and revisiting family-friendly photos, videos, books, songs, and moments — without ads, public feeds, or third-party social distractions. Success means finding a memory quickly, enjoying it together, and feeling at home in a space that belongs only to the family.

## Positioning

Shudderfly's mechanism is the combination of three things a generic social or cloud-photo app couldn't truthfully copy:

-   **Private-by-design** — no ads, no engagement algorithm, no public feed. What it deliberately excludes is as load-bearing as what it includes.
-   **A book/collage format, not a stream** — memories are organized into storybook-like books and collages (with a page-count cap enforced via `App\Support\Collage::MAX_PAGES`) rather than an endless, algorithmically-ordered scroll. Structure and revisitability over infinite scroll.
-   **Genuinely built for the whole family's age range in one session** — large tap targets, read-aloud (`useSpeechSynthesis`), simple navigation paths — not just "family-friendly content" bolted onto adult-oriented UI patterns.

## Operating Context

Family members sign in to browse and curate books (pages of photos/video/audio), collages, music (synced from YouTube playlists), games, and a family chat/messaging system, plus a shared world-clock view. Adults with `edit pages` permission upload and organize content; `admin` permission holders manage site settings, categories, and users. The app shifts its seasonal skin (Christmas, Halloween, fireworks) automatically by month. Background jobs (queued, SQS in production) handle media processing; weekly scheduled jobs clean up stale content and send AI-generated family summaries and digest emails.

## Capabilities and Constraints

-   Laravel 13 + Vue 3 via Inertia.js (no separate API); Ziggy exposes named routes to the frontend.
-   Three Spatie permissions gate functionality: `edit pages`, `edit profile`, `admin`.
-   Many features are toggled per-deployment via `SiteSetting` feature flags: `music_enabled`, `messaging_enabled`, `sounds_enabled`, `cockroaches_enabled`, `street_view_enabled`, `youtube_enabled`.
-   Media is served from S3/CloudFront in production, local disk in development.
-   Search (Books, Pages, Songs) runs on Laravel Scout + Meilisearch.
-   Localization: English and Spanish are both required for any new user-facing string (`lang/en`, `lang/es`, read via `useTranslations()`); this is a hard constraint on new UI copy, not optional polish.

## Evidence on Hand

None on hand, and none should be fabricated. This is a private, in-use family app rather than a product with public marketing evidence (testimonials, case studies, press) — future work should not invent any.

## Brand Personality

Warm and playful. A family home for memories: seasonal delight (Christmas, Halloween, fireworks), storybook touches (drop caps, 3D book cards), and gentle whimsy — not spectacle for its own sake. Voice is friendly, inclusive, and unhurried.

## Anti-references

-   Public social feeds (Instagram, TikTok, infinite-scroll performance culture)
-   Corporate SaaS dashboards (gray, sterile, generic admin chrome)
-   Generic AI-generated UI (cream/sand backgrounds, gradient text, tracked eyebrow labels, numbered section scaffolds)

## Design Principles

1. **Memory-first** — Every surface should help someone find, open, and relive a family moment; navigation and hierarchy serve recall, not engagement metrics.
2. **Play without spectacle** — Delight through books, themes, and tactile interactions; avoid feed mechanics, social proof, or attention traps.
3. **Private by default** — No public-performance patterns; the app feels like a closed family room, not a stage.
4. **Readable for everyone** — Clear hierarchy, generous touch targets, and copy that works for kids and adults in the same session.
5. **Identity over template** — Keep Shudderfly’s storybook-home character; resist generic app chrome even when adding new features.

## Accessibility & Inclusion

Extra readability for kids: larger tap targets, clear labels, simple navigation paths, and high-contrast text where content is read aloud or shared across ages. Respect `prefers-reduced-motion` for animations and seasonal effects. Sensible defaults everywhere; no feature should require fine motor precision or dense UI literacy.
