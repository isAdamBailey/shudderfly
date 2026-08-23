<?php

namespace Tests\Feature\Console;

use App\Mail\StalePagesCleanupMail;
use App\Models\Book;
use App\Models\Page;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class CleanupStalePagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
    }

    public function test_command_deletes_only_barely_read_pages_older_than_thirty_days(): void
    {
        Storage::fake('s3');

        $book = Book::factory()->create();
        $stalePage = Page::factory()->for($book)->create([
            'read_count' => 0.0,
            'created_at' => now()->subDays(31),
            'media_path' => 'https://example-bucket.s3.amazonaws.com/books/test/stale%20image.webp?versionId=123',
            'media_poster' => 'http://example-bucket.s3.amazonaws.com/books/test/stale-poster.webp?X-Amz-Signature=abc',
        ]);
        $recentUnreadPage = Page::factory()->for($book)->create([
            'read_count' => 0.0,
            'created_at' => now()->subDays(29),
        ]);
        $oldBarelyReadPage = Page::factory()->for($book)->create([
            'read_count' => 1.0,
            'created_at' => now()->subDays(45),
            'media_path' => null,
            'media_poster' => null,
        ]);
        $oldReadPage = Page::factory()->for($book)->create([
            'read_count' => 2.0,
            'created_at' => now()->subDays(45),
        ]);

        Storage::disk('s3')->put('books/test/stale image.webp', 'image');
        Storage::disk('s3')->put('books/test/stale-poster.webp', 'poster');

        $this->artisan('pages:cleanup-stale')
            ->expectsOutput('Deleted 2 stale page(s).')
            ->expectsOutput('Deleted 2 page asset(s) from s3.')
            ->expectsOutput('Deleted 0 empty book(s).')
            ->assertExitCode(0);

        $this->assertDatabaseMissing('pages', ['id' => $stalePage->id]);
        $this->assertDatabaseMissing('pages', ['id' => $oldBarelyReadPage->id]);
        $this->assertDatabaseHas('pages', ['id' => $recentUnreadPage->id]);
        $this->assertDatabaseHas('pages', ['id' => $oldReadPage->id]);
        Storage::disk('s3')->assertMissing('books/test/stale image.webp');
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
            'read_count' => 3.0,
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

    public function test_command_emails_a_report_to_super_admins(): void
    {
        Storage::fake('s3');
        $superAdmin = User::factory()->create(['email' => 'reports@example.com']);
        $superAdmin->givePermissionTo(Permission::findOrCreate('super admin'));
        User::factory()->create(['email' => 'nobody@example.com']);

        $book = Book::factory()->create();
        Page::factory()->for($book)->create([
            'read_count' => 1.0,
            'created_at' => now()->subDays(31),
            'media_path' => null,
            'media_poster' => null,
        ]);

        $this->artisan('pages:cleanup-stale')
            ->expectsOutput('Report emailed to reports@example.com.')
            ->assertExitCode(0);

        Mail::assertSent(
            StalePagesCleanupMail::class,
            function (StalePagesCleanupMail $mail) {
                return $mail->hasTo('reports@example.com')
                    && $mail->report['deletedPages'] === 1
                    && $mail->report['deletedBooks'] === 1
                    && $mail->report['readScoreThreshold'] === 2
                    && is_string($mail->report['cutoffDate'])
                    && is_numeric($mail->report['duration']);
            }
        );
        Mail::assertNotSent(
            StalePagesCleanupMail::class,
            fn (StalePagesCleanupMail $mail) => $mail->hasTo('nobody@example.com')
        );
    }

    public function test_command_skips_the_report_when_no_super_admin_exists(): void
    {
        Storage::fake('s3');
        User::factory()->create();

        $this->artisan('pages:cleanup-stale')
            ->expectsOutput('No super admin users found; skipping report email.')
            ->assertExitCode(0);

        Mail::assertNothingSent();
    }

    public function test_command_still_succeeds_when_the_report_email_fails(): void
    {
        Storage::fake('s3');
        $superAdmin = User::factory()->create(['email' => 'reports@example.com']);
        $superAdmin->givePermissionTo(Permission::findOrCreate('super admin'));

        $book = Book::factory()->create();
        $stalePage = Page::factory()->for($book)->create([
            'read_count' => 1.0,
            'created_at' => now()->subDays(31),
            'media_path' => null,
            'media_poster' => null,
        ]);

        Mail::shouldReceive('to')->andThrow(new \RuntimeException('smtp down'));

        $this->artisan('pages:cleanup-stale')->assertExitCode(0);

        $this->assertDatabaseMissing('pages', ['id' => $stalePage->id]);
    }
}
