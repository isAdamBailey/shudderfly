<?php

namespace Tests\Feature;

use App\Mail\AiProviderQuotaAlertMail;
use App\Models\User;
use App\Services\AiProviderAlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AiProviderAlertServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
    }

    private function fakeResponse(int $status, array $body = []): Response
    {
        Http::fake(['example.test/*' => Http::response($body, $status)]);

        return Http::get('https://example.test/');
    }

    private function service(): AiProviderAlertService
    {
        return app(AiProviderAlertService::class);
    }

    public function test_it_emails_super_admins_on_a_429_response(): void
    {
        $superAdmin = User::factory()->create(['email' => 'reports@example.com']);
        $superAdmin->givePermissionTo(Permission::findOrCreate('super admin'));

        $this->service()->alertIfQuotaExceeded('anthropic', $this->fakeResponse(429));

        Mail::assertSent(
            AiProviderQuotaAlertMail::class,
            fn (AiProviderQuotaAlertMail $mail) => $mail->hasTo('reports@example.com') && $mail->provider === 'anthropic'
        );
    }

    public function test_it_emails_super_admins_on_a_credit_balance_message(): void
    {
        $superAdmin = User::factory()->create(['email' => 'reports@example.com']);
        $superAdmin->givePermissionTo(Permission::findOrCreate('super admin'));

        $response = $this->fakeResponse(400, ['error' => ['message' => 'Your credit balance is too low.']]);

        $this->service()->alertIfQuotaExceeded('anthropic', $response);

        Mail::assertSent(AiProviderQuotaAlertMail::class);
    }

    public function test_it_does_not_email_on_an_unrelated_error(): void
    {
        $superAdmin = User::factory()->create(['email' => 'reports@example.com']);
        $superAdmin->givePermissionTo(Permission::findOrCreate('super admin'));

        $this->service()->alertIfQuotaExceeded('anthropic', $this->fakeResponse(400, ['error' => 'bad request']));

        Mail::assertNothingSent();
    }

    public function test_it_only_emails_once_per_provider_per_day(): void
    {
        $superAdmin = User::factory()->create(['email' => 'reports@example.com']);
        $superAdmin->givePermissionTo(Permission::findOrCreate('super admin'));

        $this->service()->alertIfQuotaExceeded('anthropic', $this->fakeResponse(429));
        $this->service()->alertIfQuotaExceeded('anthropic', $this->fakeResponse(429));

        Mail::assertSent(AiProviderQuotaAlertMail::class, 1);
    }

    public function test_a_second_provider_still_alerts_while_the_first_is_debounced(): void
    {
        $superAdmin = User::factory()->create(['email' => 'reports@example.com']);
        $superAdmin->givePermissionTo(Permission::findOrCreate('super admin'));

        $this->service()->alertIfQuotaExceeded('anthropic', $this->fakeResponse(429));
        $this->service()->alertIfQuotaExceeded('huggingface', $this->fakeResponse(429));

        Mail::assertSent(AiProviderQuotaAlertMail::class, 2);
    }

    public function test_it_sends_nothing_when_no_super_admin_exists(): void
    {
        User::factory()->create();

        $this->service()->alertIfQuotaExceeded('anthropic', $this->fakeResponse(429));

        Mail::assertNothingSent();
    }

    public function test_it_does_not_consume_the_debounce_slot_when_there_are_no_recipients_yet(): void
    {
        User::factory()->create();

        $this->service()->alertIfQuotaExceeded('anthropic', $this->fakeResponse(429));

        $superAdmin = User::factory()->create(['email' => 'reports@example.com']);
        $superAdmin->givePermissionTo(Permission::findOrCreate('super admin'));

        $this->service()->alertIfQuotaExceeded('anthropic', $this->fakeResponse(429));

        Mail::assertSent(AiProviderQuotaAlertMail::class, 1);
    }
}
