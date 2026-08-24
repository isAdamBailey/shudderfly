<?php

namespace App\Services;

use App\Mail\AiProviderQuotaAlertMail;
use App\Support\SuperAdmins;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;

/**
 * Emails super admins when a Hugging Face or Anthropic response looks
 * like the account is out of credits/quota rather than a transient
 * failure, so someone notices in time to add funds or flip AI_PROVIDER
 * to the other one.
 *
 * Debounced to one email per provider per ALERT_TTL_HOURS: a queue
 * worker can retry the same failure many times in a row, and this must
 * not turn into a flood of identical emails.
 */
class AiProviderAlertService
{
    private const ALERT_TTL_HOURS = 24;

    private const QUOTA_STATUS_CODES = [402, 429];

    private const QUOTA_KEYWORDS = ['credit', 'quota', 'insufficient', 'balance'];

    public function alertIfQuotaExceeded(string $provider, Response $response): void
    {
        if (! $this->looksLikeQuotaExceeded($response)) {
            return;
        }

        $recipients = SuperAdmins::recipients();

        if ($recipients->isEmpty()) {
            return;
        }

        // Checked only once recipients are confirmed to exist: reserving the
        // debounce slot before that would silently swallow the next 24h of
        // alerts if the failure recurred before any super admin was added.
        if (! Cache::add("ai-provider-quota-alert:{$provider}", true, now()->addHours(self::ALERT_TTL_HOURS))) {
            return;
        }

        foreach ($recipients as $recipient) {
            try {
                Mail::to($recipient->email)->send(
                    new AiProviderQuotaAlertMail($provider, $response->status(), $response->body())
                );
            } catch (\Throwable $exception) {
                report($exception);
            }
        }
    }

    private function looksLikeQuotaExceeded(Response $response): bool
    {
        if (in_array($response->status(), self::QUOTA_STATUS_CODES, true)) {
            return true;
        }

        $body = mb_strtolower($response->body());

        foreach (self::QUOTA_KEYWORDS as $keyword) {
            if (str_contains($body, $keyword)) {
                return true;
            }
        }

        return false;
    }
}
