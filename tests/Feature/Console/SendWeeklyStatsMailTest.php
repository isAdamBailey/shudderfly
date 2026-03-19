<?php

namespace Tests\Feature\Console;

use App\Mail\WeeklyStatsMail;
use App\Models\Book;
use App\Models\Song;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SendWeeklyStatsMailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // The command requires at least one book to avoid null model errors
        Book::factory()->count(2)->create();
        Song::factory()->count(2)->create();
    }

    public function test_weekly_stats_mail_is_sent_when_email_notifications_enabled(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email_notifications_enabled' => true]);
        $user->givePermissionTo('edit pages');

        $this->artisan('send:weekly-stats-mail');

        Mail::assertSent(WeeklyStatsMail::class, fn ($mail) => $mail->hasTo($user->email));
    }

    public function test_weekly_stats_mail_is_sent_even_when_email_notifications_disabled(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email_notifications_enabled' => false]);
        $user->givePermissionTo('edit pages');

        $this->artisan('send:weekly-stats-mail');

        Mail::assertSent(WeeklyStatsMail::class, fn ($mail) => $mail->hasTo($user->email));
    }

    public function test_weekly_stats_mail_is_not_sent_to_users_without_edit_pages_permission(): void
    {
        Mail::fake();

        User::factory()->create(['email_notifications_enabled' => true]);

        $this->artisan('send:weekly-stats-mail');

        Mail::assertNothingSent();
    }
}
