<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class ValidWebPushEndpoint implements ValidationRule
{
    /**
     * Allowed Web Push provider domains.
     * These are the legitimate Web Push notification service providers.
     */
    private const ALLOWED_DOMAINS = [
        'fcm.googleapis.com',                    // Google Firebase Cloud Messaging
        'updates.push.services.mozilla.com',      // Mozilla Push Service
        'notify.windows.com',                     // Microsoft Windows Push Notification Service
    ];

    /**
     * Run the validation rule.
     *
     * @param  Closure(string): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('The :attribute must be a valid Web Push endpoint URL.');

            return;
        }

        // Parse the URL
        $parsedUrl = parse_url($value);

        // Must be a valid URL
        if ($parsedUrl === false || ! isset($parsedUrl['scheme'], $parsedUrl['host'])) {
            $fail('The :attribute must be a valid URL.');

            return;
        }

        // Must use HTTPS
        if ($parsedUrl['scheme'] !== 'https') {
            $fail('The :attribute must use HTTPS protocol.');

            return;
        }

        // Check if host matches an allowed domain
        $host = $parsedUrl['host'];
        $isAllowed = false;

        foreach (self::ALLOWED_DOMAINS as $allowedDomain) {
            // Exact match or subdomain match (e.g., *.notify.windows.com)
            if ($host === $allowedDomain || str_ends_with($host, '.'.$allowedDomain)) {
                $isAllowed = true;
                break;
            }
        }

        if (! $isAllowed) {
            $fail('The :attribute must be from a trusted Web Push provider.');

            return;
        }

        // Additional validation: endpoint should have a path (not just domain)
        if (! isset($parsedUrl['path']) || trim($parsedUrl['path'], '/') === '') {
            $fail('The :attribute must include a valid endpoint path.');

            return;
        }

        // Reject localhost, private IPs, and internal domains
        if ($this->isInternalOrLocalhost($host)) {
            $fail('The :attribute cannot point to internal or localhost addresses.');

            return;
        }
    }

    /**
     * Check if the host is an internal/localhost address.
     */
    private function isInternalOrLocalhost(string $host): bool
    {
        // Check for localhost variants
        if (in_array(strtolower($host), ['localhost', '127.0.0.1', '::1'])) {
            return true;
        }

        // Check if host is an IP address
        $isIp = filter_var($host, FILTER_VALIDATE_IP) !== false;

        if ($isIp) {
            // For IP addresses, check for private/reserved ranges
            if (filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                return true;
            }
        } else {
            // For hostnames, check for internal domain patterns
            $internalPatterns = [
                '.local',
                '.internal',
                '.lan',
            ];

            foreach ($internalPatterns as $pattern) {
                if (str_ends_with($host, $pattern)) {
                    return true;
                }
            }
        }

        return false;
    }
}
