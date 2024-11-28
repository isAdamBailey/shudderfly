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

        // if one of the highest count, do not increment
        $maxReadCount = Page::max('read_count');
        $pagesWithMaxReadCount = Page::where('read_count', $maxReadCount)->get();
        if ($pagesWithMaxReadCount->contains($this->page)) {
            return;
        }

        // if in the top count, increment by 0.1, else increment by 1 to let newer pages catch up
        $topPages = Page::orderBy('read_count', 'desc')->take(30)->pluck('id')->toArray();

        if (! in_array($this->page->id, $topPages)) {
            $this->page->increment('read_count');
        } else {
            $this->page->increment('read_count', 0.1);
        }
    }
}
