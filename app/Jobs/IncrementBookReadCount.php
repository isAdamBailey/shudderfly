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
     * Handle incrementing the books based on popularity of the book
     */
    public function handle(): void
    {
        if ($this->book->read_count === 0.0) {
            $this->book->increment('read_count');
            return;
        }

        // highest read books
        $topBooks = Book::orderBy('read_count', 'desc')->take(15)->pluck('id')->toArray();

        // If the book is in the top 3, don't increment the read count
        if (in_array($this->book->id, array_slice($topBooks, 0, 3))) {
            return;
        }

        // If the book is highly read, we only want to increment the read count by 0.1
        $incrementValue = in_array($this->book->id, $topBooks) ? 0.1 : 1;
        $this->book->increment('read_count', $incrementValue);
    }
}