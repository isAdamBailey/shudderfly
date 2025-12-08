<?php

namespace Database\Factories;

use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MessageReaction>
 */
class MessageReactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'message_id' => Message::factory(),
            'user_id' => User::factory(),
            'emoji' => $this->faker->randomElement(MessageReaction::ALLOWED_EMOJIS),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
