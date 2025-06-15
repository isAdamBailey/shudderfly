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

        // Check if book is recent enough to deserve boost
        $bookAge = $this->book->created_at->diffInDays(Carbon::now());
        $isRecent = $bookAge <= 90; // Books under 3 months are considered recent

        // If the book is in the top 20 but not recent, only increment by a tenth
        $top20Books = Book::orderBy('read_count', 'desc')->take(20)->pluck('id')->toArray();
        if (in_array($this->book->id, $top20Books) && ! $isRecent) {
            $this->book->increment('read_count', 0.1);

            return;
        }

        // Apply recency boost (for recent books or books not in top 20)
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
        if ($bookAge <= 7) {
            // New books (1 week) get 2.5x boost
            return 2.5;
        } elseif ($bookAge <= 30) {
            // Recent books (1 month) get 1.8x boost
            return 1.8;
        } elseif ($bookAge <= 60) {
            // Semi-recent books (2 months) get 1.4x boost
            return 1.4;
        } elseif ($bookAge <= 90) {
            // Books under 3 months get slight boost
            return 1.2;
        }

        // Older books get no boost
        return 1.0;
    }
}
