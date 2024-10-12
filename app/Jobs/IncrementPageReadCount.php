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
     * Execute the job.
     */
    public function handle(): void
    {
        if ($this->page->read_count === 0.0) {
            $this->page->increment('read_count');

            return;
        }

        $maxReadCount = Page::max('read_count');
        $pagesWithMaxReadCount = Page::where('read_count', $maxReadCount)->get();

        if ($pagesWithMaxReadCount->count() > 1 || ! $pagesWithMaxReadCount->contains($this->page)) {
            $this->page->increment('read_count');
        }
    }
}
