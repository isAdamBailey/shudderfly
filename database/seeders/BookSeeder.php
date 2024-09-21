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
                ->count(20)
                ->has(Page::factory()->count(50))
                ->create()
                ->each(function ($book) {
                    $page = $book->pages()
                        ->whereNotNull('media_path')
                        ->first();

                    if ($page) {
                        $book->cover_page = $page->id;
                        $book->save();
                    }
                });
        }
    }
}
