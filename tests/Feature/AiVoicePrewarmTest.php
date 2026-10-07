<?php

namespace Tests\Feature;

use App\Jobs\GenerateAiVoiceClip;
use App\Models\AiVoiceClip;
use App\Models\Book;
use App\Models\SiteSetting;
use App\Models\Song;
use App\Models\User;
use App\Services\AiVoiceService;
use App\Support\AiVoice;
use App\Support\SpokenTranslationKeys;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class AiVoicePrewarmTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('s3');
        SiteSetting::where('key', AiVoice::SETTING_KEY)->update(['value' => '1']);
    }

    /**
     * A book whose title the warming observer leaves alone, so only the
     * command under test queues it. Quiet saves skip the slug generator too.
     */
    private function book(string $title): Book
    {
        return Book::factory()->createQuietly(['title' => $title, 'slug' => Str::slug($title).'-'.Str::random(6)]);
    }

    private function limitDailyCharacters(int $limit): void
    {
        SiteSetting::updateOrCreate(['key' => AiVoice::LIMIT_SETTING_KEY], ['value' => (string) $limit, 'type' => 'text']);
    }

    /**
     * @return Collection<int, GenerateAiVoiceClip>
     */
    private function queuedJobs()
    {
        return Queue::pushed(GenerateAiVoiceClip::class);
    }

    public function test_dry_run_reports_counts_and_dispatches_nothing(): void
    {
        Queue::fake();
        $this->book('Bluey');

        $this->artisan('ai-voice:prewarm', ['--source' => ['books'], '--dry-run' => true])
            ->expectsOutputToContain('books: 1 clip(s)')
            ->expectsOutputToContain('Would generate 1 clip(s) in en, 5 character(s)')
            ->assertSuccessful();

        Queue::assertNothingPushed();
    }

    public function test_the_scan_finds_keys_spoken_directly_through_options_and_through_variables(): void
    {
        $source = <<<'JS'
            speak(t("speech.emotion_reset"));
            speakPhrase(
                t('world_clock.timer_done'), { onEnd });
            const options = [{ label: "Roman", speech: t("world_clock.numerals_roman") }];
            const notFound = computed(() => t("search.not_found_books"));
            speak(notFound.value);
            const confirmMessage = t("page.block_confirm_dialog");
            speak(confirmMessage, () => {});
            const shownOnly = t("general.book");
            JS;

        $this->assertEqualsCanonicalizing([
            'speech.emotion_reset',
            'world_clock.timer_done',
            'world_clock.numerals_roman',
            'search.not_found_books',
            'page.block_confirm_dialog',
        ], SpokenTranslationKeys::keysIn($source));

        $this->assertContains('speech.emotion_reset', SpokenTranslationKeys::scan(resource_path('js')));
    }

    public function test_ui_phrases_are_queued_in_the_locale_default_voice_and_placeholders_are_skipped(): void
    {
        Queue::fake();
        $this->artisan('ai-voice:prewarm', ['--source' => ['ui'], '--locale' => ['es']])->assertSuccessful();

        $jobs = $this->queuedJobs();
        $reset = $jobs->firstWhere('text', __('messages.speech.emotion_reset', [], 'es'));

        $this->assertNotNull($reset);
        $this->assertSame('es', $reset->locale);
        $this->assertSame('ef_dora', $reset->voice);
        $this->assertTrue($jobs->every(fn ($job) => ! preg_match('/:[A-Za-z]/', $job->text)));
    }

    public function test_the_voice_sample_is_queued_in_every_voice_the_picker_offers(): void
    {
        Queue::fake();
        $this->artisan('ai-voice:prewarm', ['--source' => ['ui'], '--locale' => ['es']])->assertSuccessful();

        $sample = __('messages.speech.voice_sample', [], 'es');

        $this->assertEqualsCanonicalizing(
            config('services.ai_voice.voices.es'),
            $this->queuedJobs()->where('text', $sample)->pluck('voice')->all(),
        );
    }

    public function test_the_voice_option_is_used_and_falls_back_where_the_locale_lacks_it(): void
    {
        Queue::fake();
        $this->book('Bluey');

        $this->artisan('ai-voice:prewarm', ['--source' => ['books'], '--locale' => ['en', 'fr'], '--voice' => 'am_puck'])
            ->assertSuccessful();

        $this->assertEqualsCanonicalizing(
            ['en:am_puck', 'fr:ff_siwis'],
            $this->queuedJobs()->map(fn ($job) => "{$job->locale}:{$job->voice}")->all(),
        );
    }

    public function test_game_cards_and_intro_scripts_are_queued(): void
    {
        Queue::fake();
        $this->artisan('ai-voice:prewarm', ['--source' => ['games']])->assertSuccessful();

        $texts = $this->queuedJobs()->pluck('text');

        $this->assertContains(
            AiVoiceService::normalize(__('messages.games.boom.name').'. '.__('messages.games.boom.description')),
            $texts,
        );
        $this->assertContains(AiVoiceService::normalize(__('messages.games.cockroach.intro_script')), $texts);
    }

    public function test_book_titles_have_their_tags_stripped(): void
    {
        Queue::fake();
        $this->book('<b>Big</b>  Trucks');

        $this->artisan('ai-voice:prewarm', ['--source' => ['books']])->assertSuccessful();

        $this->assertSame(['Big Trucks'], $this->queuedJobs()->pluck('text')->all());
    }

    public function test_songs_are_announced_only_while_music_is_enabled(): void
    {
        Queue::fake();
        Song::factory()->create(['title' => 'Baby Shark']);
        SiteSetting::updateOrCreate(['key' => 'music_enabled'], ['value' => '0', 'type' => 'boolean']);

        $this->artisan('ai-voice:prewarm', ['--source' => ['songs']])->assertSuccessful();
        Queue::assertNothingPushed();

        SiteSetting::where('key', 'music_enabled')->update(['value' => '1']);

        $this->artisan('ai-voice:prewarm', ['--source' => ['songs']])->assertSuccessful();
        $this->assertSame(
            [__('messages.music.now_playing', ['title' => 'Baby Shark'])],
            $this->queuedJobs()->pluck('text')->all(),
        );
    }

    public function test_default_locales_are_english_plus_those_users_chose(): void
    {
        Queue::fake();
        $this->book('Bluey');
        User::factory()->create(['locale' => 'fr']);

        $this->artisan('ai-voice:prewarm', ['--source' => ['books']])->assertSuccessful();

        $this->assertEqualsCanonicalizing(['en', 'fr'], $this->queuedJobs()->pluck('locale')->all());
    }

    public function test_cached_clips_and_duplicates_are_skipped(): void
    {
        Queue::fake();
        $this->book('Bluey');
        $this->book('Bluey');
        $this->book('Bingo');
        AiVoiceClip::factory()->create(['hash' => AiVoiceService::hashFor('Bingo', 'af_heart', 1.0)]);

        $this->artisan('ai-voice:prewarm', ['--source' => ['books']])
            ->expectsOutputToContain('1 clip(s) already cached.')
            ->assertSuccessful();

        $this->assertSame(['Bluey'], $this->queuedJobs()->pluck('text')->all());
    }

    public function test_unknown_sources_and_locales_fail(): void
    {
        Queue::fake();
        $this->artisan('ai-voice:prewarm', ['--source' => ['nope']])->assertFailed();
        $this->artisan('ai-voice:prewarm', ['--locale' => ['de']])->assertFailed();
        Queue::assertNothingPushed();
    }

    public function test_generating_while_the_ai_voice_is_off_fails_but_a_dry_run_still_reports(): void
    {
        Queue::fake();
        SiteSetting::where('key', AiVoice::SETTING_KEY)->update(['value' => '0']);

        $this->artisan('ai-voice:prewarm', ['--source' => ['games']])->assertFailed();
        $this->artisan('ai-voice:prewarm', ['--source' => ['games'], '--dry-run' => true])->assertSuccessful();

        SiteSetting::where('key', AiVoice::SETTING_KEY)->update(['value' => '1']);
        config(['services.ai_voice.api_key' => '']);

        $this->artisan('ai-voice:prewarm', ['--source' => ['games']])->assertFailed();
        Queue::assertNothingPushed();
    }

    public function test_prewarming_leaves_a_quarter_of_todays_budget_for_live_plays(): void
    {
        Queue::fake();
        // 75% of 40 is 30; 10 are already spent today, so 20 are left to warm.
        $this->limitDailyCharacters(40);
        AiVoiceClip::factory()->create(['characters' => 10]);
        $this->book('Bluey and Bingo');   // 15
        $this->book('Tractors');          // 8

        $this->artisan('ai-voice:prewarm', ['--source' => ['books']])
            ->expectsOutputToContain("1 more clip(s) would go past today's budget")
            ->assertSuccessful();

        $this->assertCount(1, Queue::pushed(GenerateAiVoiceClip::class));
    }

    public function test_sync_keeps_going_after_a_clip_fails(): void
    {
        Http::fakeSequence('ai-voice.test/*')
            ->push(['error' => 'boom'], 500)
            ->push(['error' => 'boom'], 500)
            ->push('ID3-fake', 200, ['Content-Type' => 'audio/mpeg']);
        $this->book('Bingo');
        $this->book('Bluey');

        $this->artisan('ai-voice:prewarm', ['--source' => ['books'], '--sync' => true])
            ->expectsOutputToContain('1 clip(s) failed')
            ->assertFailed();

        $this->assertSame(1, AiVoiceClip::count());
    }

    public function test_sync_generates_the_clips_now(): void
    {
        Http::fake(['ai-voice.test/*' => Http::response('ID3-fake', 200, ['Content-Type' => 'audio/mpeg'])]);
        $this->book('Bluey');

        $this->artisan('ai-voice:prewarm', ['--source' => ['books'], '--sync' => true])
            ->expectsOutputToContain('Generated 1 clip(s)')
            ->assertSuccessful();

        $clip = AiVoiceClip::sole();
        $this->assertSame(AiVoiceService::hashFor('Bluey', 'af_heart', 1.0), $clip->hash);
        Storage::disk('s3')->assertExists($clip->path);
    }

    public function test_the_job_skips_a_clip_made_since_it_was_queued(): void
    {
        Http::fake();
        $clip = AiVoiceClip::factory()->create(['hash' => AiVoiceService::hashFor('Bluey', 'af_heart', 1.0), 'hits' => 3]);

        (new GenerateAiVoiceClip('Bluey', 'en'))->handle(app(AiVoiceService::class));

        Http::assertNothingSent();
        $this->assertSame(3, $clip->fresh()->hits);
    }

    public function test_the_job_swallows_a_spent_budget(): void
    {
        Http::fake();
        $this->limitDailyCharacters(1);

        (new GenerateAiVoiceClip('Bluey', 'en'))->handle(app(AiVoiceService::class));

        Http::assertNothingSent();
        $this->assertSame(0, AiVoiceClip::count());
    }

    public function test_prewarm_is_scheduled_daily_only_while_the_ai_voice_is_on(): void
    {
        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => str_contains($event->command, 'ai-voice:prewarm'));

        $this->assertNotNull($event);
        $this->assertSame('0 14 * * *', $event->expression);
        $this->assertTrue($event->filtersPass($this->app));

        SiteSetting::where('key', AiVoice::SETTING_KEY)->update(['value' => '0']);

        $this->assertFalse($event->filtersPass($this->app));
    }
}
