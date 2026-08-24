<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;

/**
 * The recipient list shared by every maintenance/system alert email: users
 * with the 'super admin' permission, or an empty collection when none
 * exist yet (checking Permission::exists() first avoids a join against an
 * unseeded permissions table).
 */
class SuperAdmins
{
    /**
     * @return Collection<int, User>
     */
    public static function recipients(): Collection
    {
        if (! Permission::where('name', 'super admin')->exists()) {
            return collect();
        }

        return User::query()
            ->permission('super admin')
            ->select(['id', 'name', 'email'])
            ->orderBy('id')
            ->get();
    }
}
