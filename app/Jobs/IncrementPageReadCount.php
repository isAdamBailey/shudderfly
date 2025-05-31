<?php

namespace App\Jobs;

use App\Models\Page;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class IncrementPageReadCount implements ShouldQueue
{
    use Queueable;

    protected $page;

    /**
     * Create a new job instance.
     */
    public function __construct(Page $page)
    {
        $this->page = $page;
    }

    /**
     * Handle incrementing the pages based on popularity of the page
     */
    public function handle(): void
    {
        if ($this->page->read_count === 0.0) {
            $baseIncrement = $this->calculateRecencyBoost();
            $this->page->increment('read_count', $baseIncrement);

            return;
        }

        // If the page is in the top 3, don't increment the read count
        $topPages = Page::orderBy('read_count', 'desc')->take(3)->pluck('id')->toArray();
        if (in_array($this->page->id, $topPages)) {
            return;
        }

        // Check if page is recent enough to deserve boost
        $pageAge = $this->page->created_at->diffInDays(Carbon::now());
        $isRecent = $pageAge <= 90; // Pages under 3 months are considered recent

        // If the page is in the top 20 but not recent, only increment by a tenth
        $top20Pages = Page::orderBy('read_count', 'desc')->take(20)->pluck('id')->toArray();
        if (in_array($this->page->id, $top20Pages) && !$isRecent) {
            $this->page->increment('read_count', 0.1);
            return;
        }

        // Apply recency boost (for recent pages or pages not in top 20)
        $incrementValue = $this->calculateRecencyBoost();
        $this->page->increment('read_count', $incrementValue);
    }

    /**
     * Calculate a recency boost multiplier for newer pages
     */
    private function calculateRecencyBoost(): float
    {
        $pageAge = $this->page->created_at->diffInDays(Carbon::now());

        // Apply different boost strategies based on age
        if ($pageAge <= 7) {
            // New pages (1 week) get 3x boost
            return 3.0;
        } elseif ($pageAge <= 30) {
            // Recent pages (1 month) get 2x boost
            return 2.0;
        } elseif ($pageAge <= 60) {
            // Semi-recent pages (2 months) get 1.5x boost
            return 1.5;
        } elseif ($pageAge <= 90) {
            // Pages under 3 months get slight boost
            return 1.2;
        }

        // Older pages get no boost
        return 1.0;
    }
}
