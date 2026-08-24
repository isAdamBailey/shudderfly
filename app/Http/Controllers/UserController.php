<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Category;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\Page;
use App\Models\SiteStatistic;
use App\Models\TimezoneLabel;
use App\Models\User;
use App\Models\WorldClockSetting;
use App\Notifications\MessageCommented;
use App\Notifications\UserTagged;
use App\Services\ContentBlockService;
use App\Services\PopularityService;
use App\Services\UserWeeklyOverviewService;
use App\Support\WorldClockState;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(
        private PopularityService $popularityService,
        private UserWeeklyOverviewService $userWeeklyOverviewService,
        private SettingsController $settingsController,
        private ContentBlockService $contentBlockService
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

        $totalBooksCount = Book::where('author', $user->name)->count();
        $messagesCount = Message::where('user_id', $user->id)->count();
        $commentsCount = MessageComment::where('user_id', $user->id)->count();

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

        // The "authored by this user" book/message/reply lists are only shown to
        // visitors (the owner already knows their own content) — skip fetching
        // them for the owner's own dashboard to keep the page light.
        $topBooks = collect();
        $recentBooks = collect();
        $recentMessages = collect();
        $recentReplies = collect();

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

            $recentMessages = Message::where('user_id', $user->id)
                ->with(['page', 'user'])
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get();

            $recentReplies = MessageComment::where('user_id', $user->id)
                ->with(['message.user'])
                ->orderBy('created_at', 'desc')
                ->take(10)
                ->get();
        }

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
            'stats' => [
                'totalBooksCount' => $totalBooksCount,
                'topBooks' => $topBooks,
                'recentBooks' => $recentBooks,
                'messagesCount' => $messagesCount,
                'commentsCount' => $commentsCount,
                'reactionsGiven' => $reactionsGiven,
            ],
            'recentMessages' => $recentMessages,
            'recentReplies' => $recentReplies,
        ];

        if ($isOwner) {
            $props = array_merge($props, $this->ownerProps($user));
        }

        return Inertia::render('Users/Show', $props);
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
            'recentActivity' => [
                // Only unread items are shown on the dashboard to keep it compact;
                // read state is shared with the notifications dropdown via the
                // same `notifications` table, so marking one read anywhere hides
                // it here too on next load.
                'replies' => $user->notifications()
                    ->where('type', MessageCommented::class)
                    ->whereNull('read_at')
                    ->latest()
                    ->take(10)
                    ->get(),
                'mentions' => $user->notifications()
                    ->where('type', UserTagged::class)
                    ->whereNull('read_at')
                    ->latest()
                    ->take(10)
                    ->get(),
            ],
            'newBooksThisWeek' => Book::with('coverImage')
                ->where('created_at', '>=', now()->subWeek())
                ->latest()
                ->take(4)
                ->get(),
            'recentUploads' => Page::notBlocked()
                ->hasImage()
                ->with('book')
                ->latest()
                ->take(6)
                ->get(),
            'authors' => $canEditPages ? User::all() : [],
            'newBookCategories' => $canEditPages
                ? Category::all()->map->only(['id', 'name'])->sortBy('name')->values()->toArray()
                : [],
            'adminUsers' => User::admins()->get(['name']),
            'users' => User::all(),
            'categories' => $canAdmin ? Category::withCount('books')->get() : [],
            // Visible to everyone: it is half the enable condition for the
            // "ask to unblock" CTA. An aggregate count only, no titles or media.
            'blockedCount' => $this->contentBlockService->blockedCount(),
            'siteStats' => $this->siteStats(),
            'adminSettings' => $canAdmin ? $this->settingsController->index() : [],
            'defaultCities' => config('world_clock.default_cities'),
            'maxCities' => config('world_clock.max_cities'),
            'timezoneLabels' => TimezoneLabel::pluck('label', 'timezone'),
            'worldClock' => WorldClockState::payload(WorldClockSetting::instance()),
        ];
    }

    /**
     * Read the most recent nightly site-statistics snapshot (computed by the
     * `stats:aggregate-site-statistics` scheduled command) plus a short history
     * of daily counts for trend display. Avoids running the heavy aggregation
     * queries (full-table LIKE scans, popularity percentile ranking) on every
     * dashboard load.
     *
     * @return array<string, mixed>
     */
    private function siteStats(): array
    {
        $rows = SiteStatistic::history(30);
        $latest = $rows->last();

        if (! $latest) {
            return [];
        }

        $history = $rows->map(fn (SiteStatistic $row) => [
            'date' => $row->date,
            'numberOfBooks' => $row->payload['numberOfBooks'] ?? null,
            'numberOfPages' => $row->payload['numberOfPages'] ?? null,
            'numberOfSongs' => $row->payload['numberOfSongs'] ?? null,
        ])->values()->all();

        return array_merge($latest->payload, [
            'generatedAt' => $latest->date,
            'history' => $history,
        ]);
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
