<?php

namespace App\Services;

use App\Models\Page;
use App\Models\Sound;
use App\Models\UnblockRequest;
use App\Models\User;
use App\Notifications\UnblockRequested;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Single place for the all-or-nothing unblock.
 *
 * Blocking individual items still lives on the controllers that own them
 * (PageController::block, SoundsController::block); what has no natural model
 * home is the cross-model "unblock everything" rule, because both unblock
 * paths — the dashboard button and the signed email link — must behave the same.
 */
class ContentBlockService
{
    /**
     * Page ids per Scout re-index batch, kept well under driver limits.
     */
    private const REINDEX_CHUNK = 500;

    /**
     * Total number of blocked pages and sounds.
     */
    public function blockedCount(): int
    {
        return Page::blocked()->count() + Sound::blocked()->count();
    }

    /**
     * Unblock every blocked page and sound.
     *
     * @param  User  $actor  Who triggered it.
     * @return int Total rows updated.
     */
    public function unblockAll(User $actor): int
    {
        // Capture ids first: a mass update fires no model events, so Scout would
        // otherwise never re-index pages that blocking removed from the index.
        $pageIds = Page::blocked()->pluck('id');

        $pageCount = Page::blocked()->update(['blocked' => false]);
        $soundCount = Sound::blocked()->update(['blocked' => false]);
        $total = $pageCount + $soundCount;

        // Every outstanding ask has just been answered, whichever path got
        // here. Leaving one live would let its emailed link unblock whatever
        // gets blocked next.
        UnblockRequest::resolveAll();

        // Every ask is now answered, so every bell entry is stale. Best-effort
        // like the re-index below: this is tidying, and a failure here must not
        // bubble up to a caller that would then release an ask whose unblock
        // has already committed — that would put the emailed link back in play.
        try {
            UnblockRequested::forget();
        } catch (Throwable $e) {
            Log::error('content.unblock_all notification cleanup failed', [
                'actor_id' => $actor->id,
                'exception' => $e->getMessage(),
            ]);
        }

        if ($pageIds->isNotEmpty()) {
            // Re-indexing is best-effort: a Meilisearch outage must not undo an
            // unblock that already committed.
            try {
                // Chunked so a large backlog cannot blow past the driver's
                // bound-parameter limit, and `book` is eager loaded because
                // toSearchableArray() would otherwise load it per page.
                $pageIds->chunk(self::REINDEX_CHUNK)->each(
                    fn ($ids) => Page::with('book')->whereIn('id', $ids)->searchable()
                );
            } catch (Throwable $e) {
                Log::error('content.unblock_all reindex failed', [
                    'actor_id' => $actor->id,
                    'pages' => $pageIds->count(),
                    'exception' => $e->getMessage(),
                ]);
            }
        }

        return $total;
    }
}
