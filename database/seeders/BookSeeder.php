<?php

namespace Database\Seeders;

use App\Models\Book;
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
        Book::factory()
            ->count(10)
            ->has(Page::factory()->count(23))
            ->create();
    }
}
