<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class SiteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // create a user who can edit pages
        $user = User::factory()->create([
            'email' => 'test@test.com',
        ]);
        $user->givePermissionTo(['edit pages']);
        $user->givePermissionTo(['edit profile']);

        // create a user who can only view
        User::factory()->create([
            'email' => 'test2@test.com',
        ]);
    }
}
