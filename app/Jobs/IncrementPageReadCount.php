<?php

namespace App\Jobs;

use App\Models\Page;
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
            $this->page->increment('read_count');

            return;
        }

        // highest read pages
        $topPages = Page::orderBy('read_count', 'desc')->take(15)->pluck('id')->toArray();

        // If the page is in the top 3, don't increment the read count
        if (in_array($this->page->id, array_slice($topPages, 0, 3))) {
            return;
        }

        // If the page is highly read, we only want to increment the read count by 0.1
        $incrementValue = in_array($this->page->id, $topPages) ? 0.1 : 1;
        $this->page->increment('read_count', $incrementValue);
    }
}
