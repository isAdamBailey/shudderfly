<?php

namespace App\Jobs;

use App\Models\Book;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class IncrementBookReadCount implements ShouldQueue
{
    use Queueable;

    protected $book;

    /**
     * Create a new job instance.
     */
    public function __construct(Book $book)
    {
        $this->book = $book;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $maxReadCount = Book::max('read_count');
        if ($this->book->read_count === 0.0 || $this->book->read_count < $maxReadCount) {
            $this->book->increment('read_count');
        }
    }
}
