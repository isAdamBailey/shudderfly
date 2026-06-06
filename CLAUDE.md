# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All PHP commands must run through Laravel Sail (Docker), never bare `php`.

### Backend

```bash
./vendor/bin/sail up -d          # Start Docker services (MySQL, Meilisearch)
sail artisan migrate             # Run migrations
sail artisan migrate:fresh --seed  # Fresh DB with seed data
sail test                        # Run all PHP tests
sail test --filter=BooksTest     # Run a single PHP test class
sail pint                        # Format PHP (run after changing .php files)
```

### Frontend

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run test:run     # Run Vitest once (CI-style, exits after)
npm run test         # Vitest in watch mode (interactive, won't exit)
npm run lint         # ESLint + fix
npm run format       # Prettier
```

### Scout (Meilisearch)

```bash
sail artisan scout:import "App\Models\Book"
sail artisan scout:import "App\Models\Page"
sail artisan scout:import "App\Models\Song"
```

## Pre-push hook

A Cursor hook runs both `npm run test:run` and `sail test` before any `git push` to `origin`. Failing tests block the push — fix them and retry.

## Architecture

### Stack

Laravel 13 backend + Vue 3 frontend connected via **Inertia.js** (no separate API — controllers return `Inertia::render()` responses and the Vue pages receive typed props directly). Routing uses **Ziggy** to expose named Laravel routes to JavaScript.

### Data flow

1. Laravel controller fetches data, passes it as Inertia props to a Vue page component under `resources/js/Pages/`.
2. `HandleInertiaRequests` middleware shares global props to every page: `auth.user` (with `permissions_list` and `avatar_url` appended), `settings` (from `SiteSetting` model), `theme` (month-based: christmas/fireworks/halloween), `flash` messages, `translations`, `collageMaxPages`, and `unread_notifications_count`.
3. Frontend uses `usePage()` from Inertia to read shared props; `usePermissions()` composable (`resources/js/composables/permissions.js`) checks `auth.user.permissions_list`.

### Permissions

Three Spatie permissions gate functionality: `edit pages`, `edit profile`, `admin`. Route groups in `routes/web.php` enforce these server-side; the `usePermissions()` composable checks them client-side for UI visibility.

### Media storage

- Local: `FILESYSTEM_DISK=local`, media served via S3 URL
- Production: S3 for upload, CloudFront for delivery
- `Page::getMediaPathAttribute` and `Page::getMediaPosterAttribute` automatically return the correct URL based on environment

### Background jobs

Queued jobs in `app/Jobs/` handle media processing: `StoreImage`, `StoreVideo`, `StoreSoundAudio`, `CreateVideoSnapshot`, `GenerateCollagePdf`. Local dev uses `QUEUE_CONNECTION=sync` (runs inline). Production uses Amazon SQS.

### Scheduled commands

Defined in `app/Console/Kernel.php`, all run weekly on Sunday (America/Los_Angeles):
- `pages:cleanup-stale` — removes stale page records
- `users:generate-weekly-overviews` — AI summaries via Hugging Face
- `send:weekly-stats-mail` — weekly digest email
- `music:sync-youtube` — daily sync if `music_enabled` setting is on
- `messages:cleanup` — daily cleanup if `messaging_enabled` is on

### Search

Laravel Scout + Meilisearch indexes `Book`, `Page`, and `Song` models. `Page::shouldBeSearchable()` excludes blocked pages. Scout driver is set to `null` in tests (`phpunit.xml`).

### Real-time

Pusher + Laravel Echo for broadcasting events (`MessageCreated`, `CommentCreated`, etc.). Web Push (VAPID) for browser push notifications via `PushNotificationService`.

### Frontend structure

- `resources/js/Pages/` — Inertia page components (one per route, organized by feature)
- `resources/js/Components/` — reusable Vue components; feature subfolders for `Messages/`, `Music/`, `Map/`, `Games/`
- `resources/js/composables/` — Vue composables for shared logic (`useMusicPlayer`, `usePermissions`, `useSpeechSynthesis`, `useInfiniteScroll`, etc.)
- `.test.js` files colocate with their component/composable

### Feature flags via SiteSettings

Many features are toggled via `SiteSetting` records (checked in `Kernel.php` and passed as `settings` prop): `music_enabled`, `messaging_enabled`, `sounds_enabled`, `cockroaches_enabled`, `street_view_enabled`, `youtube_enabled`.

### Collage system

`Collage` → `CollagePage` (pivot) → `Page`. Max pages enforced via `config('collage.max_pages')` (default 16, defined in `App\Support\Collage::MAX_PAGES`). PDF generation is a queued job (`GenerateCollagePdf`) using DomPDF.

### Tests

- PHP: Feature tests use SQLite in-memory with `RefreshDatabase`; AWS credentials stubbed in `phpunit.xml`
- JS: Vitest with jsdom; setup file at `resources/js/vitest.setup.js`
