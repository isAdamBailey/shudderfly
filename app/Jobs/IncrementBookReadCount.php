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

        // do not increment if one of the highest count
        $maxReadCount = Book::max('read_count');
        $booksWithMaxReadCount = Book::where('read_count', $maxReadCount)->get();
        if ($booksWithMaxReadCount->contains($this->book)) {
            return;
        }

        // if in the top count, increment by 0.1, else increment by 1 to let newer books catch up
        $topBooks = Book::orderBy('read_count', 'desc')->take(30)->pluck('id')->toArray();

        if (! in_array($this->book->id, $topBooks)) {
            $this->book->increment('read_count');
        } else {
            $this->book->increment('read_count', 0.1);
        }
    }
}
