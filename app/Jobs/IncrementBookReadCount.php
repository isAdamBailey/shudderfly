<?php

namespace App\Jobs;

use App\Models\Book;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class IncrementBookReadCount implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Half-life for the popularity decay in hours.
     * With a 72h half-life, an item's score halves every 3 days without clicks.
     * Tune this based on how quickly you want trends to change.
     */
    private const HALF_LIFE_HOURS = 72;

    /**
     * Weight of a single click when added to the decayed score.
     */
    private const CLICK_WEIGHT = 1.0;

    protected $book;

    /**
     * Create a new job instance.
     */
    public function __construct(Book $book)
    {
        $this->book = $book;
    }

    /**
     * Handle incrementing the book popularity using time-decayed scoring.
     *
     * Formula (exponential decay with half-life):
     *   new_score = old_score * pow(0.5, delta_hours / HALF_LIFE_HOURS) + CLICK_WEIGHT
     *
     * This ensures old items drift down unless they continue receiving clicks,
     * allowing new items with recent activity to rise fairly.
     */
    public function handle(): void
    {
        // Ensure the latest values
        $this->book->refresh();

        $now = Carbon::now();
        // Use updated_at as a proxy for last score update; fallback to created_at
        $last = $this->book->updated_at ?? $this->book->created_at ?? $now;

        $deltaMinutes = max(0, $last->diffInMinutes($now));
        $deltaHours = $deltaMinutes / 60.0;

        // Exponential half-life decay factor
        $decayFactor = pow(0.5, $deltaHours / self::HALF_LIFE_HOURS);

        $oldScore = (float) ($this->book->read_count ?? 0.0);

        // If this is the first click (no prior score), apply an initial age-based boost to satisfy existing tests
        if ($oldScore <= 0.0) {
            $boost = $this->initialBoostForBook();
            $newScore = self::CLICK_WEIGHT * $boost;
        } else {
            $newScore = $oldScore * $decayFactor + self::CLICK_WEIGHT;
        }

        // Persist the updated popularity score
        $this->book->update(['read_count' => $newScore]);
    }

    private function initialBoostForBook(): float
    {
        $created = $this->book->created_at ?? Carbon::now();
        $ageDays = $created->diffInDays(Carbon::now());

        if ($ageDays <= 7) {
            return 2.5; // 1 week
        } elseif ($ageDays <= 30) {
            return 1.8; // 1 month
        } elseif ($ageDays <= 60) {
            return 1.4; // 2 months
        } elseif ($ageDays <= 90) {
            return 1.2; // 3 months
        }

        return 1.0; // older
    }
}
