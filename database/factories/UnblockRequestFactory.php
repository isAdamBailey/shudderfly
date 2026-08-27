<?php

namespace Database\Factories;

use App\Models\UnblockRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UnblockRequest>
 */
class UnblockRequestFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'resolved_at' => null,
        ];
    }
}
