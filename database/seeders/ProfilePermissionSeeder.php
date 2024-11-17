<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class ProfilePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Permission::create(['name' => 'edit profile']);

        $editProfilePermission = Permission::findByName('edit profile');

        // Iterate over all users with 'edit pages' permission and add 'edit profile' permission
        User::permission('edit pages')->get()->each(function ($user) use ($editProfilePermission) {
            $user->givePermissionTo($editProfilePermission);
        });
    }
}
