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
     * Get books related to a specific theme with pagination support.
     */
    public static function getBooksForThemePaginated(string $theme, int $perPage = 15): LengthAwarePaginator
    {
        $keywords = self::getKeywords($theme);

        if (empty($keywords)) {
            return new LengthAwarePaginator(collect([]), 0, $perPage, 1);
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
            });

        return $query->paginate($perPage);
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
