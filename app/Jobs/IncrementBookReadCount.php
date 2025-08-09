<?php

namespace App\Jobs;

use App\Models\Book;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class IncrementBookReadCount implements ShouldBeUnique, ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public $uniqueFor = 300; // 5 minutes

    protected $book;

    /**
     * Create a new job instance.
     */
    public function __construct(Book $book)
    {
        $this->book = $book;
    }

    /**
     * Get the unique ID for the job.
     */
    public function uniqueId(): string
    {
        return 'increment_book_read_count_'.$this->book->id;
    }

    // No overlap middleware needed: ShouldBeUnique prevents duplicate enqueues

    /**
     * Handle incrementing the books based on popularity of the book
     */
    public function handle(): void
    {
        // Refresh the book model to get the latest read_count
        $this->book->refresh();

        if ($this->book->read_count === 0.0) {
            $baseIncrement = $this->calculateRecencyBoost();
            $this->book->increment('read_count', $baseIncrement);

            return;
        }

        // Use database-level check to prevent race conditions
        // Get the current top 3 books atomically
        $topBooks = Book::orderBy('read_count', 'desc')->take(3)->pluck('id')->toArray();
        if (in_array($this->book->id, $topBooks)) {
            return;
        }

        // After the first increment, apply top-list damping:
        // - Top 3: no further increments (stays steady)
        // - Top 4-20: slow increment
        // - Others: normal increment
        $top20Books = Book::orderBy('read_count', 'desc')->take(20)->pluck('id')->toArray();
        if (in_array($this->book->id, $top20Books)) {
            $this->book->increment('read_count', 0.1);

            return;
        }

        $this->book->increment('read_count', 1.0);
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
