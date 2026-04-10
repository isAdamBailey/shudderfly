<?php

namespace Database\Factories;

use App\Models\Sound;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Sound>
 */
class SoundFactory extends Factory
{
    protected $model = Sound::class;

    public function definition(): array
    {
        return [
            'title' => $this->faker->words(2, true),
            'emoji' => $this->faker->randomElement(['💨', '💥', '🎵', '🔔', '🐸', '🎶', '🤣', null]),
            'audio_path' => 'sounds/'.$this->faker->uuid().'.m4a',
        ];
    }
}
