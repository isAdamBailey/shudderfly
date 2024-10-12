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
        if ($this->book->read_count === 0.0) {
            $this->book->increment('read_count');

            return;
        }

        $maxReadCount = Book::max('read_count');
        $booksWithMaxReadCount = Book::where('read_count', $maxReadCount)->get();

        if ($booksWithMaxReadCount->count() > 1 || ! $booksWithMaxReadCount->contains($this->book)) {
            $this->book->increment('read_count');
            dd('Incremented book read count');
        }
    }
}
