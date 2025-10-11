<?php

namespace App\Support;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Book;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class ThemeBooks
{
    /**
     * Get the search keywords for a given theme.
     */
    public static function getKeywords(string $theme): array
    {
        return match ($theme) {
            'halloween' => ['halloween', 'trick or treat', 'spooky', 'pumpkin', 'monster', 'haunted', 'october'],
            'fireworks' => ['4th', 'fourth', 'july', 'fireworks', 'independence', 'summer'],
            'christmas' => ['christmas', 'santa', 'xmas', 'winter', 'snow', 'reindeer', 'elf', 'december', 'snowman'],
            default => [],
        };
    }

    /**
     * Get books related to a specific theme.
     */
    public static function getBooksForTheme(string $theme, int $limit = 10): ?Collection
    {
        $keywords = self::getKeywords($theme);

        if (empty($keywords)) {
            return null;
        }

        $query = Book::query()
            ->with('coverImage')
            ->where(function ($q) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $q->orWhere(function ($subQuery) use ($keyword) {
                        $subQuery->whereRaw('LOWER(title) LIKE ?', ['%'.strtolower($keyword).'%'])
                            ->orWhereRaw('LOWER(excerpt) LIKE ?', ['%'.strtolower($keyword).'%']);
                    });
                }
            })
            ->limit($limit);

        $books = $query->get();

        return $books->isEmpty() ? null : $books;
    }

    /**
     * Get themed books as a paginated collection.
     * Converts the Collection from getBooksForTheme into a LengthAwarePaginator
     * to match the format expected by category pages.
     */
    public static function getBooksForThemeAsPaginator(): LengthAwarePaginator
    {
        $currentTheme = HandleInertiaRequests::getCurrentTheme();

        if (! $currentTheme) {
            return new LengthAwarePaginator(collect([]), 0, 15, 1);
        }

        $books = self::getBooksForTheme($currentTheme, 1000);

        if (! $books) {
            return new LengthAwarePaginator(collect([]), 0, 15, 1);
        }

        return new LengthAwarePaginator(
            $books,
            $books->count(),
            15,
            1,
            ['path' => request()->url()]
        );
    }

    /**
     * Get the display label for a theme.
     */
    public static function getLabel(string $theme): string
    {
        return match ($theme) {
            'halloween' => 'Halloween Books',
            'fireworks' => '4th of July Books',
            'christmas' => 'Christmas Books',
            default => ucfirst($theme).' Books',
        };
    }
}
