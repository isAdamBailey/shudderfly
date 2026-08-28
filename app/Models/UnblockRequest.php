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
     * Whether this user has asked at all today.
     *
     * One ask per calendar day, answered or not: an admin approving the
     * request must not hand the child a fresh ask for the same day, or the
     * limit is only ever as long as an admin's response time. `resolved_at`
     * governs whether the *links* still work, not whether the day is spent.
     *
     * The day boundary is local midnight, not UTC's — `today()` would roll
     * over mid-afternoon for the people actually using this.
     *
     * Both the panel that hides the button and the endpoint that refuses the
     * post read this, so the UI can never promise something the server will
     * reject.
     */
    public static function askedToday(User $user): bool
    {
        return static::where('user_id', $user->id)
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
