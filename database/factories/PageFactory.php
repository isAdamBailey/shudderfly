<?php

namespace Database\Factories;

use App\Models\Book;
use Illuminate\Database\Eloquent\Factories\Factory;
use Mmo\Faker\PicsumProvider;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Page>
 */
class PageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        $faker = $this->faker;
        $faker->addProvider(new PicsumProvider($faker));

        return [
            'book_id' => Book::factory(),
            'content' => $faker->paragraphs(3, true),
            'media_path' => $faker->picsumUrl(640, 480),
        ];
    }
}
