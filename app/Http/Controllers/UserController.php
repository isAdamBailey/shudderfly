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
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
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
                'replies' => MessageComment::query()
                    ->whereIn('message_id', Message::where('user_id', $user->id)->select('id'))
                    ->where('user_id', '!=', $user->id)
                    ->where('created_at', '>=', now()->subDays(7))
                    ->with(['user', 'message'])
                    ->latest()
                    ->take(10)
                    ->get(),
                'mentions' => $user->notifications()
                    ->where('type', UserTagged::class)
                    ->where('created_at', '>=', now()->subDays(7))
                    ->latest()
                    ->take(10)
                    ->get(),
            ],
            'newBooksThisWeek' => Book::with('coverImage')
                ->where('created_at', '>=', now()->subWeek())
                ->latest()
                ->take(8)
                ->get(),
            'recentUploads' => Page::notBlocked()
                ->hasImage()
                ->with('book')
                ->latest()
                ->take(12)
                ->get(),
            'authors' => $canEditPages ? User::all() : [],
            'newBookCategories' => $canEditPages
                ? Category::all()->map->only(['id', 'name'])->sortBy('name')->values()->toArray()
                : [],
            'adminUsers' => User::permission('admin')->get(['name']),
            'users' => User::all(),
            'categories' => $canAdmin ? Category::withCount('books')->get() : [],
            'blockedCount' => $canEditPages
                ? Page::where('blocked', true)->count() + Sound::where('blocked', true)->count()
                : 0,
            'siteStats' => Inertia::defer(fn () => [
                'numberOfBooks' => Book::count(),
                'numberOfPages' => Page::count(),
                'numberOfSongs' => Song::count(),
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
            ]),
            'adminSettings' => $canAdmin ? $this->settingsController->index() : [],
            'defaultCities' => config('world_clock.default_cities'),
            'maxCities' => config('world_clock.max_cities'),
            'timezoneLabels' => TimezoneLabel::pluck('label', 'timezone'),
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
