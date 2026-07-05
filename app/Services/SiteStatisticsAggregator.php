<?php

namespace App\Services;

use App\Models\Book;
use App\Models\Category;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\Page;
use App\Models\Song;
use App\Models\Sound;
use App\Models\User;
use App\Support\GameShareMessage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SiteStatisticsAggregator
{
    public function __construct(
        private PopularityService $popularityService
    ) {}

    /**
     * Build the full nightly site-statistics payload. Intended to be run out of
     * request-time by a scheduled command, since several of these queries
     * (full-table LIKE scans, popularity percentile ranking) are too slow to
     * compute on every dashboard page load.
     *
     * @return array<string, mixed>
     */
    public function build(): array
    {
        return array_merge(
            $this->counts(),
            $this->addedToday(),
            $this->topLists(),
            $this->engagement(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function counts(): array
    {
        return [
            'numberOfBooks' => Book::count(),
            'numberOfPages' => Page::count(),
            'numberOfSongs' => Song::count(),
            'numberOfSounds' => Sound::count(),
            'numberOfUsers' => User::count(),
            'numberOfMessages' => Message::count(),
            'numberOfComments' => MessageComment::count(),
            'numberOfCategories' => Category::count(),
            'numberOfYouTubeVideos' => Page::whereNotNull('video_link')->count(),
            'numberOfVideos' => Page::where('media_path', 'like', '%.mp4')->count(),
            'numberOfImages' => Page::where('media_path', 'like', '%.webp')
                ->where('media_path', 'not like', '%snapshot%')
                ->count(),
            'numberOfScreenshots' => Page::where('media_path', 'like', '%snapshot%')->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function addedToday(): array
    {
        return [
            'booksAddedToday' => Book::whereDate('created_at', today())->count(),
            'pagesAddedToday' => Page::whereDate('created_at', today())->count(),
            'songsAddedToday' => Song::whereDate('created_at', today())->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function topLists(): array
    {
        return [
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
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function engagement(): array
    {
        return [
            'mostReactedMessage' => $this->mostReacted(Message::class, 'message'),
            'mostReactedComment' => $this->mostReacted(MessageComment::class, 'comment'),
            'mostActiveCommenterLast30Days' => $this->mostActiveUser(
                MessageComment::class,
                MessageComment::query()->where('created_at', '>=', now()->subDays(30))
            ),
            'mostActiveMessengerLast30Days' => $this->mostActiveUser(
                Message::class,
                Message::query()->where('created_at', '>=', now()->subDays(30))
            ),
            'busiestUploadDayOfWeek' => $this->busiestDayOfWeek(Page::class),
            'busiestMessageDayOfWeek' => $this->busiestDayOfWeek(Message::class),
        ];
    }

    /**
     * @param  class-string<Message|MessageComment>  $modelClass
     * @return array<string, mixed>|null
     */
    private function mostReacted(string $modelClass, string $textColumn): ?array
    {
        $model = $modelClass::has('reactions')
            ->withCount('reactions')
            ->with('user')
            ->orderByDesc('reactions_count')
            ->first();

        if (! $model) {
            return null;
        }

        return [
            'id' => $model->id,
            'text' => Str::limit(GameShareMessage::stripSlugMarker($model->{$textColumn}), 140),
            'reactions_count' => (int) $model->reactions_count,
            'user' => $model->user ? ['id' => $model->user->id, 'name' => $model->user->name] : null,
            'created_at' => $model->created_at?->toIso8601String(),
        ];
    }

    /**
     * @param  class-string<Message|MessageComment>  $modelClass
     * @param  Builder  $scopedQuery
     * @return array<string, mixed>|null
     */
    private function mostActiveUser(string $modelClass, $scopedQuery): ?array
    {
        $winner = $scopedQuery
            ->select('user_id', DB::raw('count(*) as activity_count'))
            ->groupBy('user_id')
            ->orderByDesc('activity_count')
            ->first();

        if (! $winner) {
            return null;
        }

        $user = User::find($winner->user_id);

        if (! $user) {
            return null;
        }

        return [
            'user' => ['id' => $user->id, 'name' => $user->name],
            'count' => (int) $winner->activity_count,
        ];
    }

    /**
     * Group all-time created_at timestamps by day of week and return the busiest one.
     * Done in PHP (rather than a DB-specific DAYNAME/strftime expression) so the
     * same code works against MySQL in production and SQLite in tests.
     *
     * @param  class-string  $modelClass
     * @return array<string, mixed>|null
     */
    private function busiestDayOfWeek(string $modelClass): ?array
    {
        $counts = array_fill(0, 7, 0);

        $modelClass::query()->pluck('created_at')->each(function ($createdAt) use (&$counts) {
            $counts[Carbon::parse($createdAt)->dayOfWeek]++;
        });

        $total = array_sum($counts);

        if ($total === 0) {
            return null;
        }

        $busiestDay = array_search(max($counts), $counts, true);

        return [
            'day' => Carbon::now()->startOfWeek(Carbon::SUNDAY)->addDays($busiestDay)->format('l'),
            'count' => $counts[$busiestDay],
        ];
    }
}
