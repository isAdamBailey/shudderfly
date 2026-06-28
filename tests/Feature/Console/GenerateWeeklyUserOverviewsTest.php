<?php

namespace Tests\Feature\Console;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GenerateWeeklyUserOverviewsTest extends TestCase
{
    use RefreshDatabase;

    private const ENDPOINT = 'https://router.huggingface.co/featherless-ai/v1/chat/completions';

    private const MODEL = 'Qwen/Qwen2.5-1.5B-Instruct';

    private function configureService(): void
    {
        config([
            'services.huggingface.api_token' => 'test-token',
            'services.huggingface.user_overview_endpoint' => self::ENDPOINT,
            'services.huggingface.user_overview_model' => self::MODEL,
        ]);
    }

    public function test_command_saves_generated_overview_on_success(): void
    {
        $this->configureService();

        $user = User::factory()->create([
            'name' => 'Sunny Reader',
        ]);

        Http::fake([
            'router.huggingface.co/*' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'Sunny Reader is the sparkly glue that keeps story time joyful for everyone.',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertSame(
            'Sunny Reader is the sparkly glue that keeps story time joyful for everyone.',
            $user->weekly_profile_overview
        );
        $this->assertNotNull($user->weekly_profile_overview_generated_at);
    }

    public function test_command_sends_openai_compatible_chat_payload(): void
    {
        $this->configureService();

        User::factory()->create(['name' => 'Payload Reader']);

        Http::fake([
            'router.huggingface.co/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Payload Reader is delightful.']],
                ],
            ], 200),
        ]);

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        Http::assertSent(function (Request $request) {
            $body = $request->data();

            return $request->url() === self::ENDPOINT
                && $request->hasHeader('Authorization', 'Bearer test-token')
                && data_get($body, 'model') === self::MODEL
                && data_get($body, 'messages.0.role') === 'user'
                && is_string(data_get($body, 'messages.0.content'))
                && data_get($body, 'max_tokens') === 110;
        });
    }

    public function test_command_saves_fallback_overview_when_request_fails(): void
    {
        $this->configureService();

        $user = User::factory()->create([
            'name' => 'Steady Reader',
            'weekly_profile_overview' => 'Existing profile story.',
            'weekly_profile_overview_generated_at' => now()->subDays(5),
        ]);
        $originalGeneratedAt = $user->weekly_profile_overview_generated_at;

        Http::fake([
            'router.huggingface.co/*' => Http::response(['error' => 'Bad request'], 400),
        ]);

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertStringContainsString('Steady Reader is', $user->weekly_profile_overview);
        $this->assertStringContainsString('not active on Shudderfly this week', $user->weekly_profile_overview);
        $this->assertFalse($user->weekly_profile_overview_generated_at?->equalTo($originalGeneratedAt) ?? true);
    }

    public function test_command_saves_fallback_overview_when_content_is_empty(): void
    {
        $this->configureService();

        $user = User::factory()->create(['name' => 'Empty Reader']);

        Http::fake([
            'router.huggingface.co/*' => Http::response([
                'choices' => [['message' => ['content' => '']]],
            ], 200),
        ]);

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertStringContainsString('Empty Reader is', $user->weekly_profile_overview);
        $this->assertStringContainsString('not active on Shudderfly this week', $user->weekly_profile_overview);
    }

    public function test_command_saves_fallback_overview_when_token_missing(): void
    {
        config([
            'services.huggingface.api_token' => '',
            'services.huggingface.user_overview_endpoint' => self::ENDPOINT,
            'services.huggingface.user_overview_model' => self::MODEL,
        ]);

        $user = User::factory()->create(['name' => 'Tokenless Reader']);

        Http::fake();

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertStringContainsString('Tokenless Reader is', $user->weekly_profile_overview);
        $this->assertNotNull($user->weekly_profile_overview_generated_at);
        Http::assertNothingSent();
    }

    public function test_command_rejects_invalid_generated_overview(): void
    {
        $this->configureService();

        $user = User::factory()->create(['name' => 'Invalid Reader']);

        Http::fake([
            'router.huggingface.co/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => '## Not a valid overview']],
                ],
            ], 200),
        ]);

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertStringStartsWith('Invalid Reader is', $user->weekly_profile_overview);
        $this->assertStringNotContainsString('## Not a valid overview', $user->weekly_profile_overview);
    }

    public function test_command_accepts_overview_with_numbers_and_wrapping_quotes(): void
    {
        $this->configureService();

        $user = User::factory()->create(['name' => 'Cara']);

        $generated = '"Cara is an avid reader on Shudderfly with over 817 books and 55,000 reads this week."';

        Http::fake([
            'router.huggingface.co/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => $generated]],
                ],
            ], 200),
        ]);

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertSame(
            'Cara is an avid reader on Shudderfly with over 817 books and 55,000 reads this week.',
            $user->weekly_profile_overview
        );
    }

    public function test_command_trims_truncated_overview_to_last_complete_sentence(): void
    {
        $this->configureService();

        $user = User::factory()->create(['name' => 'Tess']);

        $truncated = 'Tess is the snack-fueled story machine of Shudderfly. They also posted messages while munching on imaginary pretz';

        Http::fake([
            'router.huggingface.co/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => $truncated]],
                ],
            ], 200),
        ]);

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertSame(
            'Tess is the snack-fueled story machine of Shudderfly.',
            $user->weekly_profile_overview
        );
    }

    public function test_command_retries_generation_when_first_attempt_is_unusable(): void
    {
        $this->configureService();

        $user = User::factory()->create(['name' => 'Remi']);

        Http::fake([
            'router.huggingface.co/*' => Http::sequence()
                ->push([
                    'choices' => [
                        ['message' => ['content' => 'Remi is having the best time ever with snacks and gigg']],
                    ],
                ], 200)
                ->push([
                    'choices' => [
                        ['message' => ['content' => 'Remi is the giggliest snack connoisseur on Shudderfly this week.']],
                    ],
                ], 200),
        ]);

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertSame(
            'Remi is the giggliest snack connoisseur on Shudderfly this week.',
            $user->weekly_profile_overview
        );
        Http::assertSentCount(2);
    }

    public function test_command_retries_on_connection_timeout_then_succeeds(): void
    {
        $this->configureService();

        $user = User::factory()->create(['name' => 'Tory']);

        $callCount = 0;
        Http::fake(function () use (&$callCount) {
            $callCount++;

            if ($callCount === 1) {
                throw new \Illuminate\Http\Client\ConnectionException('Connection timed out.');
            }

            return Http::response([
                'choices' => [
                    ['message' => ['content' => 'Tory is back online and reading like a champ this week.']],
                ],
            ], 200);
        });

        $this->artisan('users:generate-weekly-overviews')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertSame(
            'Tory is back online and reading like a champ this week.',
            $user->weekly_profile_overview
        );
        $this->assertGreaterThanOrEqual(2, $callCount);
    }
}
