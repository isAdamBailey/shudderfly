<?php

namespace App\Services;

use App\Models\Book;
use App\Models\CommentReaction;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\MessageReaction;
use App\Models\User;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class UserWeeklyOverviewService
{
    private const MAX_NEW_TOKENS = 90;

    private const CONNECT_TIMEOUT_SECONDS = 10;

    private const REQUEST_TIMEOUT_SECONDS = 60;

    private const RETRY_TIMES = 3;

    private const RETRY_SLEEP_MS = 1000;

    public function __construct(
        private PopularityService $popularityService
    ) {}

    public function prepareForBatchRun(): void
    {
        $this->popularityService->warmReadCountCache(Book::class);
    }

    public function generateOverview(User $user): string
    {
        $metrics = $this->buildMetrics($user);
        $fallbackOverview = $this->buildFallbackOverview($user, $metrics);
        $token = config('services.huggingface.api_token');

        if (! is_string($token) || trim($token) === '') {
            Log::warning('Weekly profile overview skipped: missing Hugging Face token', [
                'user_id' => $user->id,
            ]);

            return $fallbackOverview;
        }

        $endpoint = (string) config('services.huggingface.user_overview_endpoint');
        $model = (string) config('services.huggingface.user_overview_model');
        $prompt = $this->buildPrompt($user, $metrics);

        try {
            $response = Http::withToken($token)
                ->connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
                ->timeout(self::REQUEST_TIMEOUT_SECONDS)
                ->retry(self::RETRY_TIMES, self::RETRY_SLEEP_MS, function ($exception): bool {
                    if ($exception instanceof ConnectionException) {
                        return true;
                    }
                    if ($exception instanceof RequestException && $exception->response) {
                        return $exception->response->serverError();
                    }

                    return false;
                }, false)
                ->post($endpoint, [
                    'model' => $model,
                    'messages' => [
                        ['role' => 'user', 'content' => $prompt],
                    ],
                    'max_tokens' => self::MAX_NEW_TOKENS,
                ]);

            if (! $response->successful()) {
                Log::warning('Weekly profile overview generation failed', [
                    'user_id' => $user->id,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return $fallbackOverview;
            }

            $generatedText = trim((string) data_get($response->json(), 'choices.0.message.content', ''));
            $normalizedText = $this->normalizeGeneratedOverview($generatedText, $user);

            if ($normalizedText === '' || ! $this->isValidGeneratedOverview($normalizedText, $user)) {
                Log::warning('Weekly profile overview generation returned unusable content', [
                    'user_id' => $user->id,
                    'body' => $response->body(),
                ]);

                return $fallbackOverview;
            }

            return $normalizedText;
        } catch (\Throwable $exception) {
            Log::warning('Weekly profile overview generation exception', [
                'user_id' => $user->id,
                'error' => $exception->getMessage(),
            ]);

            return $fallbackOverview;
        }
    }

    private function normalizeGeneratedOverview(string $text, User $user): string
    {
        $text = trim($text);

        if (preg_match('/^"(.*)"$/s', $text, $matches)) {
            $text = trim($matches[1]);
        }

        $text = trim($text, " \t\n\r\0\x0B\"'`");

        $quotedNamePrefix = '"'.$user->name;
        if (str_starts_with($text, $quotedNamePrefix)) {
            $text = $user->name.substr($text, strlen($quotedNamePrefix));
        }

        return trim($text);
    }

    private function isValidGeneratedOverview(string $text, User $user): bool
    {
        if (! str_starts_with($text, $user->name.' is')) {
            return false;
        }

        if (preg_match('/^#|\n#|```|\*\*/', $text)) {
            return false;
        }

        return mb_strlen($text) >= 20;
    }

    private function buildPrompt(User $user, array $metrics): string
    {
        $contextLines = [];
        $hasContributedThisWeek = $this->hasContributedThisWeek($metrics);

        if ($metrics['total_books'] > 0) {
            $contextLines[] = "Books authored on Shudderfly: {$metrics['total_books']} total.";

            if ($metrics['top_book_details'] !== []) {
                $bookPhrases = array_map(
                    fn (array $book) => json_encode($book['title'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                        ." (popularity {$book['popularity']}%)",
                    $metrics['top_book_details']
                );
                $contextLines[] = 'Notable titles: '.implode(', ', $bookPhrases).'.';
            }
        } else {
            $contextLines[] = 'Has not authored any books yet — do not invent any book titles.';
        }

        if ($metrics['books_created_last_week_titles'] !== []) {
            $titles = array_map(
                fn (string $title) => json_encode($title, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                $metrics['books_created_last_week_titles']
            );
            $contextLines[] = 'Books created this week: '.implode(', ', $titles).'.';
        }

        $thisWeek = [];
        if ($metrics['books_last_week'] > 0) {
            $thisWeek[] = "created {$metrics['books_last_week']} new books";
        }
        if ($metrics['messages_last_week'] > 0) {
            $thisWeek[] = "posted {$metrics['messages_last_week']} messages";
        }
        if ($metrics['comments_made'] > 0) {
            $thisWeek[] = "left {$metrics['comments_made']} replies on other members' messages";
        }
        if ($metrics['reactions_last_week'] > 0) {
            $emojiPart = $metrics['top_used_emoji']
                ? " (most often {$metrics['top_used_emoji']})"
                : '';
            $thisWeek[] = "gave {$metrics['reactions_last_week']} emoji reactions{$emojiPart}";
        }

        $contextLines[] = $hasContributedThisWeek
            ? 'This week they '.implode(', ', $thisWeek).'.'
            : 'This week they were not active on Shudderfly — no new books, posts, replies, or reactions from them.';

        $received = [];
        if ($metrics['reactions_received'] > 0) {
            $received[] = "{$metrics['reactions_received']} emoji reactions";
        }
        if ($metrics['comments_received'] > 0) {
            $received[] = "{$metrics['comments_received']} replies";
        }
        if ($received !== []) {
            $contextLines[] = 'Other readers responded to their content with '.implode(' and ', $received).' this week.';
        }

        $context = implode(' ', $contextLines);

        $lengthInstruction = $hasContributedThisWeek
            ? 'Write 1 to 2 short, goofy sentences'
            : 'Write exactly 1 short, goofy sentence';
        $userNameForPrompt = json_encode($user->name, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $inactiveInstruction = 'They did not add books, post messages, or give reactions this week — do not call them popular or well-known; say they are not active on Shudderfly this week. ';
        $activeInstruction = 'You may guess at their personality or vibe from the tone of book titles they created this week and how much they messaged and reacted. '
            .'When describing reach or reception, use playful plain language informed by popularity ratings and engagement — never read counts or raw stats. ';

        return "{$lengthInstruction} (no preamble, no headings, no lists, no quoted snippets, no made-up details) summarizing their week on Shudderfly in a silly, playful, slightly absurd tone — like a goofy friend hyping them up, not a news recap or bulletin. Keep it punchy and short. "
            ."User display name: {$userNameForPrompt}. "
            ."Facts you may use (and only these): {$context} "
            .'Start the first sentence with the user display name followed by " is". '
            .'Only reference book titles or activity that appear in the facts above; never invent titles, numbers, or events. '
            .'Never mention read counts or how many times a book was read; popularity percentage is fine when relevant. '
            .'Never call Shudderfly a "community"; refer to it only as Shudderfly. '
            .($hasContributedThisWeek ? $activeInstruction : $inactiveInstruction)
            .'If a category is zero or missing, skip it entirely rather than guessing.';
    }

    private function hasContributedThisWeek(array $metrics): bool
    {
        return $metrics['books_last_week'] > 0
            || $metrics['messages_last_week'] > 0
            || $metrics['comments_made'] > 0
            || $metrics['reactions_last_week'] > 0;
    }

    private function activityEnergyLabel(int $count, string $activity): string
    {
        return match (true) {
            $count >= 10 => "high {$activity} energy",
            $count >= 4 => "steady {$activity} energy",
            $count >= 1 => "gentle {$activity} energy",
            default => "quiet {$activity} energy",
        };
    }

    private function buildMetrics(User $user): array
    {
        $oneWeekAgo = now()->subWeek();

        $booksCreatedLastWeek = Book::query()
            ->where('author', $user->name)
            ->where('created_at', '>=', $oneWeekAgo)
            ->orderByDesc('created_at')
            ->get(['title']);
        $booksLastWeek = $booksCreatedLastWeek->count();
        $booksCreatedLastWeekTitles = $booksCreatedLastWeek
            ->pluck('title')
            ->all();
        $messagesLastWeek = Message::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();
        $messageReactionsGiven = MessageReaction::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();
        $commentReactionsGiven = CommentReaction::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();
        $reactionsLastWeek = $messageReactionsGiven + $commentReactionsGiven;

        $commentsMade = MessageComment::query()
            ->where('user_id', $user->id)
            ->whereIn('message_id', Message::query()
                ->where('user_id', '!=', $user->id)
                ->select('id'))
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();

        $userMessagesSubquery = Message::query()
            ->where('user_id', $user->id)
            ->select('id');
        $userCommentsSubquery = MessageComment::query()
            ->where('user_id', $user->id)
            ->select('id');

        $messageReactionsReceived = MessageReaction::query()
            ->whereIn('message_id', $userMessagesSubquery)
            ->where('user_id', '!=', $user->id)
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();
        $commentReactionsReceived = CommentReaction::query()
            ->whereIn('comment_id', $userCommentsSubquery)
            ->where('user_id', '!=', $user->id)
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();
        $reactionsReceived = $messageReactionsReceived + $commentReactionsReceived;
        $commentsReceived = MessageComment::query()
            ->whereIn('message_id', $userMessagesSubquery)
            ->where('user_id', '!=', $user->id)
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();

        $topUsedEmoji = $this->topUsedEmojiLastWeek($user->id, $oneWeekAgo);

        $totalBooks = Book::query()->where('author', $user->name)->count();
        $totalReads = (int) Book::query()->where('author', $user->name)->sum('read_count');

        $topBooks = $this->popularityService->addPopularityToCollection(
            Book::query()
                ->where('author', $user->name)
                ->orderByDesc('read_count')
                ->orderByDesc('created_at')
                ->take(3)
                ->get(),
            Book::class
        );

        $topBookDetails = $topBooks
            ->map(fn (Book $book) => [
                'title' => $book->title,
                'popularity' => (int) ($book->popularity_percentage ?? 0),
            ])
            ->all();

        $engagementScore = ($booksLastWeek * 2)
            + $messagesLastWeek
            + $reactionsLastWeek
            + $commentsMade
            + $reactionsReceived
            + $commentsReceived;

        return [
            'books_last_week' => $booksLastWeek,
            'books_created_last_week_titles' => $booksCreatedLastWeekTitles,
            'messages_last_week' => $messagesLastWeek,
            'reactions_last_week' => $reactionsLastWeek,
            'comments_made' => $commentsMade,
            'reactions_received' => $reactionsReceived,
            'comments_received' => $commentsReceived,
            'top_used_emoji' => $topUsedEmoji,
            'total_books' => $totalBooks,
            'total_reads' => $totalReads,
            'top_book_details' => $topBookDetails,
            'engagement_score' => $engagementScore,
        ];
    }

    private function topUsedEmojiLastWeek(int $userId, \DateTimeInterface $oneWeekAgo): ?string
    {
        $emojiCounts = [];

        foreach ([MessageReaction::class, CommentReaction::class] as $model) {
            $rows = $model::query()
                ->where('user_id', $userId)
                ->where('created_at', '>=', $oneWeekAgo)
                ->selectRaw('emoji, COUNT(*) as c')
                ->groupBy('emoji')
                ->get();

            foreach ($rows as $row) {
                $emojiCounts[$row->emoji] = ($emojiCounts[$row->emoji] ?? 0) + (int) $row->c;
            }
        }

        if ($emojiCounts === []) {
            return null;
        }

        arsort($emojiCounts);

        return array_key_first($emojiCounts);
    }

    private function buildFallbackOverview(User $user, array $metrics): string
    {
        if (! $this->hasContributedThisWeek($metrics)) {
            $hasIncoming = $metrics['reactions_received'] > 0 || $metrics['comments_received'] > 0;

            if ($hasIncoming) {
                return "{$user->name} is not active on Shudderfly this week, but the fans are still hollering into the void for them.";
            }

            return "{$user->name} is not active on Shudderfly this week, presumably off having a snack somewhere.";
        }

        $activityCount = $metrics['books_last_week']
            + $metrics['messages_last_week']
            + $metrics['reactions_last_week']
            + $metrics['comments_made'];
        $activityPhrase = $this->activityEnergyLabel($activityCount, 'weekly');

        $topPopularity = collect($metrics['top_book_details'])->max('popularity') ?? 0;
        $popularityPhrase = match (true) {
            $topPopularity >= 75 => 'basically Shudderfly royalty',
            $topPopularity >= 40 => 'a certified Shudderfly crowd-pleaser',
            $metrics['engagement_score'] >= 10 => 'making a glorious ruckus on Shudderfly',
            $metrics['engagement_score'] >= 4 => 'bouncing around Shudderfly with snacks in hand',
            ($metrics['reactions_received'] + $metrics['comments_received']) >= 3 => 'getting cheered on like a tiny celebrity on Shudderfly',
            default => 'a fresh little gremlin on Shudderfly',
        };

        return "{$user->name} is {$popularityPhrase}, radiating {$activityPhrase} this week.";
    }
}
