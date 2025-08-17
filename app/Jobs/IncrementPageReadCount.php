<?php

namespace App\Jobs;

use App\Models\Page;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class IncrementPageReadCount implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Half-life for the popularity decay in hours.
     */
    private const HALF_LIFE_HOURS = 72;

    /**
     * Weight of a single click when added to the decayed score.
     */
    private const CLICK_WEIGHT = 1.0;

    protected $page;

    /**
     * Create a new job instance.
     */
    public function __construct(Page $page)
    {
        $this->page = $page;
    }

    /**
     * Handle incrementing the page popularity using time-decayed scoring.
     *
     * new_score = old_score * pow(0.5, delta_hours / HALF_LIFE_HOURS) + CLICK_WEIGHT
     */
    public function handle(): void
    {
        // Ensure the latest values
        $this->page->refresh();

        $now = Carbon::now();
        $last = $this->page->updated_at ?? $this->page->created_at ?? $now;

        $deltaMinutes = max(0, $last->diffInMinutes($now));
        $deltaHours = $deltaMinutes / 60.0;

        $decayFactor = pow(0.5, $deltaHours / self::HALF_LIFE_HOURS);

        $oldScore = (float) ($this->page->read_count ?? 0.0);

        if ($oldScore <= 0.0) {
            // First click: age-based initial boost
            $boost = $this->initialBoostForPage();
            $newScore = self::CLICK_WEIGHT * $boost;
            $this->page->read_count = $newScore;
            $this->page->save();

            return;
        }

        // Time-decayed increment for subsequent clicks
        $newScore = $oldScore * $decayFactor + self::CLICK_WEIGHT;
        $this->page->read_count = $newScore;
        $this->page->save();
    }

    private function initialBoostForPage(): float
    {
        $created = $this->page->created_at ?? Carbon::now();
        $ageDays = $created->diffInDays(Carbon::now());

        if ($ageDays <= 7) {
            return 3.0; // 1 week
        } elseif ($ageDays <= 30) {
            return 2.0; // 1 month
        } elseif ($ageDays <= 60) {
            return 1.5; // 2 months
        } elseif ($ageDays <= 90) {
            return 1.2; // 3 months
        }

        return 1.0; // older
    }
}
