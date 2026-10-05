<?php

namespace App\Models\Traits;

use App\Services\ContentBlockService;

/**
 * Shared blocking rules for models with a `blocked` column. Blocking only
 * hides anything while ContentBlockService::enabled() is on; with it off,
 * blocked rows show like any other but keep their flag.
 */
trait Blockable
{
    public function scopeBlocked($query)
    {
        return $query->where('blocked', true);
    }

    /**
     * Filters out blocked rows only while blocking is switched on.
     */
    public function scopeNotBlocked($query)
    {
        return $query->when(ContentBlockService::enabled(), fn ($query) => $query->where('blocked', false));
    }

    /**
     * Rows currently hidden from viewers: blocked, and blocking switched on.
     * The inverse of notBlocked(), for relationship filters.
     */
    public function scopeHidden($query)
    {
        return $query->where('blocked', true)
            ->unless(ContentBlockService::enabled(), fn ($query) => $query->whereRaw('1 = 0'));
    }

    /**
     * Whether this item is currently hidden from viewers.
     */
    public function isHidden(): bool
    {
        return $this->blocked && ContentBlockService::enabled();
    }
}
