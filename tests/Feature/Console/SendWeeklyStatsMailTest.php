<?php

namespace Tests\Feature\Console;

use App\Mail\WeeklyStatsMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SendWeeklyStatsMailTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_weekly_stats_mail_contains_only_recipients_summary_and_links_to_other_users(): void
    {
        Mail::fake();

        $recipient = User::factory()->create([
            'name' => 'Alice',
            'weekly_profile_overview' => 'Alice is a curious storyteller this week.',
        ]);
        $recipient->givePermissionTo('edit pages');

        $otherUser = User::factory()->create([
            'name' => 'Bob',
            'weekly_profile_overview' => 'Bob is busy in messages this week.',
        ]);
        $otherUser->givePermissionTo('edit pages');

        $this->artisan('send:weekly-stats-mail');

        Mail::assertSent(WeeklyStatsMail::class, function (WeeklyStatsMail $mail) use ($recipient, $otherUser) {
            if (! $mail->hasTo($recipient->email)) {
                return false;
            }

            $rendered = $mail->render();
            $otherProfileUrl = url('/users/'.urlencode($otherUser->email));

            return str_contains($rendered, 'Alice is a curious storyteller this week.')
                && ! str_contains($rendered, 'Bob is busy in messages this week.')
                && str_contains($rendered, $otherProfileUrl);
        });
    }
}
