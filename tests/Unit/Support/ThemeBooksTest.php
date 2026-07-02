<?php

namespace Tests\Unit\Support;

use App\Models\Book;
use App\Support\ThemeBooks;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ThemeBooksTest extends TestCase
{
    use RefreshDatabase;

    public function test_fireworks_theme_matches_4th_but_not_14th_or_24th(): void
    {
        Book::factory()->create(['title' => 'Happy 4th of July']);
        Book::factory()->create(['title' => 'Her 14th Birthday']);
        Book::factory()->create(['title' => 'The 24th Chapter']);

        $books = ThemeBooks::getBooksForThemePaginated('fireworks');

        $this->assertSame(1, $books->total());
        $this->assertSame('Happy 4th of July', $books->items()[0]->title);
    }
}
