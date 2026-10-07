<?php

namespace App\Console\Commands;

use App\Exceptions\AiVoiceUnavailable;
use App\Http\Controllers\GameController;
use App\Http\Middleware\SetLocale;
use App\Jobs\GenerateAiVoiceClip;
use App\Models\AiVoiceClip;
use App\Models\Book;
use App\Models\SiteSetting;
use App\Models\Song;
use App\Services\AiVoiceService;
use App\Support\AiVoice;
use App\Support\SpokenText;
use App\Support\SpokenTranslationKeys;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Traits\Localizable;

class PrewarmAiVoiceClips extends Command
{
    use Localizable;

    public const SOURCES = ['ui', 'games', 'books', 'songs'];

    protected $signature = 'ai-voice:prewarm
        {--locale=* : Locales to warm (default: en plus every locale a user has picked)}
        {--voice= : Voice to warm in (default: each locale\'s default voice)}
        {--source=* : ui, games, books and/or songs (default: all)}
        {--dry-run : Report how many clips would be made and their cost, without making them}
        {--sync : Make the clips now instead of queueing them}';

    protected $description = 'Generate AI voice clips for common phrases before anyone plays them';

    /** @var array<string, mixed> locale-independent source data, loaded once */
    private array $loaded = [];

    public function handle(): int
    {
        $this->loaded = [];
        $sources = $this->option('source') ?: self::SOURCES;
        $locales = $this->option('locale') ?: AiVoice::spokenLocales();

        if ($this->rejectUnknown('source', $sources, self::SOURCES)
            || $this->rejectUnknown('locale', $locales, SetLocale::SUPPORTED_LOCALES)) {
            return Command::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        if (! $dryRun && ! AiVoice::enabled()) {
            $this->error('The AI voice is off (ai_voice_enabled, or AI_VOICE_API_KEY unset), so no clips are made. --dry-run still reports.');

            return Command::FAILURE;
        }

        [$clips, $deferred] = $this->withinBudget($this->uncached($this->clips($sources, $locales)));
        $characters = array_sum(array_column($clips, 'characters'));

        $counts = array_count_values(array_column($clips, 'source'));
        foreach ($sources as $source) {
            $this->line("  {$source}: ".($counts[$source] ?? 0).' clip(s)');
        }

        if ($deferred > 0) {
            $this->warn("{$deferred} more clip(s) would go past today's budget; run again tomorrow to make them.");
        }

        $summary = count($clips).' clip(s) in '.implode(', ', $locales).', '.number_format($characters)
            .' character(s), about $'.number_format(AiVoice::estimatedCost($characters), 4);

        if ($dryRun) {
            $this->info("Would generate {$summary}.");

            return Command::SUCCESS;
        }

        if (! $this->option('sync')) {
            foreach ($clips as $clip) {
                dispatch(new GenerateAiVoiceClip($clip['text'], $clip['locale'], $clip['voice']));
            }

            $this->info("Queued {$summary}.");

            return Command::SUCCESS;
        }

        $failed = 0;
        foreach ($clips as $clip) {
            try {
                dispatch_sync(new GenerateAiVoiceClip($clip['text'], $clip['locale'], $clip['voice']));
            } catch (AiVoiceUnavailable) {
                // Already logged by the service; one bad clip shouldn't end the run.
                $failed++;
            }
        }

        $this->info("Generated {$summary}.");

        if ($failed > 0) {
            $this->warn("{$failed} clip(s) failed; they will be made on first play, or on the next prewarm.");
        }

        return $failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    /**
     * The clips, in source order, that fit in what prewarming may spend of
     * today's budget, and how many were left over.
     *
     * @param  list<array{source: string, text: string, locale: string, voice: string, characters: int}>  $clips
     * @return array{0: list<array{source: string, text: string, locale: string, voice: string, characters: int}>, 1: int}
     */
    private function withinBudget(array $clips): array
    {
        $allowance = AiVoice::aheadOfTimeCharacterLimit() - AiVoiceService::charactersUsedToday();
        $kept = [];

        foreach ($clips as $clip) {
            if ($clip['characters'] > $allowance) {
                break;
            }

            $allowance -= $clip['characters'];
            $kept[] = $clip;
        }

        return [$kept, count($clips) - count($kept)];
    }

    /**
     * @param  list<string>  $given
     * @param  list<string>  $allowed
     */
    private function rejectUnknown(string $option, array $given, array $allowed): bool
    {
        if ($unknown = array_diff($given, $allowed)) {
            $this->error("Unknown --{$option}: ".implode(', ', $unknown).'. Use '.implode(', ', $allowed).'.');
        }

        return (bool) $unknown;
    }

    /**
     * Every clip the sources ask for, once each.
     *
     * @param  list<string>  $sources
     * @param  list<string>  $locales
     * @return array<string, array{source: string, text: string, locale: string, voice: string, characters: int}> keyed by clip hash
     */
    private function clips(array $sources, array $locales): array
    {
        $clips = [];
        $tooLong = 0;

        foreach ($locales as $locale) {
            foreach ($sources as $source) {
                foreach ($this->phrases($source, $locale) as [$text, $voice]) {
                    $key = AiVoiceService::keyFor($text, $locale, $voice ?? $this->option('voice'), GenerateAiVoiceClip::SPEED);

                    if ($key === null) {
                        // Blank text is nothing to say; anything else was too long.
                        $tooLong += AiVoiceService::normalize($text) === '' ? 0 : 1;

                        continue;
                    }

                    $clips[$key['hash']] ??= [
                        'source' => $source,
                        'text' => $key['text'],
                        'locale' => $locale,
                        'voice' => $key['voice'],
                        'characters' => mb_strlen($key['text']),
                    ];
                }
            }
        }

        if ($tooLong > 0) {
            $this->warn("Skipped {$tooLong} phrase(s) longer than ".AiVoiceService::MAX_CHARACTERS.' characters.');
        }

        return $clips;
    }

    /**
     * @param  array<string, array{source: string, text: string, locale: string, voice: string, characters: int}>  $clips
     * @return list<array{source: string, text: string, locale: string, voice: string, characters: int}>
     */
    private function uncached(array $clips): array
    {
        $cached = [];
        foreach (array_chunk(array_keys($clips), 500) as $hashes) {
            array_push($cached, ...AiVoiceClip::whereIn('hash', $hashes)->pluck('hash')->all());
        }

        $this->line(count($cached).' clip(s) already cached.');

        return array_values(array_diff_key($clips, array_flip($cached)));
    }

    /**
     * The texts $source speaks in $locale, each with the voice it must be
     * made in, or null for the --voice option or the locale's default.
     *
     * @return iterable<array{0: string, 1: ?string}>
     */
    private function phrases(string $source, string $locale): iterable
    {
        return match ($source) {
            'ui' => $this->uiPhrases($locale),
            'games' => $this->gamePhrases($locale),
            'books' => $this->loaded['books'] ??= Book::distinct()->pluck('title')
                ->map(fn ($title) => [SpokenText::fromHtml($title), null])
                ->all(),
            'songs' => $this->songPhrases($locale),
        };
    }

    /**
     * @return iterable<array{0: string, 1: ?string}>
     */
    private function uiPhrases(string $locale): iterable
    {
        $keys = $this->loaded['ui'] ??= $this->spokenKeys();

        foreach ($keys as $key) {
            if (! Lang::has("messages.{$key}", $locale, false)) {
                continue;
            }

            $text = __("messages.{$key}", [], $locale);

            if (self::hasPlaceholder($text)) {
                continue;
            }

            yield [$text, null];

            // The voice picker previews this line in every voice it offers,
            // so make all of them unless one voice was asked for.
            if ($key === 'speech.voice_sample' && ! $this->option('voice')) {
                foreach (config("services.ai_voice.voices.{$locale}", []) as $voice) {
                    yield [$text, $voice];
                }
            }
        }
    }

    /**
     * @return list<string>
     */
    private function spokenKeys(): array
    {
        $directory = resource_path('js');

        if (! is_dir($directory)) {
            $this->warn("Skipping the ui source: {$directory} is not on this server.");

            return [];
        }

        return SpokenTranslationKeys::scan($directory);
    }

    /**
     * A translation whose words are filled in at runtime, so its clip can't
     * be made ahead of time.
     */
    private static function hasPlaceholder(string $text): bool
    {
        return (bool) preg_match('/:[A-Za-z]\w*/', $text);
    }

    /**
     * The game card's "name. description" (GameConfirmCard.vue) and every
     * game's start-button intro script.
     *
     * @return iterable<array{0: string, 1: ?string}>
     */
    private function gamePhrases(string $locale): iterable
    {
        foreach ($this->withLocale($locale, fn () => GameController::games()) as $game) {
            $text = "{$game['name']}. {$game['description']}";

            if (! self::hasPlaceholder($text)) {
                yield [$text, null];
            }
        }

        foreach (trans('messages', [], $locale) as $key => $text) {
            if (preg_match('/^games\.[\w-]+\.intro_script$/', $key) && ! self::hasPlaceholder($text)) {
                yield [$text, null];
            }
        }
    }

    /**
     * "You are playing <title>", as useMusicPlayer announces each song.
     *
     * @return iterable<array{0: string, 1: ?string}>
     */
    private function songPhrases(string $locale): iterable
    {
        $titles = $this->loaded['songs'] ??= SiteSetting::where('key', 'music_enabled')->first()?->value
            ? Song::distinct()->pluck('title')->all()
            : [];

        foreach ($titles as $title) {
            yield [__('messages.music.now_playing', ['title' => $title], $locale), null];
        }
    }
}
