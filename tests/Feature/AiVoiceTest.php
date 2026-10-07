<?php

namespace Tests\Feature;

use App\Mail\AiProviderQuotaAlertMail;
use App\Models\AiVoiceClip;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\AiVoiceService;
use App\Support\AiVoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AiVoiceTest extends TestCase
{
    use RefreshDatabase;

    private const AUDIO = 'ID3-fake-mp3-bytes';

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('s3');
        SiteSetting::where('key', AiVoice::SETTING_KEY)->update(['value' => '1']);

        $this->actingAs(User::factory()->create());
    }

    private function fakeProvider(int $status = 200): void
    {
        Http::fake([
            'ai-voice.test/*' => Http::response(
                $status === 200 ? self::AUDIO : ['error' => 'boom'],
                $status,
                $status === 200 ? ['Content-Type' => 'audio/mpeg'] : [],
            ),
        ]);
    }

    private function speak(array $overrides = [])
    {
        return $this->postJson(route('ai-voice.speak'), array_merge([
            'text' => 'Hello  there @friend',
            'locale' => 'en',
            'voice' => 'am_puck',
        ], $overrides));
    }

    public function test_a_miss_generates_stores_and_indexes_the_clip(): void
    {
        $this->fakeProvider();

        $response = $this->speak()->assertOk();

        Http::assertSentCount(1);
        Http::assertSent(fn (ClientRequest $request) => $request['input'] === 'Hello there friend'
            && $request['voice'] === 'am_puck'
            && $request['model'] === 'hexgrad/Kokoro-82M'
            && $request['response_format'] === 'mp3'
            && $request['speed'] == 1
            && $request->hasHeader('Authorization', 'Bearer testing'));

        $clip = AiVoiceClip::sole();
        $this->assertSame('en', $clip->locale);
        $this->assertSame('am_puck', $clip->voice);
        $this->assertSame(18, $clip->characters);
        $this->assertSame(1, $clip->hits);
        $this->assertSame("ai-voice/en/{$clip->hash}.mp3", $clip->path);
        Storage::disk('s3')->assertExists($clip->path);
        $this->assertSame(self::AUDIO, Storage::disk('s3')->get($clip->path));
        $response->assertJson(['url' => $clip->url]);
    }

    public function test_a_repeat_request_is_served_from_the_cache(): void
    {
        $this->fakeProvider();

        $first = $this->speak()->assertOk()->json('url');
        // Same words after normalization hit the same clip.
        $second = $this->speak(['text' => ' Hello there friend '])->assertOk()->json('url');

        $this->assertSame($first, $second);
        Http::assertSentCount(1);
        $clip = AiVoiceClip::sole();
        $this->assertSame(2, $clip->hits);
        $this->assertNotNull($clip->last_played_at);
    }

    public function test_a_requested_speed_is_ignored_so_one_clip_serves_every_rate(): void
    {
        $this->fakeProvider();

        $first = $this->speak(['speed' => 1.25])->assertOk()->json('url');
        $second = $this->speak()->assertOk()->json('url');
        $this->postJson(route('ai-voice.prefetch'), [
            'text' => 'Hello there friend', 'locale' => 'en', 'voice' => 'am_puck', 'speed' => 3,
        ])->assertOk()->assertJson(['url' => $first]);

        $this->assertSame($first, $second);
        Http::assertSentCount(1);
        Http::assertSent(fn (ClientRequest $request) => $request['speed'] == 1);
        $this->assertSame(2, AiVoiceClip::sole()->hits);
    }

    public function test_the_hash_is_unchanged_so_existing_clips_stay_cached(): void
    {
        // Pinned from before speed stopped being a parameter, when it was
        // hashed as "1.00": changing it would orphan every stored clip.
        $this->assertSame(
            'a3d7d8beef35594186c34d32ed49f96dd90cdb5fb89bc89923da1a3fdd824552',
            AiVoiceService::hashFor('Hello there friend', 'am_puck'),
        );
    }

    public static function voiceFallbacks(): array
    {
        return [
            'voice from another locale' => ['es', 'am_puck', 'ef_dora'],
            'no voice' => ['fr', null, 'ff_siwis'],
            'unknown voice' => ['en', 'nope', 'af_heart'],
        ];
    }

    #[DataProvider('voiceFallbacks')]
    public function test_a_voice_not_allowed_for_the_locale_falls_back_to_its_default(string $locale, ?string $voice, string $expected): void
    {
        $this->fakeProvider();

        $this->speak(['locale' => $locale, 'voice' => $voice])->assertOk();

        Http::assertSent(fn (ClientRequest $request) => $request['voice'] === $expected);
        $this->assertSame($expected, AiVoiceClip::sole()->voice);
    }

    public function test_the_native_json_response_shape_is_accepted(): void
    {
        Http::fake([
            'ai-voice.test/*' => Http::response([
                'audio' => 'data:audio/mp3;base64,'.base64_encode(self::AUDIO),
            ]),
        ]);

        $this->speak()->assertOk();

        $this->assertSame(self::AUDIO, Storage::disk('s3')->get(AiVoiceClip::sole()->path));
    }

    public function test_returns_404_when_the_flag_is_off(): void
    {
        SiteSetting::where('key', AiVoice::SETTING_KEY)->update(['value' => '0']);
        $this->fakeProvider();

        $this->speak()->assertNotFound();

        Http::assertNothingSent();
    }

    public function test_returns_503_when_the_provider_fails(): void
    {
        $this->fakeProvider(500);

        $this->speak()->assertStatus(503);

        // One retry on a server error, then give up.
        Http::assertSentCount(2);

        $this->assertSame(0, AiVoiceClip::count());
        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_a_timeout_is_not_retried(): void
    {
        // A retry here could bill the same clip twice.
        Http::fake(['ai-voice.test/*' => Http::failedConnection()]);

        $this->speak()->assertStatus(503);

        Http::assertSentCount(1);
    }

    /** Times out enough requests in a row to pause the provider. */
    private function pauseProvider(): void
    {
        Http::fake(['ai-voice.test/*' => Http::failedConnection()]);
        foreach (['one', 'two', 'three'] as $text) {
            $this->speak(['text' => $text])->assertStatus(503);
        }
    }

    public function test_repeated_timeouts_pause_the_provider(): void
    {
        $this->pauseProvider();
        $charged = AiVoiceService::charactersUsedToday();

        $this->speak(['text' => 'four'])->assertStatus(503);

        // Refused without waiting on the provider or charging the budget.
        Http::assertSentCount(3);
        $this->assertSame($charged, AiVoiceService::charactersUsedToday());
    }

    public function test_cached_clips_still_play_while_the_provider_is_paused(): void
    {
        $this->fakeProvider();
        $this->speak()->assertOk();

        $this->pauseProvider();

        $this->speak()->assertOk()->assertJsonPath('url', AiVoiceClip::sole()->url);
    }

    public function test_an_answer_from_the_provider_resets_the_failure_count(): void
    {
        Http::fake(['ai-voice.test/*' => Http::sequence()
            ->pushFailedConnection()
            ->pushFailedConnection()
            ->push(self::AUDIO, 200, ['Content-Type' => 'audio/mpeg'])
            ->pushFailedConnection()
            ->pushFailedConnection()
            ->push(self::AUDIO, 200, ['Content-Type' => 'audio/mpeg']),
        ]);

        foreach (['one', 'two', 'three', 'four', 'five'] as $text) {
            $this->speak(['text' => $text]);
        }

        $this->speak(['text' => 'six'])->assertOk();
        Http::assertSentCount(6);
    }

    public function test_after_a_pause_one_more_failure_pauses_again(): void
    {
        $this->pauseProvider();

        $this->travel(301)->seconds();

        $this->speak(['text' => 'four'])->assertStatus(503);
        $this->speak(['text' => 'five'])->assertStatus(503);

        // 'four' probed the provider; 'five' was refused without trying.
        Http::assertSentCount(4);
    }

    public function test_each_failure_keeps_the_count_alive_through_a_long_outage(): void
    {
        Http::fake(['ai-voice.test/*' => Http::failedConnection()]);

        // Sparse failures still add up, and the count outlives the pause.
        foreach (['one' => 0, 'two' => 500, 'three' => 300] as $text => $wait) {
            $this->travel($wait)->seconds();
            $this->speak(['text' => $text]);
        }
        $this->travel(301)->seconds();

        $this->speak(['text' => 'four'])->assertStatus(503);
        $this->speak(['text' => 'five'])->assertStatus(503);

        Http::assertSentCount(4);
    }

    private function setDailyLimit(string $value): void
    {
        SiteSetting::where('key', AiVoice::LIMIT_SETTING_KEY)->update(['value' => $value]);
    }

    public function test_returns_429_without_calling_the_provider_once_the_daily_limit_is_spent(): void
    {
        $this->fakeProvider();
        $this->setDailyLimit('100');
        AiVoiceClip::factory()->create(['characters' => 90]);

        // "Hello there friend" is 18 characters: 90 + 18 > 100.
        $this->speak()->assertStatus(429);

        Http::assertNothingSent();
        $this->assertSame(1, AiVoiceClip::count());
    }

    public function test_a_clip_that_fits_the_remaining_budget_is_generated(): void
    {
        $this->fakeProvider();
        $this->setDailyLimit('100');
        AiVoiceClip::factory()->create(['characters' => 82]);

        $this->speak()->assertOk();

        Http::assertSentCount(1);
    }

    public function test_cached_clips_still_play_once_the_daily_limit_is_spent(): void
    {
        $this->fakeProvider();
        $url = $this->speak()->assertOk()->json('url');
        $this->setDailyLimit('0');

        $this->speak()->assertOk()->assertJson(['url' => $url]);

        Http::assertSentCount(1);
        $this->assertSame(2, AiVoiceClip::sole()->hits);
    }

    public function test_the_budget_day_starts_at_local_midnight_not_utc(): void
    {
        // 06:00 UTC on Oct 7 is still 23:00 on Oct 6 in Los Angeles.
        $this->travelTo(Carbon::parse('2026-10-07 06:00:00', 'UTC'));
        $this->fakeProvider();
        $this->setDailyLimit('100');
        // 01:00 Oct 6 in Los Angeles: the same local day, a different UTC day.
        AiVoiceClip::factory()->create(['characters' => 90, 'created_at' => Carbon::parse('2026-10-06 08:00:00', 'UTC')]);

        $this->speak()->assertStatus(429);
    }

    public function test_clips_made_before_the_local_day_do_not_count_against_the_limit(): void
    {
        $this->travelTo(Carbon::parse('2026-10-07 06:00:00', 'UTC'));
        $this->fakeProvider();
        $this->setDailyLimit('100');
        // 23:00 Oct 5 in Los Angeles.
        AiVoiceClip::factory()->create(['characters' => 100, 'created_at' => Carbon::parse('2026-10-06 06:00:00', 'UTC')]);

        $this->speak()->assertOk();
    }

    public function test_a_provider_error_gives_the_reserved_characters_back(): void
    {
        $this->setDailyLimit('100');
        AiVoiceClip::factory()->create(['characters' => 82]);
        Http::fake(['ai-voice.test/*' => Http::sequence()
            ->push(['error' => 'boom'], 500)
            ->push(['error' => 'boom'], 500)
            ->push(self::AUDIO, 200, ['Content-Type' => 'audio/mpeg'])]);

        $this->speak()->assertStatus(503);
        // 82 + 18 still fits, so the failed attempt was not charged.
        $this->speak()->assertOk();
    }

    public function test_a_timed_out_request_stays_charged_because_it_may_have_been_billed(): void
    {
        $this->setDailyLimit('100');
        AiVoiceClip::factory()->create(['characters' => 64]);
        Http::fake(['ai-voice.test/*' => Http::sequence()
            ->pushFailedConnection()
            ->push(self::AUDIO, 200, ['Content-Type' => 'audio/mpeg'])]);

        $this->speak()->assertStatus(503);
        // 64 + 18 charged for the timeout, + 18 more = 100: still fits.
        $this->speak()->assertOk();
        // Now 118 of 100 would be needed.
        $this->speak(['text' => 'Something new to say'])->assertStatus(429);

        Http::assertSentCount(2);
    }

    #[DataProvider('invalidLimits')]
    public function test_a_blank_or_non_numeric_limit_falls_back_to_the_default(string $value): void
    {
        $this->setDailyLimit($value);

        $this->assertSame(AiVoice::DEFAULT_DAILY_CHARACTER_LIMIT, AiVoice::dailyCharacterLimit());
    }

    public static function invalidLimits(): array
    {
        return [
            'blank' => [''],
            'words' => ['lots'],
        ];
    }

    public function test_is_off_when_no_api_key_is_configured(): void
    {
        config(['services.ai_voice.api_key' => null]);
        $this->fakeProvider();

        $this->speak()->assertNotFound();
        $this->get(route('welcome'))->assertInertia(fn (Assert $page) => $page->where('aiVoice', null));

        Http::assertNothingSent();
    }

    public function test_a_quota_failure_alerts_super_admins_about_the_ai_voice(): void
    {
        Mail::fake();
        Permission::findOrCreate('super admin');
        User::factory()->create()->givePermissionTo('super admin');
        $this->fakeProvider(402);

        $this->speak()->assertStatus(503);

        Mail::assertSent(AiProviderQuotaAlertMail::class, fn (AiProviderQuotaAlertMail $mail) => $mail->provider === 'deepinfra'
            && str_contains($mail->context, 'AI voice')
            && str_contains($mail->render(), $mail->context));
    }

    public function test_a_row_stored_by_a_racing_request_is_reused_instead_of_failing(): void
    {
        $hash = AiVoiceService::hashFor('Hello there friend', 'am_puck');

        // Another host (no shared lock) finishes the same clip while this
        // request is still waiting on the provider.
        Http::fake(function () use ($hash) {
            AiVoiceClip::create([
                'hash' => $hash, 'locale' => 'en', 'voice' => 'am_puck', 'model' => 'hexgrad/Kokoro-82M',
                'speed' => 1, 'characters' => 18, 'path' => "ai-voice/en/{$hash}.mp3",
            ]);

            return Http::response(self::AUDIO, 200, ['Content-Type' => 'audio/mpeg']);
        });

        $this->speak()->assertOk()->assertJson(['url' => AiVoiceClip::sole()->url]);
    }

    public function test_guests_are_redirected_to_login(): void
    {
        auth()->logout();

        $this->post(route('ai-voice.speak'), ['text' => 'Hi', 'locale' => 'en'])
            ->assertRedirect(route('login'));
    }

    public function test_input_is_validated(): void
    {
        $this->fakeProvider();

        $this->speak(['text' => ''])->assertJsonValidationErrors('text');
        $this->speak(['text' => str_repeat('a', AiVoiceService::MAX_CHARACTERS + 1)])->assertJsonValidationErrors('text');
        $this->speak(['locale' => 'de'])->assertJsonValidationErrors('locale');
        $this->speak(['text' => ' @@ '])->assertJsonValidationErrors('text');

        Http::assertNothingSent();
    }

    public function test_requests_are_throttled(): void
    {
        $this->fakeProvider();

        for ($i = 0; $i < 60; $i++) {
            $this->speak()->assertOk();
        }

        $this->speak()->assertTooManyRequests();
        Http::assertSentCount(1);
    }

    public function test_ai_voice_prop_is_shared_only_when_enabled(): void
    {
        $this->get(route('welcome'))->assertInertia(fn (Assert $page) => $page
            ->where('aiVoice.voices.en.0', 'af_heart')
            ->where('aiVoice.voices.fr', ['ff_siwis'])
        );

        SiteSetting::where('key', AiVoice::SETTING_KEY)->update(['value' => '0']);

        $this->get(route('welcome'))->assertInertia(fn (Assert $page) => $page
            ->where('aiVoice', null)
        );
    }

    public function test_ai_voice_prop_is_not_shared_with_guests(): void
    {
        auth()->logout();

        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page
            ->where('aiVoice', null)
        );
    }

    public function test_the_service_rejects_text_that_normalizes_to_nothing(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        app(AiVoiceService::class)->clipFor(' @ ', 'en', null);
    }

    public function test_normalize_matches_the_client_cleanup(): void
    {
        $this->assertSame('Hi there friend', AiVoiceService::normalize("  Hi\n\tthere  @friend "));
    }
}
