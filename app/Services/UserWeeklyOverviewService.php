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
    private const MAX_NEW_TOKENS = 180;

    private const CONNECT_TIMEOUT_SECONDS = 10;

    private const REQUEST_TIMEOUT_SECONDS = 60;

    private const RETRY_TIMES = 3;

    private const RETRY_SLEEP_MS = 1000;

    public function __construct(
        private PopularityService $popularityService
    ) {}

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

            if ($generatedText === '') {
                Log::warning('Weekly profile overview generation returned empty content', [
                    'user_id' => $user->id,
                    'body' => $response->body(),
                ]);

                return $fallbackOverview;
            }

            return $generatedText;
        } catch (\Throwable $exception) {
            Log::warning('Weekly profile overview generation exception', [
                'user_id' => $user->id,
                'error' => $exception->getMessage(),
            ]);

            return $fallbackOverview;
        }
    }

    private function buildPrompt(User $user, array $metrics): string
    {
        $contextLines = [];
        $contextLines[] = "Roles: {$metrics['roles']}.";

        if ($metrics['total_books'] > 0) {
            $contextLines[] = "Books authored: {$metrics['total_books']} total, read {$metrics['total_reads']} times on Shudderfly.";

            if ($metrics['top_book_details'] !== []) {
                $bookPhrases = array_map(
                    fn (array $book) => "\"{$book['title']}\" ({$book['reads']} reads, popularity {$book['popularity']}%)",
                    $metrics['top_book_details']
                );
                $contextLines[] = 'Most-read titles: '.implode(', ', $bookPhrases).'.';
            }
        } else {
            $contextLines[] = 'Has not authored any books yet — do not invent any book titles.';
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

        $isQuietWeek = $thisWeek === [];
        $contextLines[] = $isQuietWeek
            ? 'This week they were quiet — no posts, replies, reactions, or new books.'
            : 'This week they '.implode(', ', $thisWeek).'.';

        $received = [];
        if ($metrics['reactions_received'] > 0) {
            $received[] = "{$metrics['reactions_received']} emoji reactions";
        }
        if ($metrics['comments_received'] > 0) {
            $received[] = "{$metrics['comments_received']} replies";
        }
        if ($received !== []) {
            $contextLines[] = 'Other members responded to their content with '.implode(' and ', $received).' this week.';
        }

        $context = implode(' ', $contextLines);

        $hasActivity = $metrics['total_books'] > 0 || ! $isQuietWeek;
        $lengthInstruction = $hasActivity
            ? 'Write 2 to 3 short, warm sentences'
            : 'Write exactly 1 short, warm sentence';

        return "{$lengthInstruction} (no preamble, no headings, no lists, no quoted snippets, no made-up details) about how active and popular {$user->name} is on Shudderfly this week. "
            ."Facts you may use (and only these): {$context} "
            ."Start the first sentence with \"{$user->name} is\". "
            .'Only reference book titles or activity that appear in the facts above; never invent titles, numbers, or events. '
            .'If a category is zero or missing, skip it entirely rather than guessing. '
            .'Describe popularity in plain language (e.g. "very popular", "a steady writer", "loved by readers") instead of listing raw numbers.';
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

        $booksLastWeek = Book::query()
            ->where('author', $user->name)
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();
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
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();

        $userMessageIds = Message::query()
            ->where('user_id', $user->id)
            ->pluck('id');
        $reactionsReceived = $userMessageIds->isEmpty() ? 0 : MessageReaction::query()
            ->whereIn('message_id', $userMessageIds)
            ->where('user_id', '!=', $user->id)
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();
        $commentsReceived = $userMessageIds->isEmpty() ? 0 : MessageComment::query()
            ->whereIn('message_id', $userMessageIds)
            ->where('user_id', '!=', $user->id)
            ->where('created_at', '>=', $oneWeekAgo)
            ->count();

        $topUsedEmoji = MessageReaction::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $oneWeekAgo)
            ->selectRaw('emoji, COUNT(*) as c')
            ->groupBy('emoji')
            ->orderByDesc('c')
            ->value('emoji');

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
                'reads' => (int) $book->read_count,
                'popularity' => (int) ($book->popularity_percentage ?? 0),
            ])
            ->all();

        return [
            'books_last_week' => $booksLastWeek,
            'messages_last_week' => $messagesLastWeek,
            'reactions_last_week' => $reactionsLastWeek,
            'comments_made' => $commentsMade,
            'reactions_received' => $reactionsReceived,
            'comments_received' => $commentsReceived,
            'top_used_emoji' => $topUsedEmoji,
            'total_books' => $totalBooks,
            'total_reads' => $totalReads,
            'roles' => $user->getRoleNames()->isNotEmpty()
                ? $user->getRoleNames()->implode(', ')
                : 'No assigned roles yet',
            'top_book_details' => $topBookDetails,
            'top_books' => $topBooks->isEmpty()
                ? 'No books yet'
                : $topBooks->map(fn (Book $book) => $book->title)->implode(', '),
            'engagement_score' => ($booksLastWeek * 2) + $messagesLastWeek + $reactionsLastWeek + $commentsMade,
        ];
    }

    private function buildFallbackOverview(User $user, array $metrics): string
    {
        $activityCount = $metrics['books_last_week']
            + $metrics['messages_last_week']
            + $metrics['reactions_last_week']
            + $metrics['comments_made'];
        $activityPhrase = $this->activityEnergyLabel($activityCount, 'community');

        $popularityPhrase = match (true) {
            $metrics['total_reads'] >= 300 => 'one of the most-read authors on Shudderfly',
            $metrics['total_reads'] >= 100 => 'a well-known and appreciated author on Shudderfly',
            $metrics['engagement_score'] >= 10 => 'a well-known and appreciated Shudderfly member',
            $metrics['engagement_score'] >= 4 => 'an increasingly familiar part of Shudderfly',
            default => 'a newer presence on Shudderfly with room to grow',
        };

        $bookPhrase = $metrics['total_books'] > 0
            ? " Their books have been read {$metrics['total_reads']} times in total."
            : '';

        $activeCategories = [];

        if ($metrics['books_last_week'] > 0) {
            $activeCategories[] = 'books';
        }

        if ($metrics['messages_last_week'] > 0) {
            $activeCategories[] = 'messages';
        }

        if ($metrics['comments_made'] > 0) {
            $activeCategories[] = 'comments';
        }

        if ($metrics['reactions_last_week'] > 0) {
            $activeCategories[] = 'reactions';
        }

        $closingSentence = match (count($activeCategories)) {
            0 => ' They are still finding their place in the Shudderfly community.',
            1 => " Their {$activeCategories[0]} help keep Shudderfly friendly, active, and welcoming.",
            2 => " Their {$activeCategories[0]} and {$activeCategories[1]} help keep Shudderfly friendly, active, and welcoming.",
            default => ' Their '
                . implode(', ', array_slice($activeCategories, 0, -1))
                . ', and ' . $activeCategories[array_key_last($activeCategories)]
                . ' help keep Shudderfly friendly, active, and welcoming.',
        };

        return "{$user->name} is {$popularityPhrase} and brings {$activityPhrase} this week.{$bookPhrase}{$closingSentence}";
    }
}
