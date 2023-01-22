<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\Category;
use App\Models\Page;
use Illuminate\Database\Seeder;

class BookSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        foreach (Category::all() as $category) {
            Book::factory()
                ->state(['category_id' => $category->id])
                ->count(10)
                ->has(Page::factory()->count(5))
                ->create();
        }
    }
}
