<?php

namespace App\Support;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Http\Request;

final class ReadThrottle
{
    /**
     * Build a stable per-actor fingerprint used for throttling
     * Prefer: authenticated user id -> session id -> IP address
     */
    public static function fingerprint(Request $request): string
    {
        $fingerprint = $request->user()?->id
            ?? $request->session()->getId()
            ?? $request->ip();

        return (string) $fingerprint;
    }

    /**
     * Build the cache key for read throttling: reads:{entity}:{id}:{sha256(fingerprint)}
     * Accepts either a Request or a fingerprint string.
     */
    public static function cacheKey(string $entity, int|string $id, Request|string $actor): string
    {
        if ($actor instanceof Request) {
            $fingerprint = self::fingerprint($actor);
        } else {
            $fingerprint = (string) $actor;
        }
        $hash = hash('sha256', $fingerprint);

        return sprintf('reads:%s:%s:%s', $entity, $id, $hash);
    }

    /**
     * Dispatch a queue job immediately in testing/sync environments, or with a small delay otherwise.
     * All jobs are now dispatched to SQS queue.
     * This consolidates the conditional logic used in controllers.
     */
    public static function dispatchJob(ShouldQueue $job, int $delaySeconds = 5): void
    {
        // In tests or when using the sync driver, dispatch immediately
        if (app()->environment('testing') || config('queue.default') === 'sync') {
            dispatch($job);

            return;
        }

        // Dispatch with a small delay to smooth out rapid page refreshes
        dispatch($job)->delay(now()->addSeconds($delaySeconds));
    }
}
