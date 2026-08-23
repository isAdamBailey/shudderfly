<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Super admins receive maintenance reports (stale page cleanup, etc). The
     * first existing admin is promoted so the reports have a recipient.
     */
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $superAdmin = Permission::findOrCreate('super admin');

        // On a fresh database (tests, new installs) the seeders have not run
        // yet, so there is nobody to promote.
        if (! Permission::where('name', 'admin')->exists()) {
            return;
        }

        $firstAdmin = User::query()
            ->permission('admin')
            ->orderBy('id')
            ->first();

        $firstAdmin?->givePermissionTo($superAdmin);
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Delete through the model so Spatie detaches the pivot rows; a mass
        // delete would leave them behind to match a recycled permission id.
        Permission::where('name', 'super admin')->get()->each->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
