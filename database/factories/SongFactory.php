<?php

namespace Database\Factories;

use App\Models\Song;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Song>
 */
class SongFactory extends Factory
{
    protected $model = Song::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'youtube_video_id' => $this->faker->regexify('[a-zA-Z0-9_-]{11}'),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'thumbnail_default' => $this->faker->imageUrl(120, 90),
            'thumbnail_medium' => $this->faker->imageUrl(320, 180),
            'thumbnail_high' => $this->faker->imageUrl(480, 360),
            'thumbnail_standard' => $this->faker->imageUrl(640, 480),
            'thumbnail_maxres' => $this->faker->imageUrl(1280, 720),
            'duration' => $this->faker->randomElement(['PT3M25S', 'PT4M12S', 'PT2M45S', 'PT5M33S']),
            'published_at' => $this->faker->dateTimeBetween('-2 years', 'now'),
            'view_count' => $this->faker->numberBetween(100, 1000000),
            'read_count' => $this->faker->randomFloat(1, 0, 100) ?: 0,
            'tags' => $this->faker->randomElements(['music', 'rock', 'pop', 'jazz', 'electronic', 'classical'], $this->faker->numberBetween(1, 3)),
        ];
    }
}
