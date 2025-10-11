<?php

namespace App\Jobs;

use App\Models\Book;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class IncrementBookReadCount implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    protected $book;

    protected $fingerprint;

    /**
     * Create a new job instance.
     */
    public function __construct(Book $book, string $fingerprint)
    {
        $this->book = $book;
        $this->fingerprint = $fingerprint;
    }

    /**
     * Handle incrementing the book read count.
     *
     * Rules:
     * - Books in top 20: increment by 0.1
     * - All other books: increment by age-based amount (larger for newer books)
     */
    public function handle(): void
    {
        // Ensure the latest values
        $this->book->refresh();

        $oldScore = (float) ($this->book->read_count ?? 0.0);

        // Check if this book is in the top 20 by read count
        $topBooks = Book::orderBy('read_count', 'desc')
            ->limit(20)
            ->pluck('id')
            ->toArray();

        $isInTop20 = in_array($this->book->id, $topBooks);

        if ($isInTop20) {
            // Top 20 books: increment by 0.1
            $newScore = $oldScore + 0.1;
        } else {
            // All other books: use age-based increment
            $ageBasedIncrement = $this->getAgeBasedIncrement();
            $newScore = $oldScore + $ageBasedIncrement;
        }

        // Persist the updated read count
        $this->book->update(['read_count' => $newScore]);
    }

    /**
     * Get the age-based increment amount for newer books.
     */
    private function getAgeBasedIncrement(): float
    {
        $created = $this->book->created_at ?? Carbon::now();
        $ageDays = $created->diffInDays(Carbon::now()); // Use integer days

        if ($ageDays <= 7) {
            return 3.0; // 1 week: 3.0x boost
        } elseif ($ageDays <= 30) {
            return 2.0; // 1 month: 2.0x boost
        } elseif ($ageDays <= 60) {
            return 1.5; // 2 months: 1.5x boost
        } elseif ($ageDays <= 90) {
            return 1.2; // 3 months: 1.2x boost
        }

        return 1.0; // older: 1.0x boost
    }
}
