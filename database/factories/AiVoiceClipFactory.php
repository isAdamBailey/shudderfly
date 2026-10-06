<?php

namespace Database\Factories;

use App\Models\AiVoiceClip;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiVoiceClip>
 */
class AiVoiceClipFactory extends Factory
{
    protected $model = AiVoiceClip::class;

    public function definition(): array
    {
        $hash = hash('sha256', $this->faker->unique()->uuid());

        return [
            'hash' => $hash,
            'locale' => 'en',
            'voice' => 'af_heart',
            'model' => 'hexgrad/Kokoro-82M',
            'speed' => 1,
            'characters' => 100,
            'path' => "ai-voice/en/{$hash}.mp3",
            'hits' => 1,
            'last_played_at' => now(),
        ];
    }
}
