<?php

namespace App\Services;

use App\Exceptions\AiVoiceBudgetExceeded;
use App\Exceptions\AiVoiceUnavailable;
use App\Models\AiVoiceClip;
use App\Support\AiVoice;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Client\ConnectionException;
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
 * Each unique (model, voice, text) is generated once: the
 * ai_voice_clips table maps its hash to the stored file, so every later
 * request is a single indexed query and the browser fetches the audio
 * straight from S3/CloudFront.
 *
 * Every clip is made at the provider's default speed. The browser applies
 * the listener's rate, pitch and volume when it plays the clip, so one
 * clip serves every slider position.
 */
class AiVoiceService
{
    /**
     * Longest text, after normalize(), that one clip may hold: a cost cap for
     * every caller, not just the HTTP endpoint.
     */
    public const MAX_CHARACTERS = 2000;

    // The only speed clips are made at. It stays in the hash, formatted as
    // when speed was a parameter, so clips stored before then keep their
    // hashes: the table holds no text to hash them again from.
    private const CLIP_SPEED = 1.0;

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

    // The budget lock only guards a cache read and write.
    private const BUDGET_LOCK_SECONDS = 5;

    /**
     * A cached clip is always returned, even once today's budget is spent;
     * only generating a new one is refused.
     *
     * $ahead is for a clip made before anyone asks to hear it (warming,
     * prefetch): a cached clip records no play but is marked still wanted,
     * so prune keeps it, and a new one may only use the ahead-of-time share
     * of today's budget, leaving the rest for live plays.
     *
     * @throws \InvalidArgumentException when $text is empty or too long once normalized
     * @throws AiVoiceBudgetExceeded
     * @throws AiVoiceUnavailable
     */
    public function clipFor(string $text, string $locale, ?string $voice, bool $ahead = false): AiVoiceClip
    {
        $key = self::keyFor($text, $locale, $voice)
            ?? throw new \InvalidArgumentException('AI voice text must be 1-'.self::MAX_CHARACTERS.' characters');
        ['text' => $text, 'voice' => $voice, 'hash' => $hash] = $key;
        $model = (string) config('services.ai_voice.model');

        if ($clip = $this->findClip($hash, $ahead)) {
            return $clip;
        }

        try {
            // Two simultaneous misses on the same text would otherwise both
            // pay the provider and race to insert the same unique hash.
            return Cache::lock("ai-voice:{$hash}", $this->lockSeconds())->block(
                self::LOCK_WAIT_SECONDS,
                fn () => $this->findClip($hash, $ahead) ?? $this->generate($hash, $text, $locale, $voice, $model, $ahead)
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
    public static function hashFor(string $text, string $voice): string
    {
        return hash('sha256', implode('|', [
            config('services.ai_voice.provider'),
            config('services.ai_voice.model'),
            $voice,
            number_format(self::CLIP_SPEED, 2, '.', ''),
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
     * What clipFor() would speak and store for these arguments: the
     * normalized text, the allowed voice and the cache hash. Null when the
     * text is empty or too long to make a clip of.
     *
     * @return array{text: string, voice: string, hash: string}|null
     */
    public static function keyFor(string $text, string $locale, ?string $voice): ?array
    {
        $text = self::normalize($text);

        if (! self::fits($text)) {
            return null;
        }

        $voice = self::voiceFor($locale, $voice);

        return ['text' => $text, 'voice' => $voice, 'hash' => self::hashFor($text, $voice)];
    }

    /**
     * $voice when it is allowed for $locale, otherwise that locale's default
     * (the first in its list, falling back to English's).
     */
    private static function voiceFor(string $locale, ?string $voice): string
    {
        $voices = config("services.ai_voice.voices.{$locale}") ?: config('services.ai_voice.voices.en');

        return in_array($voice, $voices, true) ? $voice : $voices[0];
    }

    /**
     * Whether normalized text can be one clip: it has words and is not too
     * long. Longer text plays in the device voice.
     */
    public static function fits(string $text): bool
    {
        return $text !== '' && mb_strlen($text) <= self::MAX_CHARACTERS;
    }

    private function findClip(string $hash, bool $ahead): ?AiVoiceClip
    {
        $clip = AiVoiceClip::where('hash', $hash)->first();

        if ($ahead) {
            $clip?->update(['last_played_at' => now()]);
        } else {
            $clip?->increment('hits', 1, ['last_played_at' => now()]);
        }

        return $clip;
    }

    private function generate(string $hash, string $text, string $locale, string $voice, string $model, bool $ahead): AiVoiceClip
    {
        $characters = mb_strlen($text);
        $this->reserveBudget($characters, $ahead ? AiVoice::aheadOfTimeCharacterLimit() : AiVoice::dailyCharacterLimit());

        try {
            $audio = $this->synthesize($text, $voice, $model);
        } catch (AiVoiceUnavailable $exception) {
            // A timeout or dropped connection may still have been billed,
            // so it stays charged; anything else produced no audio.
            if (! $exception->getPrevious() instanceof ConnectionException) {
                $this->adjustBudget(fn (int $used) => $used - $characters);
            }

            throw $exception;
        }
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
            'speed' => self::CLIP_SPEED,
            'characters' => $characters,
            'path' => $path,
            'hits' => 1,
            'last_played_at' => now(),
        ]);
    }

    /**
     * Charges $characters to today's budget before the provider is called,
     * or refuses the clip if that would take today's total past $limit. Reserving up
     * front, under one lock for every text, means a burst of different
     * misses cannot all pass the check before any of them is recorded.
     */
    private function reserveBudget(int $characters, int $limit): void
    {
        $used = null;

        $this->adjustBudget(function (int $current) use ($characters, $limit, &$used) {
            $used = $current;

            return $current + $characters <= $limit ? $current + $characters : $current;
        });

        if ($used + $characters <= $limit) {
            return;
        }

        // Once per day is enough to explain the fallback in the logs.
        if (Cache::add('ai-voice:budget-logged:'.AiVoice::budgetDay()->toDateString(), true, now()->addDay())) {
            Log::warning('AI voice daily character limit reached; new clips fall back to the device voice', [
                'limit' => $limit,
                'used' => $used,
            ]);
        }

        throw new AiVoiceBudgetExceeded("AI voice daily character limit of {$limit} reached");
    }

    /**
     * Applies $change to the characters charged today. The running total
     * starts from the clips stored today, and also holds characters spent
     * on requests that timed out, which never produce a row.
     *
     * @param  callable(int): int  $change
     */
    private function adjustBudget(callable $change): void
    {
        $day = AiVoice::budgetDay();

        try {
            Cache::lock('ai-voice:budget', self::BUDGET_LOCK_SECONDS)->block(self::LOCK_WAIT_SECONDS, function () use ($change, $day) {
                Cache::put(self::budgetKey($day), max(0, $change(self::charactersUsedToday())), $day->endOfDay()->addHour());
            });
        } catch (LockTimeoutException) {
            throw new AiVoiceUnavailable('Timed out waiting for the AI voice budget');
        }
    }

    /**
     * Characters charged to today's budget so far, including requests that
     * timed out and so never stored a clip.
     */
    public static function charactersUsedToday(): int
    {
        $day = AiVoice::budgetDay();

        return (int) (Cache::get(self::budgetKey($day)) ?? AiVoiceClip::charactersSince($day->startOfDay()));
    }

    private static function budgetKey(CarbonInterface $day): string
    {
        return 'ai-voice:characters:'.$day->toDateString();
    }

    /**
     * MP3 bytes for $text from the provider.
     */
    private function synthesize(string $text, string $voice, string $model): string
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
                    'speed' => self::CLIP_SPEED,
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
