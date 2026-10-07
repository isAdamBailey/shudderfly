<?php

namespace App\Support;

use App\Http\Middleware\SetLocale;
use App\Models\AiVoiceClip;
use App\Models\SiteSetting;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Gate for the AI voice: while off, the app speaks with the device's
 * speechSynthesis voice and never calls the TTS provider.
 */
class AiVoice
{
    public const SETTING_KEY = 'ai_voice_enabled';

    public const LIMIT_SETTING_KEY = 'ai_voice_daily_character_limit';

    public const DEFAULT_DAILY_CHARACTER_LIMIT = 200000;

    // Share of the daily limit kept for live plays: clips made ahead of
    // time (prewarm, warming, prefetch) stop short of it, so a burst of
    // them can't push everyone onto the device voice for the rest of the day.
    public const LIVE_SHARE = 0.25;

    /**
     * The flag is on and the provider has a key. Without the key every
     * request would fail, so the client should not even try.
     *
     * @param  Collection<int, SiteSetting>|null  $settings  every SiteSetting,
     *                                                       when the caller has
     *                                                       already loaded them
     */
    public static function enabled(?Collection $settings = null): bool
    {
        if (! self::configured()) {
            return false;
        }

        $setting = $settings
            ? $settings->firstWhere('key', self::SETTING_KEY)
            : SiteSetting::where('key', self::SETTING_KEY)->first();

        return (bool) $setting?->value;
    }

    public static function configured(): bool
    {
        return trim((string) config('services.ai_voice.api_key')) !== '';
    }

    /**
     * The locales clips are warmed in ahead of time: English, plus every
     * language a user has chosen.
     *
     * @return list<string>
     */
    public static function spokenLocales(): array
    {
        $chosen = User::whereNotNull('locale')->distinct()->pluck('locale')->all();

        return array_values(array_intersect(SetLocale::SUPPORTED_LOCALES, ['en', ...$chosen]));
    }

    /**
     * Characters per day that new clips may cost. A blank or non-numeric
     * setting means the default rather than "no limit", so a mistyped value
     * can never remove the cost guard.
     */
    public static function dailyCharacterLimit(): int
    {
        $value = SiteSetting::where('key', self::LIMIT_SETTING_KEY)->first()?->value;

        return is_numeric($value) ? max(0, (int) $value) : self::DEFAULT_DAILY_CHARACTER_LIMIT;
    }

    /**
     * How much of today's total clips made ahead of time may reach.
     */
    public static function aheadOfTimeCharacterLimit(): int
    {
        return (int) floor(self::dailyCharacterLimit() * (1 - self::LIVE_SHARE));
    }

    /**
     * Now in the owner's timezone, so the daily budget resets at local
     * midnight like every scheduled job, not at midnight UTC.
     */
    public static function budgetDay(): CarbonImmutable
    {
        return CarbonImmutable::now(config('app.local_timezone'));
    }

    /**
     * Estimated provider cost in dollars for $characters of input.
     */
    public static function estimatedCost(int $characters): float
    {
        return $characters / 1_000_000 * (float) config('services.ai_voice.price_per_million');
    }

    /**
     * Spend since $since, and how often plays are served from the cache.
     * Plays are only counted per clip (hits), not per day, so the hit rate
     * covers every clip still stored rather than just this period.
     *
     * @return array{clips: int, characters: int, cost: float, hitRate: float|null}
     */
    public static function usageSince(CarbonInterface $since): array
    {
        $since = AiVoiceClip::inAppTimezone($since);
        $totals = AiVoiceClip::query()
            ->selectRaw('count(*) as clips, coalesce(sum(hits), 0) as plays')
            ->selectRaw('coalesce(sum(case when created_at >= ? then 1 else 0 end), 0) as new_clips', [$since])
            ->selectRaw('coalesce(sum(case when created_at >= ? then characters else 0 end), 0) as characters', [$since])
            ->first();

        $characters = (int) $totals->characters;
        $plays = (int) $totals->plays;

        return [
            'clips' => (int) $totals->new_clips,
            'characters' => $characters,
            'cost' => self::estimatedCost($characters),
            // Each clip's first play is the generation itself; every later
            // play is a cache hit.
            'hitRate' => $plays > 0 ? ($plays - (int) $totals->clips) / $plays : null,
        ];
    }
}
