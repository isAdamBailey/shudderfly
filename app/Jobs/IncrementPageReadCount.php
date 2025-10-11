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

    protected $page;

    protected $fingerprint;

    /**
     * Create a new job instance.
     */
    public function __construct(Page $page, string $fingerprint)
    {
        $this->page = $page;
        $this->fingerprint = $fingerprint;
    }

    /**
     * Handle incrementing the page read count.
     *
     * Rules:
     * - Pages in top 20: increment by 0.1
     * - All other pages: increment by age-based amount (larger for newer pages)
     */
    public function handle(): void
    {
        // Ensure the latest values
        $this->page->refresh();

        $oldScore = (float) ($this->page->read_count ?? 0.0);

        // Check if this page is in the top 20 by read count
        $topPages = Page::orderBy('read_count', 'desc')
            ->limit(20)
            ->pluck('id')
            ->toArray();

        $isInTop20 = in_array($this->page->id, $topPages);

        if ($isInTop20) {
            // Top 20 pages: increment by 0.1
            $newScore = $oldScore + 0.1;
        } else {
            // All other pages: use age-based increment
            $ageBasedIncrement = $this->getAgeBasedIncrement();
            $newScore = $oldScore + $ageBasedIncrement;
        }

        // Persist the updated read count
        $this->page->update(['read_count' => $newScore]);
    }

    /**
     * Get the age-based increment amount for newer pages.
     */
    private function getAgeBasedIncrement(): float
    {
        $created = $this->page->created_at ?? Carbon::now();
        $ageDays = $created->diffInDays(Carbon::now()); // Use integer days

        if ($ageDays <= 7) {
            return 3.0; // 1 week: 3.0x boost
        } elseif ($ageDays <= 30) {
            return 2.0; // 1 month: 2.0x boost
        } elseif ($ageDays <= 60) {
            return 1.5; // 2 months: 1.5x boost
        } elseif ($ageDays <= 90) {
            return 1.2; // 3 months: 1.2x boost
        }

        return 1.0; // older: 1.0x boost
    }
}
