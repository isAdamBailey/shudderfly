<?php

namespace Database\Factories;

use App\Models\Collage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Collage>
 */
class CollageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'storage_path' => null, // Initially null since PDFs are generated later
            'is_locked' => false,
            'is_archived' => false,
        ];
    }
}
