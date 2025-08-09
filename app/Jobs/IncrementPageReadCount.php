<?php

namespace App\Jobs;

use App\Models\Page;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class IncrementPageReadCount implements ShouldBeUnique, ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public $uniqueFor = 300; // 5 minutes

    protected $page;

    /**
     * Create a new job instance.
     */
    public function __construct(Page $page)
    {
        $this->page = $page;
    }

    /**
     * Get the unique ID for the job.
     */
    public function uniqueId(): string
    {
        return 'increment_page_read_count_'.$this->page->id;
    }

    // No overlap middleware needed: ShouldBeUnique prevents duplicate enqueues

    /**
     * Handle incrementing the pages based on popularity of the page
     */
    public function handle(): void
    {
        // Refresh the page model to get the latest read_count
        $this->page->refresh();

        if ($this->page->read_count === 0.0) {
            $baseIncrement = $this->calculateRecencyBoost();
            $this->page->increment('read_count', $baseIncrement);

            return;
        }

        // Use database-level check to prevent race conditions
        // Get the current top 3 pages atomically
        $topPages = Page::orderBy('read_count', 'desc')->take(3)->pluck('id')->toArray();
        if (in_array($this->page->id, $topPages)) {
            return; // Top 3 stay steady
        }

        // After the first increment, apply top-list damping:
        // - Top 3: no further increments (stays steady)
        // - Top 4-20: slow increment
        // - Others: normal increment
        $top20Pages = Page::orderBy('read_count', 'desc')->take(20)->pluck('id')->toArray();
        if (in_array($this->page->id, $top20Pages)) {
            $this->page->increment('read_count', 0.1);

            return;
        }

        $this->page->increment('read_count', 1.0);
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
