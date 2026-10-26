<?php

namespace App\Support;

final class Collage
{
    public const MAX_PAGES = 16;

    /** How a collage of so many pictures is laid out on its 8.5 × 11 page:
     * columns and rows, the pictures scaled to fill their cells. More than
     * it lists take the last (grid()). */
    public const GRIDS = [
        1 => ['cols' => 1, 'rows' => 1],
        2 => ['cols' => 2, 'rows' => 1],
        3 => ['cols' => 3, 'rows' => 1],
        4 => ['cols' => 2, 'rows' => 2],
        5 => ['cols' => 3, 'rows' => 2],
        6 => ['cols' => 3, 'rows' => 2],
        7 => ['cols' => 4, 'rows' => 2],
        8 => ['cols' => 4, 'rows' => 2],
        9 => ['cols' => 3, 'rows' => 3],
        10 => ['cols' => 4, 'rows' => 3],
        11 => ['cols' => 4, 'rows' => 3],
        12 => ['cols' => 4, 'rows' => 3],
        13 => ['cols' => 4, 'rows' => 4],
        14 => ['cols' => 4, 'rows' => 4],
        15 => ['cols' => 4, 'rows' => 4],
    ];

    /** The grid for a collage of `$count` pictures: GRIDS', or the
     * largest for more than it lists. */
    public static function grid(int $count): array
    {
        return self::GRIDS[min(max($count, 1), array_key_last(self::GRIDS))];
    }
}
