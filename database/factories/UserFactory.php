<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     *
     * @return static
     */
    public function unverified()
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Create an admin user for testing
     *
     * @return static
     */
    public function admin()
    {
        return $this->afterCreating(function ($user) {
            // Create the admin permission if it doesn't exist
            $adminPermission = \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'admin']);

            // Create the admin role if it doesn't exist
            $adminRole = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin']);

            // Give the admin role the admin permission
            $adminRole->givePermissionTo($adminPermission);

            // Assign the admin role to the user
            $user->assignRole($adminRole);
        });
    }
}
