<?php

namespace Tests\Unit\Support;

use App\Support\Collage;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class CollageTest extends TestCase
{
    public function test_every_month_has_a_colour(): void
    {
        $this->assertSame(range(1, 12), array_keys(Collage::MONTH_COLORS));
    }

    public function test_every_month_colour_is_dark_enough_for_white_text(): void
    {
        foreach (Collage::MONTH_COLORS as $month => $color) {
            $this->assertGreaterThanOrEqual(
                4.5,
                $this->contrastWithWhite($color),
                "Month {$month}'s {$color} is too light for white text"
            );
        }
    }

    public function test_no_two_months_share_a_colour(): void
    {
        $this->assertSame(
            count(Collage::MONTH_COLORS),
            count(array_unique(array_map('strtolower', Collage::MONTH_COLORS)))
        );
    }

    public function test_months_next_to_each_other_differ_in_hue(): void
    {
        foreach (Collage::MONTH_COLORS as $month => $color) {
            $next = Collage::MONTH_COLORS[$month % 12 + 1];
            $difference = abs($this->hue($color) - $this->hue($next));

            $this->assertGreaterThanOrEqual(
                25,
                min($difference, 360 - $difference),
                "Month {$month}'s {$color} is too like the next month's {$next}"
            );
        }
    }

    public function test_colour_follows_the_month_printed(): void
    {
        $this->assertSame(Collage::MONTH_COLORS[11], Collage::color(Carbon::create(2026, 11, 21)));
        $this->assertSame(Collage::MONTH_COLORS[1], Collage::color(Carbon::create(2027, 1, 1)));
    }

    public function test_the_month_is_written_above_the_pictures_inside_the_border(): void
    {
        $this->assertLessThan(Collage::BORDER, Collage::PICTURES_TOP);
        $this->assertGreaterThan(0, Collage::labelTop());
        $this->assertLessThanOrEqual(Collage::PICTURES_TOP, Collage::labelTop() * 2 + Collage::LABEL_SIZE / 72);
    }

    public function test_pictures_are_centred_in_their_cells(): void
    {
        // A 4 × 4 grid's cells are 1.9625 × 2.525 inches
        $grid = Collage::grid(16);
        $placements = Collage::placements($grid, [
            ['width' => 1.9625, 'height' => 1.5],
            ['width' => 1, 'height' => 2.525],
        ]);

        $this->assertEqualsWithDelta(
            ['top' => 0.5 + (2.525 - 1.5) / 2, 'left' => 0.25, 'width' => 1.9625, 'height' => 1.5],
            $placements[0],
            1e-9
        );
        $this->assertEqualsWithDelta(
            ['top' => 0.5, 'left' => 0.25 + 1.9625 + 0.05 + (1.9625 - 1) / 2, 'width' => 1, 'height' => 2.525],
            $placements[1],
            1e-9
        );
    }

    /** The hue of a `#rrggbb` colour, in degrees. */
    private function hue(string $hex): float
    {
        [$r, $g, $b] = array_map(fn (int $v) => $v / 255, sscanf($hex, '#%02x%02x%02x'));
        $max = max($r, $g, $b);
        $delta = $max - min($r, $g, $b);

        $hue = match (true) {
            $delta == 0 => 0,
            $max == $r => fmod(($g - $b) / $delta, 6),
            $max == $g => ($b - $r) / $delta + 2,
            default => ($r - $g) / $delta + 4,
        };

        return fmod($hue * 60 + 360, 360);
    }

    /** WCAG 2 contrast ratio of a `#rrggbb` colour against white. */
    private function contrastWithWhite(string $hex): float
    {
        $channel = function (int $value): float {
            $c = $value / 255;

            return $c <= 0.03928 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
        };

        [$r, $g, $b] = sscanf($hex, '#%02x%02x%02x');
        $luminance = 0.2126 * $channel($r) + 0.7152 * $channel($g) + 0.0722 * $channel($b);

        return 1.05 / ($luminance + 0.05);
    }
}
