<?php

namespace Tests\Feature\Console;

use App\Models\Book;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CleanupStalePagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_deletes_only_unread_pages_older_than_thirty_days(): void
    {
        Storage::fake('s3');

        $book = Book::factory()->create();
        $stalePage = Page::factory()->for($book)->create([
            'read_count' => 0.0,
            'created_at' => now()->subDays(31),
            'media_path' => 'books/test/stale-image.webp',
            'media_poster' => 'books/test/stale-poster.webp',
        ]);
        $recentUnreadPage = Page::factory()->for($book)->create([
            'read_count' => 0.0,
            'created_at' => now()->subDays(29),
        ]);
        $oldReadPage = Page::factory()->for($book)->create([
            'read_count' => 1.0,
            'created_at' => now()->subDays(45),
        ]);

        Storage::disk('s3')->put('books/test/stale-image.webp', 'image');
        Storage::disk('s3')->put('books/test/stale-poster.webp', 'poster');

        $this->artisan('pages:cleanup-stale')
            ->expectsOutput('Deleted 1 stale page(s).')
            ->expectsOutput('Deleted 2 page asset(s) from s3.')
            ->expectsOutput('Deleted 0 empty book(s).')
            ->assertExitCode(0);

        $this->assertDatabaseMissing('pages', ['id' => $stalePage->id]);
        $this->assertDatabaseHas('pages', ['id' => $recentUnreadPage->id]);
        $this->assertDatabaseHas('pages', ['id' => $oldReadPage->id]);
        Storage::disk('s3')->assertMissing('books/test/stale-image.webp');
        Storage::disk('s3')->assertMissing('books/test/stale-poster.webp');
    }

    public function test_command_deletes_book_when_all_pages_are_removed(): void
    {
        Storage::fake('s3');

        $staleBook = Book::factory()->create();
        Page::factory()->for($staleBook)->create([
            'read_count' => 0.0,
            'created_at' => now()->subDays(35),
            'media_path' => null,
            'media_poster' => null,
        ]);

        $activeBook = Book::factory()->create();
        Page::factory()->for($activeBook)->create([
            'read_count' => 2.0,
            'created_at' => now()->subDays(35),
        ]);

        $this->artisan('pages:cleanup-stale')
            ->expectsOutput('Deleted 1 stale page(s).')
            ->expectsOutput('Deleted 0 page asset(s) from s3.')
            ->expectsOutput('Deleted 1 empty book(s).')
            ->assertExitCode(0);

        $this->assertDatabaseMissing('books', ['id' => $staleBook->id]);
        $this->assertDatabaseHas('books', ['id' => $activeBook->id]);
    }
}
