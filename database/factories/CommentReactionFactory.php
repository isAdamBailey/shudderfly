<?php

namespace Database\Factories;

use App\Models\CommentReaction;
use App\Models\MessageComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CommentReaction>
 */
class CommentReactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'comment_id' => MessageComment::factory(),
            'user_id' => User::factory(),
            'emoji' => $this->faker->randomElement(CommentReaction::ALLOWED_EMOJIS),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
