<?php

namespace App\Support;

use App\Models\Book;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

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
        $query = self::query($theme);

        if (! $query) {
            return new LengthAwarePaginator(collect([]), 0, $perPage, 1);
        }

        return $query->with('coverImage')->paginate($perPage);
    }

    /**
     * Get the ids of every book related to a specific theme.
     */
    public static function getBookIds(string $theme): Collection
    {
        return self::query($theme)?->pluck('id') ?? collect();
    }

    /**
     * Build the query matching a theme's keywords, or null when no theme is active.
     */
    protected static function query(string $theme): ?Builder
    {
        $keywords = self::getKeywords($theme);

        if (empty($keywords)) {
            return null;
        }

        return Book::query()
            ->where(function ($q) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $q->orWhere(function ($subQuery) use ($keyword) {
                        self::applyKeywordMatch($subQuery, 'title', $keyword);
                        self::applyKeywordMatch($subQuery, 'excerpt', $keyword, 'or');
                    });
                }
            });
    }

    /**
     * Add a LIKE match for a keyword against a column, excluding false
     * positives where a digit keyword (e.g. "4th") is preceded by another
     * digit (e.g. "14th", "24th").
     */
    protected static function applyKeywordMatch(Builder $query, string $column, string $keyword, string $boolean = 'and'): void
    {
        $method = $boolean === 'or' ? 'orWhere' : 'where';

        $query->$method(function ($q) use ($column, $keyword) {
            $q->whereRaw("LOWER({$column}) LIKE ?", ['%'.strtolower($keyword).'%']);

            if (ctype_digit($keyword[0] ?? '')) {
                foreach (range(0, 9) as $digit) {
                    $q->whereRaw("LOWER({$column}) NOT LIKE ?", ['%'.$digit.strtolower($keyword).'%']);
                }
            }
        });
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
            '' => 'Themed Books',
            default => ucfirst($theme).' Books',
        };
    }
}
