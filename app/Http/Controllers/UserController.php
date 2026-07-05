<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Category;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\Page;
use App\Models\Song;
use App\Models\Sound;
use App\Models\TimezoneLabel;
use App\Models\User;
use App\Models\WorldClockSetting;
use App\Notifications\UserTagged;
use App\Services\PopularityService;
use App\Services\UserWeeklyOverviewService;
use App\Support\WorldClockState;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * How long the heavy dashboard/profile queries stay cached. The frontend
     * re-requests this data on every page visit (see resources/js/Pages/Users/Show.vue
     * and OwnerPanel.vue), so caching keeps repeat visits cheap without the
     * data going stale for long.
     */
    private const CACHE_TTL_SECONDS = 300;

    public function __construct(
        private PopularityService $popularityService,
        private UserWeeklyOverviewService $userWeeklyOverviewService,
        private SettingsController $settingsController
    ) {}

    /**
     * Display the current user's own dashboard.
     */
    public function dashboard(): Response
    {
        return $this->show(auth()->user());
    }

    /**
     * Display the specified user's profile.
     */
    public function show(User $user): Response
    {
        $isOwner = auth()->id() === $user->id;

        // Make created_at visible for the profile user
        $user->makeVisible('created_at');

        $props = [
            'profileUser' => $user,
            'isOwner' => $isOwner,
            'appName' => config('app.name'),
            'weeklyOverview' => [
                'text' => $user->weekly_profile_overview,
                'generatedAt' => $user->weekly_profile_overview_generated_at,
            ],
            // These are fetched on-demand by the frontend (via router.reload)
            // rather than Inertia's automatic deferred-prop fetch, so we use
            // optional() here: excluded from the initial load like defer(),
            // but never auto-fetched, which avoids double-fetching.
            'stats' => Inertia::optional(fn () => Cache::remember(
                "profile-stats:{$user->id}:".($isOwner ? 'owner' : 'visitor'),
                self::CACHE_TTL_SECONDS,
                fn () => $this->profileStats($user, $isOwner)
            )),
            // The "authored by this user" message/reply lists are only shown to
            // visitors (the owner already knows their own content).
            'recentMessages' => Inertia::optional(fn () => $isOwner ? collect() : Cache::remember(
                "profile-recent-messages:{$user->id}",
                self::CACHE_TTL_SECONDS,
                fn () => Message::where('user_id', $user->id)
                    ->with(['page', 'user'])
                    ->orderBy('created_at', 'desc')
                    ->take(10)
                    ->get()
                    ->toArray()
            )),
            'recentReplies' => Inertia::optional(fn () => $isOwner ? collect() : Cache::remember(
                "profile-recent-replies:{$user->id}",
                self::CACHE_TTL_SECONDS,
                fn () => MessageComment::where('user_id', $user->id)
                    ->with(['message.user'])
                    ->orderBy('created_at', 'desc')
                    ->take(10)
                    ->get()
                    ->toArray()
            )),
        ];

        if ($isOwner) {
            $props = array_merge($props, $this->ownerProps($user));
        }

        return Inertia::render('Users/Show', $props);
    }

    /**
     * Stats shown on the profile: cheap counts for the user, plus (visitors only)
     * their top/recent books, which require the heavier popularity queries.
     */
    private function profileStats(User $user, bool $isOwner): array
    {
        $topBooks = collect();
        $recentBooks = collect();

        if (! $isOwner) {
            $topBooks = $this->popularityService->addPopularityToCollection(
                Book::where('author', $user->name)
                    ->with('coverImage')
                    ->orderBy('read_count', 'desc')
                    ->orderBy('created_at', 'desc')
                    ->take(5)
                    ->get(),
                Book::class
            );

            $recentBooks = $this->popularityService->addPopularityToCollection(
                Book::where('author', $user->name)
                    ->with('coverImage')
                    ->orderBy('created_at', 'desc')
                    ->take(5)
                    ->get(),
                Book::class
            );
        }

        // Optimize reactions count with a single query using UNION
        $reactionsGiven = \DB::table('message_reactions')
            ->where('user_id', $user->id)
            ->selectRaw('COUNT(*) as count')
            ->union(
                \DB::table('comment_reactions')
                    ->where('user_id', $user->id)
                    ->selectRaw('COUNT(*) as count')
            )
            ->get()
            ->sum('count');

        return [
            'totalBooksCount' => Book::where('author', $user->name)->count(),
            'topBooks' => $topBooks->toArray(),
            'recentBooks' => $recentBooks->toArray(),
            'messagesCount' => Message::where('user_id', $user->id)->count(),
            'commentsCount' => MessageComment::where('user_id', $user->id)->count(),
            'reactionsGiven' => $reactionsGiven,
        ];
    }

    /**
     * Additional props sent only when the viewer is looking at their own dashboard:
     * welcome-page activity, admin/site tools, and light preference panels formerly
     * shown on the /profile page.
     */
    private function ownerProps(User $user): array
    {
        $canEditPages = $user->can('edit pages');
        $canAdmin = $user->can('admin');

        return [
            'recentActivity' => Inertia::optional(fn () => Cache::remember(
                "dashboard-recent-activity:{$user->id}",
                self::CACHE_TTL_SECONDS,
                fn () => [
                    'replies' => MessageComment::query()
                        ->whereIn('message_id', Message::where('user_id', $user->id)->select('id'))
                        ->where('user_id', '!=', $user->id)
                        ->where('created_at', '>=', now()->subDays(7))
                        ->with(['user', 'message'])
                        ->latest()
                        ->take(10)
                        ->get()
                        ->toArray(),
                    'mentions' => $user->notifications()
                        ->where('type', UserTagged::class)
                        ->where('created_at', '>=', now()->subDays(7))
                        ->latest()
                        ->take(10)
                        ->get()
                        ->toArray(),
                ]
            )),
            'newBooksThisWeek' => Inertia::optional(fn () => Cache::remember(
                'dashboard-new-books-this-week',
                self::CACHE_TTL_SECONDS,
                fn () => Book::with('coverImage')
                    ->where('created_at', '>=', now()->subWeek())
                    ->latest()
                    ->take(8)
                    ->get()
                    ->toArray()
            )),
            'recentUploads' => Inertia::optional(fn () => Cache::remember(
                'dashboard-recent-uploads',
                self::CACHE_TTL_SECONDS,
                fn () => Page::notBlocked()
                    ->hasImage()
                    ->with('book')
                    ->latest()
                    ->take(12)
                    ->get()
                    ->toArray()
            )),
            // Shares the "dashboard-users" cache key with the `users` prop below —
            // both are just User::all(), so whichever resolves first (this one,
            // eagerly, since the New Book form needs it immediately) fills the
            // cache for the other instead of querying twice.
            'authors' => $canEditPages ? Cache::remember(
                'dashboard-users',
                self::CACHE_TTL_SECONDS,
                fn () => User::all()->toArray()
            ) : [],
            'newBookCategories' => $canEditPages
                ? Cache::remember(
                    'dashboard-book-categories',
                    self::CACHE_TTL_SECONDS,
                    fn () => Category::all()->map->only(['id', 'name'])->sortBy('name')->values()->toArray()
                )
                : [],
            'users' => Inertia::optional(fn () => Cache::remember(
                'dashboard-users',
                self::CACHE_TTL_SECONDS,
                fn () => User::all()->toArray()
            )),
            'categories' => Inertia::optional(fn () => $canAdmin ? Cache::remember(
                'dashboard-categories',
                self::CACHE_TTL_SECONDS,
                fn () => Category::withCount('books')->get()->toArray()
            ) : collect()),
            'blockedCount' => Inertia::optional(fn () => $canEditPages ? Cache::remember(
                'dashboard-blocked-count',
                self::CACHE_TTL_SECONDS,
                fn () => Page::where('blocked', true)->count() + Sound::where('blocked', true)->count()
            ) : 0),
            'adminSettings' => Inertia::optional(fn () => $canAdmin ? $this->settingsController->index() : []),
            'siteStats' => Inertia::optional(fn () => Cache::remember(
                'dashboard-site-stats',
                self::CACHE_TTL_SECONDS,
                fn () => [
                    // totalCount() reuses the same warmed read-count list that
                    // addPopularityToCollection() below needs, avoiding a
                    // redundant COUNT(*) query for the same table.
                    'numberOfBooks' => $this->popularityService->totalCount(Book::class),
                    'numberOfPages' => Page::count(),
                    'numberOfSongs' => $this->popularityService->totalCount(Song::class),
                    'numberOfYouTubeVideos' => Page::whereNotNull('video_link')->count(),
                    'numberOfVideos' => Page::where('media_path', 'like', '%.mp4')->count(),
                    'numberOfImages' => Page::where('media_path', 'like', '%.webp')
                        ->where('media_path', 'not like', '%snapshot%')
                        ->count(),
                    'numberOfScreenshots' => Page::where('media_path', 'like', '%snapshot%')->count(),
                    'mostReadBooks' => $this->popularityService->addPopularityToCollection(
                        Book::query()
                            ->with('coverImage')
                            ->orderBy('read_count', 'desc')
                            ->orderBy('created_at')
                            ->take(5)
                            ->get(),
                        Book::class
                    )->toArray(),
                    'mostReadSongs' => $this->popularityService->addPopularityToCollection(
                        Song::query()
                            ->orderBy('read_count', 'desc')
                            ->take(5)
                            ->get(),
                        Song::class
                    )->toArray(),
                    'leastPages' => Book::with('coverImage')
                        ->withCount('pages')
                        ->orderBy('pages_count')
                        ->orderBy('created_at')
                        ->first()
                        ?->toArray(),
                    'mostPages' => Book::with('coverImage')
                        ->withCount('pages')
                        ->orderBy('pages_count', 'desc')
                        ->orderBy('created_at')
                        ->first()
                        ?->toArray(),
                ]
            )),
            'defaultCities' => config('world_clock.default_cities'),
            'maxCities' => config('world_clock.max_cities'),
            'timezoneLabels' => Cache::remember(
                'dashboard-timezone-labels',
                self::CACHE_TTL_SECONDS,
                fn () => TimezoneLabel::pluck('label', 'timezone')->toArray()
            ),
            // Not cached: includes server_now/timer state that must stay fresh on every request.
            'worldClock' => WorldClockState::payload(WorldClockSetting::instance()),
        ];
    }

    /**
     * Regenerate the AI-written weekly profile overview for the given user.
     */
    public function regenerateWeeklyOverview(User $user): RedirectResponse
    {
        $this->authorize('admin');

        $overview = $this->userWeeklyOverviewService->generateOverview($user);

        $user->forceFill([
            'weekly_profile_overview' => trim($overview),
            'weekly_profile_overview_generated_at' => now(),
        ])->save();

        return back()->with('success', __('messages.user.weekly_overview_regenerated', ['name' => $user->name]));
    }
}
