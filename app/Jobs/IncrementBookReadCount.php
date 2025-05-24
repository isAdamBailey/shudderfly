<?php

namespace App\Jobs;

use App\Models\Book;
use Carbon\Carbon;
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
            $baseIncrement = $this->calculateRecencyBoost();
            $this->book->increment('read_count', $baseIncrement);

            return;
        }

        // If the book is in the top 3, don't increment the read count
        $topBooks = Book::orderBy('read_count', 'desc')->take(3)->pluck('id')->toArray();
        if (in_array($this->book->id, $topBooks)) {
            return;
        }

        // Apply recency boost
        $incrementValue = $this->calculateRecencyBoost();
        $this->book->increment('read_count', $incrementValue);
    }

    /**
     * Calculate a recency boost multiplier for newer books
     */
    private function calculateRecencyBoost(): float
    {
        $bookAge = $this->book->created_at->diffInDays(Carbon::now());

        // Apply different boost strategies based on age
        if ($bookAge <= 14) {
            // New books (2 weeks) get 2.5x boost
            return 2.5;
        } elseif ($bookAge <= 60) {
            // Recent books (2 months) get 1.8x boost
            return 1.8;
        } elseif ($bookAge <= 180) {
            // Semi-recent books (6 months) get 1.4x boost
            return 1.4;
        } elseif ($bookAge <= 365) {
            // Books under 1 year get slight boost
            return 1.2;
        }

        // Older books get no boost
        return 1.0;
    }
}
