<?php

namespace App\Jobs;

use App\Models\Song;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class IncrementSongReadCount implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public $song;

    /**
     * Create a new job instance.
     */
    public function __construct(Song $song)
    {
        $this->song = $song;
    }

    /**
     * Handle incrementing the song read count.
     *
     * Rules:
     * - Songs in top 20: increment by 0.1
     * - All other songs: increment by age-based amount (larger for newer songs)
     */
    public function handle(): void
    {
        // Additional cache check at job level to prevent duplicate processing
        $jobCacheKey = "song_read_count_job_{$this->song->id}";

        if (\Cache::has($jobCacheKey)) {
            return;
        }

        // Set a short cache to prevent duplicate job processing (5 minutes)
        \Cache::put($jobCacheKey, true, now()->addMinutes(5));

        // Ensure the latest values
        $this->song->refresh();

        $oldScore = (float) ($this->song->read_count ?? 0.0);

        // Check if this song is in the top 20 by read count
        $topSongs = Song::orderBy('read_count', 'desc')
            ->limit(20)
            ->pluck('id')
            ->toArray();

        $isInTop20 = in_array($this->song->id, $topSongs);

        if ($isInTop20) {
            // Top 20 songs: increment by 0.1
            $newScore = $oldScore + 0.1;
        } else {
            // All other songs: use age-based increment
            $ageBasedIncrement = $this->getAgeBasedIncrement();
            $newScore = $oldScore + $ageBasedIncrement;
        }

        // Persist the updated read count
        $this->song->update(['read_count' => $newScore]);
    }

    /**
     * Get the age-based increment amount for newer songs.
     */
    private function getAgeBasedIncrement(): float
    {
        $created = $this->song->created_at ?? Carbon::now();
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
