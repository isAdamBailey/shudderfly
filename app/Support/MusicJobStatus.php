<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Records the progress of the queued YouTube playlist sync so the music flyout
 * can poll for an outcome. The sync used to run inline in the request and flash
 * its result; once queued there is nothing to flash, so it reports through here.
 */
final class MusicJobStatus
{
    public const CACHE_KEY = 'music:status:sync';

    /**
     * How long a recorded status stays readable.
     */
    public const TTL_SECONDS = 86400;

    /**
     * States that mean the job is done. The client polls until one of these,
     * so the vocabulary lives here and ships to the browser as a boolean
     * rather than being duplicated in JavaScript.
     */
    public const TERMINAL_STATES = ['success', 'warning', 'error'];

    public static function put(string $state, ?string $message = null): void
    {
        Cache::put(self::CACHE_KEY, [
            'state' => $state,
            'message' => $message,
            'at' => now()->toIso8601String(),
        ], self::TTL_SECONDS);
    }

    /**
     * @return array{state: string, message: ?string, at: string, done: bool}|null
     */
    public static function get(): ?array
    {
        $status = Cache::get(self::CACHE_KEY);

        if ($status === null) {
            return null;
        }

        return $status + [
            'done' => in_array($status['state'], self::TERMINAL_STATES, true),
        ];
    }
}
