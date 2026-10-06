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
            'speed' => 1,
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

    public function test_a_different_speed_is_a_different_clip(): void
    {
        $this->fakeProvider();

        $this->speak()->assertOk();
        $this->speak(['speed' => 1.25])->assertOk();

        Http::assertSentCount(2);
        $this->assertSame(2, AiVoiceClip::count());
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
        $hash = AiVoiceService::hashFor('Hello there friend', 'am_puck', 1);

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
        $this->speak(['speed' => 3])->assertJsonValidationErrors('speed');
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

    public function test_the_service_rejects_text_that_normalizes_to_nothing(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        app(AiVoiceService::class)->clipFor(' @ ', 'en', null, 1);
    }

    public function test_normalize_matches_the_client_cleanup(): void
    {
        $this->assertSame('Hi there friend', AiVoiceService::normalize("  Hi\n\tthere  @friend "));
    }
}
