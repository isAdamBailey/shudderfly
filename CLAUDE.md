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

## Running tests without Docker/Sail

Some sandboxed/remote environments (e.g. Claude Code's cloud execution environment) cannot pull Docker images, so `sail up -d` fails with a DNS/registry error and Sail is unusable. In that situation, fall back to running PHP tests directly against the project's `vendor/bin/phpunit` — `phpunit.xml` already configures SQLite in-memory (`DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`) and stubbed AWS/mail/cache drivers, so no Docker services are required:

```bash
cp .env.example .env              # if .env doesn't exist yet
php artisan key:generate --force  # phpunit needs APP_KEY set
npm run build                     # generates public/build manifest; without it
                                   # any test asserting an Inertia response fails
                                   # with "Not a valid Inertia response"
./vendor/bin/phpunit                          # full suite
./vendor/bin/phpunit tests/Feature/BooksTest.php   # single test class
```

This is a fallback for when Sail genuinely cannot run — prefer `sail test` whenever Docker is available, since it matches CI/production more closely (MySQL instead of SQLite, etc).

## Architecture

### Stack

Laravel 13 backend + Vue 3 frontend connected via **Inertia.js** (no separate API — controllers return `Inertia::render()` responses and the Vue pages receive typed props directly). Routing uses **Ziggy** to expose named Laravel routes to JavaScript.

### Data flow

1. Laravel controller fetches data, passes it as Inertia props to a Vue page component under `resources/js/Pages/`.
2. `HandleInertiaRequests` middleware shares global props to every page: `auth.user` (with `permissions_list` and `avatar_url` appended), `settings` (from `SiteSetting` model), `theme` (month-based: christmas/fireworks/halloween), `flash` messages, `translations`, `collageMaxPages`, and `unread_notifications_count`.
3. Frontend uses `usePage()` from Inertia to read shared props; `usePermissions()` composable (`resources/js/composables/permissions.js`) checks `auth.user.permissions_list`.

### Seasonal theme

`HandleInertiaRequests::getCurrentTheme()` maps the current month to one of three theme strings — `christmas` (December), `fireworks` (July), `halloween` (October) — or `''` the rest of the year. That value is shared as the `theme` Inertia prop (`HandleInertiaRequests::share()`) and also stamped as `data-theme="{{ $page['props']['theme'] }}"` on `<html>` in `resources/views/app.blade.php`, so it's readable both from Vue (`usePage().props.theme` / `$page.props.theme`) and from plain CSS attribute selectors. There is no in-app override; `FORCE_THEME` in `.env` (read via `config('app.force_theme')`) pins the theme year-round, which is how you preview one outside its month — set it, run `sail artisan config:clear`, reload. Anything not in `HandleInertiaRequests::THEMES` (including blank/unset) falls back to the month, so a typo cannot ship an unstyled theme name; `phpunit.xml` blanks it as both `<env>` and `<server>` so the suite always tests the month mapping even when the flag is exported in the shell.

Note that the seasonal Tailwind variants are registered as `html[data-theme="..."] &` in `tailwind.config.js`. The `html` prefix is load-bearing: without it they tie with Tailwind's `dark:` variant on specificity (both 0,2,0) and lose on source order, which silently disabled every seasonal utility for dark-mode users (`<html>` gets its `dark` class from `ThemeToggle.vue` or the OS preference, so the utilities did work in light mode).

Adding a new theme, or changing what an existing one looks like, touches several independent places — there is no single registry:

-   `app/Http/Middleware/HandleInertiaRequests.php::getCurrentTheme()` — the month → theme string mapping.
-   `resources/css/app.css` — global `[data-theme="..."]` overrides (the Christmas and Halloween night backdrops: fixed `body::before`/`::after` layers at negative z-index, which only show because both layouts carry `christmas:bg-transparent halloween:bg-transparent`, so a new backdrop theme needs that class too) and the `text-theme-*` / `bg-theme-*` / `border-theme-*` / `ring-theme-*` Tailwind utility classes (~line 28 onward), each of which lists a Tailwind variant per theme (`christmas:`, `halloween:`, `fireworks:`) plus a default. A new theme name needs a variant added to every one of these utilities, not just a new block.
-   `resources/js/Components/ThemeLogoIcon.vue` — `isChristmas` / `isJuly` / `isHalloween` computeds swap the header logo SVG.
-   `resources/js/Components/FireworksAnimation.vue` and `resources/js/Layouts/Nav/Navigation.vue` — both branch on `$page.props.theme === 'fireworks'` specifically (sparks overlay, nav styling), not on a generic "is themed" check.
-   `resources/js/Pages/Books/Index.vue` — reads `usePage().props.theme` to decide the "themed books" section's label.
-   `config/services.php` — `ai_voice.seasonal_voices` maps a theme to a per-locale AI voice (`christmas` → Santa in `en`/`es`), shared to the client as `aiVoice.seasonal` for the current theme. `resolveAiVoice()` in `resources/js/composables/aiVoice.js` uses it instead of the locale default for people who never picked a voice, and server-side warming (`AiVoice::warm()`, `ai-voice:prewarm`) makes clips in the same voice (`AiVoice::warmingVoice()`).
-   `resources/js/Pages/Games/World/three/themes.js` — the Games World is drawn in WebGL (Three.js) and keeps its own palette rather than the `bg-theme-*` tokens above: `WORLD_THEMES` maps a theme to its sky, ridge (`hill`), ground, the street's building colours, its lighting (key and ambient light, whether windows glow via `lit`, and fireworks `flashes`), drifting emoji (`☁️` / `✨`; `null` for none), a string of lights along every building's eaves (`bulbs`) and real falling snow (`snowfall`), the last two Christmas's, read by `worldTheme(usePage().props.theme)` in each WebGL scene (`World/scenes/Road3D.vue` → `RoadScene.js`). A test holds its keys to `HandleInertiaRequests::THEMES`, so a new theme fails until it is added here. It will not pick up anything from `app.css`. The same file's `NIGHTS` is each theme's road at night, read through `worldNight(theme)`; an entry may only change the sky, `ridgeTint`, `lit`/`litIntensity`, `key` and `ambient`, and a theme without one (fireworks, already night) gets the default night.
-   `resources/js/Pages/Games/World/three/roomLooks.js` — the Games World rooms (the Butt's House and the other buildings) take their seasonal look from here, not from `WORLD_THEMES`: `DAYLIGHT` keys each theme's light from behind the camera (sky, ground and key colours, plus `dim` to scale it, which is how Halloween is darker), and `DECORATIONS` keys the emoji hung on the wall the camera faces in every room (garland, cobwebs, fireworks). `RoomScene.js` reads both through `roomDaylight(theme)` / `roomDecorations(theme)`. A test holds both to `HandleInertiaRequests::THEMES`. `NIGHT` there is one night for every theme: it dims and tints the daylight on top of the seasonal look, and the room's lamps light it. Every room has the same daylight (`DAYLIGHT_INTENSITY` in `RoomScene.js`; rooms have no `ambient` of their own), modelled on Guster's House (once the Poop's): by day a room is lit and its lamps only add to it, so it can be seen with them off; at night it is dark, every lamp comes on, and switching them off leaves it very dark.

The Games World also follows dark mode, separately from the seasonal theme: `resources/js/composables/useDarkMode.js` watches the `dark` class on `<html>`, so the header toggle turns the road and rooms to night live (about 300 ms, at once under reduced motion). Room lamps are the scene's `lights` in `App\Support\GamesWorld` (1 to `ROOM_LIGHTS_MAX` = 4 per room, each room with a switch, enforced by `GamesWorldScenesTest`); the Library's are generated in `library()`. Point lights are compiled into every shader, so a scene never adds or removes one at runtime — switching only changes intensity.

-   `resources/js/Pages/Games/World/scenes/RoadScene.vue` — the DOM road, now only the no-WebGL fallback, keeps a simpler version of the look as local CSS (its sky, ridge and drifting emoji only: no building colours, eave lights or real snow, so at Christmas it still drifts `❄️` where WebGL has `drifter: null` and snowfall): it binds a `theme-christmas` / `theme-halloween` / `theme-fireworks` class on its `.road-scene` root (computed from `usePage().props.theme`, not `data-theme`) and overrides three custom properties (`--sky-top`, `--hill`, `--drifter`) scoped to that component only. A new theme needs a `.road-scene.theme-<name>` rule here as well as its `WORLD_THEMES` entry.

None of this list is exhaustive by construction — grep for `props.theme` and `data-theme` before assuming a change is complete.

**Rule: Games World asset queries are cached.** Anything the world pulls from the database to show (TV videos, radio songs, frame photos, and whatever comes next) goes through `GamesWorld::pickedToday()`: the pick runs once and its results are cached as they are until midnight (Los Angeles time), so every other visit that day runs no query for them at all. Whatever is picked is kept, even a short or empty pick; what's blocked, deleted or added during the day waits for the next pick, or for the cache to be cleared (`sail artisan cache:clear`). Never put an `inRandomOrder()` or any other query for world assets in `scenes()`, `resolve()` or a scene helper that runs on every page load, and fetch a source once per request (the `$tune` memo, or a pool shared by every frame naming it), not once per item. Add a test that a second visit the same day runs no query for it (`pickQueries()` in `GamesWorldScenesTest`).

Every room is seen `GamesWorld::ROOM_FRAME` (900) wide, set by `room()`, so the whole world is drawn at one size (walls are half that tall): a wider room scrolls, and no room should be narrower. `GamesWorldScenesTest` holds every room to it.

A room has four walls you can turn to face (issue #183), and anything can go on any of them. Helpers such as `clock()`, `picture()`, `photoFrame()`, `toy()`, `tv()`, `entertainmentCenter()` and `kitchenCounter()` lay a thing out as if on the back wall (`x` along it, `z` out from it). `GamesWorld::onWall($wall, $size, $thing)` moves it onto another wall, as `views.js` `fromView()` turns a point: `x` runs along that wall left to right as you face it, and the thing names its `wall` so it's drawn facing out from it. Do the same for its light and for a fireplace. `roomDoor()` and `stairs()` use it too. Bookcases are still back-wall only. A picture, photo or TV is only shown (and tappable) while you face its wall (`overlaid()` in `roomLayout.js`, which Room3D's overlay goes through). Arriving through a door faces that door's wall, unless the door names another in `arriveFacing` (stairs face the back, where a Library landing's first `LIBRARY_DOORS_PER_WALL` doors are, the rest of its `LIBRARY_ROOMS_PER_FLOOR` on the front wall; `arrivalWall()` in `useRoom.js`). To shrink a long room, make it narrower, not deeper: a deeper room stands the camera further back and shrinks the back wall on a phone. `GamesWorldScenesTest` checks that everything against a wall fits along it, that nothing on a wall overlaps anything else on it (doors with their EXIT signs, pictures and photos with their frames, built-ins with a counter's cabinets) or crowds a corner from the wall round it, and that photos hang under the season's decorations.

A room can hang photo frames as decor (nothing to tap): its `photos` list in `App\Support\GamesWorld::definitions()`, each made by `photoFrame()` with a source (`from`). A source is `['book' => '<slug>']`, that book's image pages anyone can see (the Cockroach's House uses `GamesWorld::HANK_BOOK`), or `['search' => '<term>']`, the image pages anyone can see whose words or book title contain the term (Guster's House uses `GamesWorld::GUSTER_SEARCH`). `scenes()` gives each frame an `image.src` from a once-a-day pick (`pickedToday()`, keyed by source, so frames sharing a source get different photos). A frame with no photo to give stays up, blank. A photo or a wall `picture()` can name a frame style in `image.frame`, one of `GamesWorld::PICTURE_FRAMES`, each drawn by `resources/js/Pages/Games/World/three/pictureFrame.js` from its `PICTURE_FRAMES` entry (a new style is a new entry there and in the PHP list, which gives each style's `border`; a test keeps names and borders in step). With no style it hangs on a plain panel. The moulding reaches `frameBorder(style)` past the picture, so place frames with that much room. `RoomScene.js` draws the panel and frame, and `Room3D.vue` lays the `<img>` over it, dimmed to the room's light (`--picture-light`).

### Permissions

Four Spatie permissions gate functionality: `edit pages`, `edit profile`, `admin`, and `super admin` (maintenance-report recipients; only an existing super admin can grant or revoke it, enforced in `AdminController::update`). Route groups in `routes/web.php` enforce these server-side; the `usePermissions()` composable checks them client-side for UI visibility.

### Media storage

-   Local: `FILESYSTEM_DISK=local`, media served via S3 URL
-   Production: S3 for upload, CloudFront for delivery
-   `Page::getMediaPathAttribute` and `Page::getMediaPosterAttribute` automatically return the correct URL based on environment

### Background jobs

Queued jobs in `app/Jobs/` handle media processing: `StoreImage`, `StoreVideo`, `StoreSoundAudio`, `CreateVideoSnapshot`, `GenerateCollagePdf`. Local dev uses `QUEUE_CONNECTION=sync` (runs inline). Production uses Amazon SQS.

AI voice clips are made ahead of time on the server, not fetched by the browser: `AiVoice::warm()` queues a `GenerateAiVoiceClip` per spoken locale, after commit. `AiVoiceWarmingObserver` calls it whenever a page's content or a book's title or excerpt is saved (so pages made by `StoreImage`, `StoreVideo` and `CreateVideoSnapshot` are covered, captions included), and `UserWeeklyOverviewService::store()` calls it for the profile summary. Nobody waits on that job, so it gives the provider `services.ai_voice.job_timeout` (30 s) rather than the 20 s an HTTP request gets. `usePrefetchAiVoice()` is left only where it still helps, such as `Book/Show.vue`. Clips nobody plays are removed by `ai-voice:prune` after 90 days.

### Scheduled commands

Defined in `app/Console/Kernel.php`, all run weekly on Sunday (America/Los_Angeles):

-   `pages:cleanup-stale` — deletes pages older than 30 days whose `read_count` (a weighted popularity score, not a view tally — see `IncrementPageReadCount`) is below 2, removes emptied books, and emails a report to `super admin` users
-   `users:generate-weekly-overviews` — AI summaries via Hugging Face
-   `send:weekly-stats-mail` — weekly digest email
-   `music:sync-youtube` — daily at 13:00 if `music_enabled` setting is on (before `ai-voice:prewarm`)
-   `messages:cleanup` — daily cleanup if `messaging_enabled` is on
-   `ai-voice:prune` — weekly, deletes AI voice clips not played in 90 days (runs even with the AI voice off)
-   `ai-voice:prewarm` — daily at 14:00 (an hour after the music sync) while the AI voice is on; makes clips for new or changed spoken text, skipping cached ones, within 75% of the daily character budget

### Search

Laravel Scout + Meilisearch indexes `Book`, `Page`, and `Song` models. Blocked pages stay indexed with a `blocked` field and are filtered out in `SearchController` only while blocking is on (`ContentBlockService::enabled()`, the `unblock_requests_enabled` setting). Scout driver is set to `null` in tests (`phpunit.xml`).

### Real-time

Pusher + Laravel Echo for broadcasting events (`MessageCreated`, `CommentCreated`, etc.). Web Push (VAPID) for browser push notifications via `PushNotificationService`.

### Frontend structure

-   `resources/js/Pages/` — Inertia page components (one per route, organized by feature)
-   `resources/js/Components/` — reusable Vue components; feature subfolders for `Messages/`, `Music/`, `Map/`, `Games/`
-   `resources/js/composables/` — Vue composables for shared logic (`useMusicPlayer`, `usePermissions`, `useSpeechSynthesis`, `useInfiniteScroll`, etc.)
-   `.test.js` files colocate with their component/composable

### Feature flags via SiteSettings

Many features are toggled via `SiteSetting` records (checked in `Kernel.php` and passed as `settings` prop): `music_enabled`, `messaging_enabled`, `sounds_enabled`, `cockroaches_enabled`, `street_view_enabled`, `youtube_enabled`.

### Collage system

`Collage` → `CollagePage` (pivot) → `Page`. Max pages enforced via `config('collage.max_pages')` (default 16, defined in `App\Support\Collage::MAX_PAGES`). PDF generation is a queued job (`GenerateCollagePdf`) using DomPDF.

### Tests

-   PHP: Feature tests use SQLite in-memory with `RefreshDatabase`; AWS credentials stubbed in `phpunit.xml`
-   JS: Vitest with jsdom; setup file at `resources/js/vitest.setup.js`

### Localization

The app supports English, Spanish, and French (`lang/en/messages.php`, `lang/es/messages.php`, `lang/fr/messages.php`), shared to the frontend via the `translations` Inertia prop and read with the `useTranslations()` composable's `t(key, replacements)`. The authoritative list is `SetLocale::SUPPORTED_LOCALES` — check it rather than assuming, since it has grown before.

Any new user-facing string in a Vue component — labels, titles, alt/title attributes, and especially anything passed to `useSpeechSynthesis`'s `speak()` — must be added to **all three** language files and referenced with `t()` rather than hardcoded in English. The same applies to `__()` in PHP (notifications, mailables, Blade views). The three files are kept key-aligned and in the same order; after adding keys, verify none are missing:

```bash
php -r '$k = fn($p) => array_keys(require $p); $en = $k("lang/en/messages.php"); foreach (["es", "fr"] as $l) { $d = array_diff($en, $k("lang/$l/messages.php")); echo $l, ": ", $d ? implode(", ", $d) : "ok", PHP_EOL; }'
```

Existing hardcoded strings encountered incidentally don't need to be retrofitted, but new code should not add more.
