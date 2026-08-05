<?php

namespace App\Support;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Book;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class MonthBooks
{
    /**
     * Get the keywords for the current month (full name and abbreviation).
     */
    public static function getKeywords(): array
    {
        $month = now();

        return array_values(array_unique([
            strtolower($month->format('F')),
            strtolower($month->format('M')),
        ]));
    }

    /**
     * Get books mentioning the current month in their title or excerpt.
     */
    public static function getBooksForMonthPaginated(int $perPage = 15): LengthAwarePaginator
    {
        if (! self::isActive()) {
            return new LengthAwarePaginator(collect([]), 0, $perPage, 1);
        }

        return Book::query()
            ->with('coverImage')
            ->whereIn('id', self::getBookIds())
            ->paginate($perPage);
    }

    /**
     * Get the ids of every book mentioning the current month.
     *
     * Narrow with a plain LIKE in SQL, then confirm the match on a word
     * boundary in PHP so "may" doesn't match "maybe" and "march" doesn't
     * match "marching".
     */
    public static function getBookIds(): Collection
    {
        if (! self::isActive()) {
            return collect();
        }

        $keywords = self::getKeywords();

        return Book::query()
            ->where(function ($query) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $query->orWhereRaw('LOWER(title) LIKE ?', ['%'.$keyword.'%'])
                        ->orWhereRaw('LOWER(excerpt) LIKE ?', ['%'.$keyword.'%']);
                }
            })
            ->get(['id', 'title', 'excerpt'])
            ->filter(fn (Book $book) => self::mentionsMonth($book->title.' '.$book->excerpt, $keywords))
            ->pluck('id');
    }

    /**
     * Whether the text mentions any of the keywords as a whole word.
     */
    protected static function mentionsMonth(string $text, array $keywords): bool
    {
        foreach ($keywords as $keyword) {
            if (preg_match('/\b'.preg_quote($keyword, '/').'\b/iu', $text) === 1) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the display label for the current month, e.g. "August Books".
     */
    public static function getLabel(): string
    {
        $month = strtolower(now()->format('F'));

        return __('messages.books.month_books', ['month' => __('messages.month.'.$month)]);
    }

    /**
     * The month grid only shows when no seasonal theme is active.
     */
    public static function isActive(): bool
    {
        return HandleInertiaRequests::getCurrentTheme() === '';
    }
}
