<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One "please unblock everything" ask from a non-privileged user.
 *
 * The record exists so the signed links mailed to admins can be single-use:
 * `resolved_at` is the entire state machine. Null means live; once set — by an
 * admin acting on it, by a newer request superseding it, or by an unblock that
 * happened somewhere else — every link for that request is dead.
 */
class UnblockRequest extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'resolved_at'];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeUnresolved($query): void
    {
        $query->whereNull('resolved_at');
    }

    /**
     * Whether this user has an ask outstanding from today.
     *
     * Two subtleties, both deliberate:
     *
     * - The day boundary is local midnight, not UTC's. `today()` would roll
     *   over mid-afternoon for the people actually using this.
     * - Only unresolved asks count. Once an admin has acted, the child is
     *   free to ask again if something new gets blocked — which is what the
     *   old client-side cooldown did when it cleared on blockedCount hitting
     *   zero. Asking again still needs an admin to have answered first, so
     *   it can't be used to spam.
     *
     * Both the panel that disables the button and the endpoint that refuses
     * the post read this, so the UI can never promise something the server
     * will reject.
     */
    public static function askedToday(User $user): bool
    {
        return static::where('user_id', $user->id)
            ->unresolved()
            ->where('created_at', '>=', Carbon::today(config('app.local_timezone'))->utc())
            ->exists();
    }

    public function isResolved(): bool
    {
        return $this->resolved_at !== null;
    }

    /**
     * Take the request for the caller about to act on it.
     *
     * Conditional UPDATE rather than a read-then-write: whoever's statement
     * matches the row wins, so two admins opening their links at the same
     * moment cannot both unblock, with no lock or transaction involved.
     *
     * @return bool Whether this caller got it.
     */
    public function claim(): bool
    {
        return static::whereKey($this->getKey())
            ->unresolved()
            ->update(['resolved_at' => now()]) === 1;
    }

    /**
     * Hand a claim back, so a failure part-way through doesn't burn the ask.
     */
    public function release(): void
    {
        static::whereKey($this->getKey())->update(['resolved_at' => null]);
    }

    /**
     * Retire every live request, answered or superseded. Both are the same
     * thing to the links: they stop working.
     *
     * @param  Builder<self>|null  $query  Narrow the sweep, e.g. to one user.
     */
    public static function resolveAll(?Builder $query = null): void
    {
        ($query ?? static::query())->unresolved()->update(['resolved_at' => now()]);
    }
}
