<?php

namespace Tests\Feature\Console;

use App\Mail\WeeklyStatsMail;
use App\Models\Book;
use App\Models\SiteStatistic;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
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

        $recipient = User::factory()->create(['name' => 'Alice']);
        $recipient->givePermissionTo('edit pages');

        $otherUser = User::factory()->create(['name' => 'Bob']);
        $otherUser->givePermissionTo('edit pages');

        $this->fakeOverviewGeneration([
            'Alice' => 'Alice is a curious storyteller this week.',
            'Bob' => 'Bob is busy in messages this week.',
        ]);

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

    public function test_weekly_stats_mail_links_to_users_without_edit_pages_permission(): void
    {
        Mail::fake();

        $recipient = User::factory()->create(['name' => 'Alice']);
        $recipient->givePermissionTo('edit pages');

        $viewer = User::factory()->create(['name' => 'Casey']);

        $this->artisan('send:weekly-stats-mail');

        Mail::assertSent(WeeklyStatsMail::class, function (WeeklyStatsMail $mail) use ($recipient, $viewer) {
            $this->assertTrue($mail->hasTo($recipient->email));

            $names = collect($mail->otherUserSummaryLinks)->pluck('name');

            $this->assertTrue($names->contains('Casey'));
            $this->assertFalse($names->contains('Alice'));

            return str_contains($mail->render(), url('/users/'.urlencode($viewer->email)));
        });
    }

    public function test_weekly_stats_mail_includes_freshly_aggregated_site_stats(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        $user->givePermissionTo('edit pages');

        Book::factory()->count(3)->create();

        // A week-old snapshot so the email can report the change since then.
        SiteStatistic::create([
            'date' => today()->subDays(7)->toDateString(),
            'payload' => ['numberOfBooks' => 1],
        ]);

        $this->artisan('send:weekly-stats-mail');

        // The command aggregates before sending, so today's snapshot exists.
        $this->assertDatabaseHas('site_statistics', ['date' => today()->toDateString()]);

        Mail::assertSent(WeeklyStatsMail::class, function (WeeklyStatsMail $mail) {
            $this->assertSame(3, collect($mail->siteStats['totals'])
                ->firstWhere('label', 'Books')['value']);
            $this->assertSame(2, collect($mail->siteStats['totals'])
                ->firstWhere('label', 'Books')['change']);

            return str_contains($mail->render(), 'Site stats');
        });
    }

    public function test_weekly_stats_mail_renders_without_site_stats(): void
    {
        $user = User::factory()->create(['name' => 'Alice']);

        $rendered = (new WeeklyStatsMail($user, 'Alice had a good week.', [], []))->render();

        $this->assertStringContainsString('Alice had a good week.', $rendered);
        $this->assertStringNotContainsString('Site stats', $rendered);
    }

    /**
     * The command generates the AI overviews itself, so stub the Hugging Face
     * call and return each user's line based on the name in the prompt.
     *
     * @param  array<string, string>  $overviewsByName
     */
    private function fakeOverviewGeneration(array $overviewsByName): void
    {
        config([
            'services.huggingface.api_token' => 'test-token',
            'services.huggingface.user_overview_endpoint' => 'https://router.huggingface.co/featherless-ai/v1/chat/completions',
            'services.huggingface.user_overview_model' => 'Qwen/Qwen2.5-1.5B-Instruct',
        ]);

        Http::fake([
            'router.huggingface.co/*' => function (Request $request) use ($overviewsByName) {
                $body = $request->body();

                foreach ($overviewsByName as $name => $overview) {
                    if (str_contains($body, $name)) {
                        return Http::response([
                            'choices' => [['message' => ['content' => $overview]]],
                        ], 200);
                    }
                }

                return Http::response(['choices' => [['message' => ['content' => 'No summary.']]]], 200);
            },
        ]);
    }
}
