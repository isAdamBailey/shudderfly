<?php

namespace App\Services;

use App\Exceptions\AiVoiceUnavailable;
use App\Models\AiVoiceClip;
use App\Support\AiVoice;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Turns text into a cached AI voice clip on S3.
 *
 * Each unique (model, voice, speed, text) is generated once: the
 * ai_voice_clips table maps its hash to the stored file, so every later
 * request is a single indexed query and the browser fetches the audio
 * straight from S3/CloudFront.
 */
class AiVoiceService
{
    /**
     * Longest text, after normalize(), that one clip may hold: a cost cap for
     * every caller, not just the HTTP endpoint.
     */
    public const MAX_CHARACTERS = 2000;

    private const CONNECT_TIMEOUT_SECONDS = 3;

    // Total attempts, not retries (Laravel's retry() counts tries). Only a
    // server error is retried, once and quickly: a timeout surfaces as a
    // ConnectionException too, and retrying a slow but working provider
    // would bill the same clip twice while the user has long since given up.
    private const ATTEMPTS = 2;

    private const RETRY_SLEEP_MS = 200;

    // Headroom on top of the provider attempts for the retry sleep and the
    // S3 upload; see lockSeconds().
    private const LOCK_MARGIN_SECONDS = 10;

    // A request that finds the clip already being made waits only briefly:
    // the client gives up after ~1.5s and falls back to the device voice
    // anyway, so holding a worker longer helps no one.
    private const LOCK_WAIT_SECONDS = 2;

    /**
     * @throws \InvalidArgumentException when $text is empty or too long once normalized
     * @throws AiVoiceUnavailable
     */
    public function clipFor(string $text, string $locale, ?string $voice, float $speed): AiVoiceClip
    {
        $text = self::normalize($text);

        if ($text === '' || mb_strlen($text) > self::MAX_CHARACTERS) {
            throw new \InvalidArgumentException('AI voice text must be 1-'.self::MAX_CHARACTERS.' characters');
        }

        $voice = $this->resolveVoice($locale, $voice);
        $speed = round($speed, 2);
        $model = (string) config('services.ai_voice.model');
        $hash = self::hashFor($text, $voice, $speed);

        if ($clip = $this->recordHit($hash)) {
            return $clip;
        }

        try {
            // Two simultaneous misses on the same text would otherwise both
            // pay the provider and race to insert the same unique hash.
            return Cache::lock("ai-voice:{$hash}", $this->lockSeconds())->block(
                self::LOCK_WAIT_SECONDS,
                fn () => $this->recordHit($hash) ?? $this->generate($hash, $text, $locale, $voice, $speed, $model)
            );
        } catch (LockTimeoutException) {
            Log::warning('AI voice timed out waiting for a concurrent generation', ['hash' => $hash]);

            throw new AiVoiceUnavailable('Timed out waiting for another request to generate the same clip');
        }
    }

    /**
     * The cache key for an already-normalized text. Provider and model are
     * both in it, so switching either invalidates the cache instead of
     * serving the old voice's clips.
     */
    public static function hashFor(string $text, string $voice, float $speed): string
    {
        return hash('sha256', implode('|', [
            config('services.ai_voice.provider'),
            config('services.ai_voice.model'),
            $voice,
            number_format($speed, 2, '.', ''),
            $text,
        ]));
    }

    /**
     * The same clean-up the client applied before speaking with the device
     * voice, so both voices say the same words.
     */
    public static function normalize(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', str_replace('@', '', $text)));
    }

    /**
     * $voice when it is allowed for $locale, otherwise that locale's default
     * (the first in its list, falling back to English's).
     */
    private function resolveVoice(string $locale, ?string $voice): string
    {
        $voices = config("services.ai_voice.voices.{$locale}") ?: config('services.ai_voice.voices.en');

        return in_array($voice, $voices, true) ? $voice : $voices[0];
    }

    private function recordHit(string $hash): ?AiVoiceClip
    {
        $clip = AiVoiceClip::where('hash', $hash)->first();

        $clip?->increment('hits', 1, ['last_played_at' => now()]);

        return $clip;
    }

    private function generate(string $hash, string $text, string $locale, string $voice, float $speed, string $model): AiVoiceClip
    {
        $audio = $this->synthesize($text, $voice, $speed, $model);
        $path = "ai-voice/{$locale}/{$hash}.mp3";

        if (! Storage::disk('s3')->put($path, $audio, 'public')) {
            throw new AiVoiceUnavailable("Could not store AI voice clip at {$path}");
        }

        // createOrFirst: if the lock was not shared (file cache on several
        // hosts) and another request stored the same clip first, reuse its
        // row rather than failing on the unique hash.
        return AiVoiceClip::createOrFirst(['hash' => $hash], [
            'locale' => $locale,
            'voice' => $voice,
            'model' => $model,
            'speed' => $speed,
            'characters' => mb_strlen($text),
            'path' => $path,
            'hits' => 1,
            'last_played_at' => now(),
        ]);
    }

    /**
     * MP3 bytes for $text from the provider.
     */
    private function synthesize(string $text, string $voice, float $speed, string $model): string
    {
        if (! AiVoice::configured()) {
            Log::warning('AI voice skipped: missing AI_VOICE_API_KEY');

            throw new AiVoiceUnavailable('AI voice provider is not configured');
        }

        try {
            $response = $this->httpClient()
                ->withToken((string) config('services.ai_voice.api_key'))
                ->post((string) config('services.ai_voice.endpoint'), [
                    'model' => $model,
                    'input' => $text,
                    'voice' => $voice,
                    'speed' => $speed,
                    'response_format' => 'mp3',
                ]);
        } catch (\Throwable $exception) {
            Log::warning('AI voice request exception', ['error' => $exception->getMessage()]);

            throw new AiVoiceUnavailable('AI voice request failed', previous: $exception);
        }

        if (! $response->successful()) {
            $provider = (string) config('services.ai_voice.provider');
            app(AiProviderAlertService::class)->alertIfQuotaExceeded(
                $provider,
                $response,
                __('messages.ai_voice.provider_alert', ['provider' => ucfirst($provider)]),
            );

            Log::warning('AI voice generation failed', [
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 500),
            ]);

            throw new AiVoiceUnavailable("AI voice provider returned {$response->status()}");
        }

        $audio = $this->extractAudio($response);

        if ($audio === '') {
            Log::warning('AI voice provider returned no audio', [
                'content_type' => $response->header('Content-Type'),
            ]);

            throw new AiVoiceUnavailable('AI voice provider returned no audio');
        }

        return $audio;
    }

    /**
     * The OpenAI-compatible endpoint answers with the raw audio bytes; the
     * native one wraps them in JSON as base64, sometimes as a data URL.
     * Accept both so switching endpoints is only a config change.
     */
    private function extractAudio(Response $response): string
    {
        if (! str_contains((string) $response->header('Content-Type'), 'json')) {
            return $response->body();
        }

        $encoded = (string) $response->json('audio', '');
        $encoded = preg_replace('/^data:[^,]*,/', '', $encoded);

        return (string) base64_decode($encoded, true);
    }

    /**
     * Outlasts the worst-case generation, so the lock never expires while a
     * clip is still being made and a second request pays for it again.
     */
    private function lockSeconds(): int
    {
        return self::ATTEMPTS * (self::CONNECT_TIMEOUT_SECONDS + $this->timeoutSeconds()) + self::LOCK_MARGIN_SECONDS;
    }

    private function timeoutSeconds(): int
    {
        return (int) config('services.ai_voice.timeout');
    }

    private function httpClient(): PendingRequest
    {
        return Http::connectTimeout(self::CONNECT_TIMEOUT_SECONDS)
            ->timeout($this->timeoutSeconds())
            ->retry(
                self::ATTEMPTS,
                self::RETRY_SLEEP_MS,
                fn ($exception): bool => $exception instanceof RequestException && $exception->response->serverError(),
                false,
            );
    }
}
