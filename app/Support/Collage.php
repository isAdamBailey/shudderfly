<?php

namespace App\Support;

use Carbon\CarbonInterface;

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

    /** The printed page, in inches. */
    public const PAGE_WIDTH = 8.5;

    public const PAGE_HEIGHT = 11;

    /** Where the pictures go, in inches: below a strip at the top, where
     * the month it was printed is written in white, and a little in from
     * the other edges. */
    public const PICTURES_TOP = 0.5;

    public const PICTURES_EDGE = 0.25;

    /** How far the coloured border reaches in from every edge of the page,
     * in inches. It is drawn behind the pictures, so it shows round them
     * and between them, and a stack of printed collages can be told apart
     * by colour at a glance. */
    public const BORDER = 1;

    /** The month's size in points, white and bold, centred in the strip
     * above the pictures. */
    public const LABEL_SIZE = 26;

    /** How many pixels a picture is fitted to per inch of the page, and the
     * preview image's resolution. */
    public const DPI = 100;

    /** The gap between pictures, in inches. */
    public const GAP = 0.05;

    /** The border's colour for each month (1 = January), every one dark
     * enough for white text (at least 4.5:1, which a test holds them to),
     * and no two months in a row alike. December's green and October's
     * orange follow the seasons. */
    public const MONTH_COLORS = [
        1 => '#1D4ED8', // blue
        2 => '#BE185D', // pink
        3 => '#0E7490', // cyan
        4 => '#7E22CE', // purple
        5 => '#4D7C0F', // olive
        6 => '#B45309', // amber
        7 => '#B91C1C', // red
        8 => '#4338CA', // indigo
        9 => '#0F766E', // teal
        10 => '#C2410C', // orange
        11 => '#A21CAF', // magenta
        12 => '#15803D', // green
    ];

    /** The grid for a collage of `$count` pictures: GRIDS', or the
     * largest for more than it lists. */
    public static function grid(int $count): array
    {
        return self::GRIDS[min(max($count, 1), array_key_last(self::GRIDS))];
    }

    /** The area the pictures' cells fill, over the border, in inches. */
    public static function area(): array
    {
        return [
            'top' => self::PICTURES_TOP,
            'left' => self::PICTURES_EDGE,
            'width' => self::PAGE_WIDTH - 2 * self::PICTURES_EDGE,
            'height' => self::PAGE_HEIGHT - self::PICTURES_TOP - self::PICTURES_EDGE,
        ];
    }

    /** One picture's cell in `$grid`, in inches. */
    public static function cell(array $grid): array
    {
        $area = self::area();

        return [
            'width' => ($area['width'] - ($grid['cols'] - 1) * self::GAP) / $grid['cols'],
            'height' => ($area['height'] - ($grid['rows'] - 1) * self::GAP) / $grid['rows'],
        ];
    }

    /** Where each picture goes on the page, in inches: centred in its cell
     * of `$grid`, at the `width` and `height` (inches) it was fitted to.
     * The PDF and its preview both place them by this.
     *
     * @param  array<int, array{width: float, height: float}>  $sizes
     * @return array<int, array{top: float, left: float, width: float, height: float}>
     */
    public static function placements(array $grid, array $sizes): array
    {
        $area = self::area();
        $cell = self::cell($grid);

        $placements = [];
        foreach (array_values($sizes) as $index => $size) {
            $row = intdiv($index, $grid['cols']);
            $col = $index % $grid['cols'];

            $placements[] = [
                'top' => $area['top'] + $row * ($cell['height'] + self::GAP) + ($cell['height'] - $size['height']) / 2,
                'left' => $area['left'] + $col * ($cell['width'] + self::GAP) + ($cell['width'] - $size['width']) / 2,
                'width' => $size['width'],
                'height' => $size['height'],
            ];
        }

        return $placements;
    }

    /** How far down the page the month's text starts, in inches, to sit
     * halfway down the strip above the pictures (its line set solid). */
    public static function labelTop(): float
    {
        return (self::PICTURES_TOP - self::LABEL_SIZE / 72) / 2;
    }

    /** The border's colour for a collage printed on `$date`. */
    public static function color(CarbonInterface $date): string
    {
        return self::MONTH_COLORS[$date->month];
    }
}
