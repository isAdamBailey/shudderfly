<?php

namespace Tests\Feature;

use App\Jobs\GenerateAiVoiceClip;
use App\Models\AiVoiceClip;
use App\Models\Book;
use App\Models\Page;
use App\Models\SiteSetting;
use App\Models\User;
use App\Services\AiVoiceService;
use App\Support\AiVoice;
use App\Support\SpokenText;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AiVoiceWarmingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake();
        SiteSetting::where('key', AiVoice::SETTING_KEY)->update(['value' => '1']);
    }

    /**
     * @return Collection<int, GenerateAiVoiceClip>
     */
    private function jobsFor(string $text): Collection
    {
        return Queue::pushed(GenerateAiVoiceClip::class)->filter(fn ($job) => $job->text === $text)->values();
    }

    public function test_a_new_page_warms_its_plain_text_in_every_spoken_locale(): void
    {
        User::factory()->create(['locale' => 'es']);

        Page::factory()->create(['content' => '<p>We went to the <b>zoo</b>!</p>']);

        $this->assertEqualsCanonicalizing(['en', 'es'], $this->jobsFor('We went to the zoo!')->pluck('locale')->all());
        $this->assertTrue($this->jobsFor('We went to the zoo!')->every(fn ($job) => $job->voice === null));
    }

    public function test_a_new_book_warms_its_title_and_excerpt(): void
    {
        Book::factory()->create(['title' => 'Bluey', 'excerpt' => '<i>A dog</i> story']);

        $this->assertCount(1, $this->jobsFor('Bluey'));
        $this->assertCount(1, $this->jobsFor('A dog story'));
    }

    public function test_nothing_is_warmed_while_the_ai_voice_is_off(): void
    {
        SiteSetting::where('key', AiVoice::SETTING_KEY)->update(['value' => '0']);

        Page::factory()->create();

        Queue::assertNotPushed(GenerateAiVoiceClip::class);
    }

    public function test_an_edit_warms_only_when_the_spoken_text_changes(): void
    {
        $page = Page::factory()->create(['content' => '<p>Hello there</p>']);
        Queue::fake();

        $page->update(['content' => '<div>Hello   there</div>', 'read_count' => 5]);
        Queue::assertNotPushed(GenerateAiVoiceClip::class);

        $page->update(['content' => '<p>Hello again</p>']);
        $this->assertCount(1, $this->jobsFor('Hello again'));
    }

    public function test_a_book_edit_warms_only_the_attribute_that_changed(): void
    {
        $book = Book::factory()->create(['title' => 'Bluey', 'excerpt' => 'A dog']);
        Queue::fake();

        $book->update(['excerpt' => 'A blue dog']);

        $this->assertSame(['A blue dog'], Queue::pushed(GenerateAiVoiceClip::class)->pluck('text')->all());
    }

    public function test_a_page_with_no_text_warms_nothing(): void
    {
        Page::factory()->create(['content' => '<p> </p>']);

        $this->assertSame(
            [Book::sole()->title, Book::sole()->excerpt],
            Queue::pushed(GenerateAiVoiceClip::class)->pluck('text')->all(),
        );
    }

    public function test_text_too_long_for_one_clip_is_not_warmed(): void
    {
        Page::factory()->create(['content' => str_repeat('a', AiVoiceService::MAX_CHARACTERS + 1)]);

        $this->assertCount(2, Queue::pushed(GenerateAiVoiceClip::class));
    }

    public function test_the_job_skips_text_too_long_for_one_clip(): void
    {
        Http::fake();

        (new GenerateAiVoiceClip(str_repeat('a', AiVoiceService::MAX_CHARACTERS + 1), 'en'))
            ->handle(app(AiVoiceService::class));

        Http::assertNothingSent();
        $this->assertSame(0, AiVoiceClip::count());
    }

    public function test_spoken_text_strips_tags_like_the_browser(): void
    {
        $this->assertSame('Big &amp; little trucks', SpokenText::fromHtml('<p>Big &amp; <b>little</b> trucks</p>'));
        $this->assertSame('cut', SpokenText::fromHtml('cut<span class="x"'));
        $this->assertSame('', SpokenText::fromHtml(null));
    }

    public function test_a_page_saved_inside_a_transaction_is_warmed_after_commit(): void
    {
        $book = Book::factory()->createQuietly(['slug' => 'quiet']);

        DB::transaction(function () use ($book) {
            $page = $book->pages()->create(['content' => '<p>Video night</p>']);
            $page->update(['media_path' => 'videos/night.mp4']);
        });

        // The fake queue pushes at once; a real one holds the job until commit.
        $this->assertCount(1, $this->jobsFor('Video night'));
        $this->assertTrue($this->jobsFor('Video night')->sole()->afterCommit);
    }

    public function test_a_blank_editor_page_warms_nothing(): void
    {
        Book::factory()->createQuietly(['slug' => 'quiet'])->pages()->create(['content' => '<p>&nbsp;</p>']);

        Queue::assertNotPushed(GenerateAiVoiceClip::class);
    }

    public function test_a_prefetch_of_a_cached_clip_keeps_it_without_counting_a_play(): void
    {
        Http::fake();
        $this->actingAs(User::factory()->create());
        $clip = AiVoiceClip::factory()->create([
            'hash' => AiVoiceService::hashFor('Bluey', 'af_heart'),
            'hits' => 2,
            'last_played_at' => now()->subDays(60),
        ]);

        $this->postJson(route('ai-voice.prefetch'), ['text' => 'Bluey', 'locale' => 'en'])
            ->assertOk()
            ->assertJson(['url' => $clip->url]);
        $this->assertSame(2, $clip->fresh()->hits);
        $this->assertTrue($clip->fresh()->last_played_at->isToday());

        $this->postJson(route('ai-voice.speak'), ['text' => 'Bluey', 'locale' => 'en'])->assertOk();
        $this->assertSame(3, $clip->fresh()->hits);
    }

    public function test_clips_made_ahead_of_time_leave_a_share_of_the_budget_for_live_plays(): void
    {
        Http::fake(['ai-voice.test/*' => Http::response('ID3-fake', 200, ['Content-Type' => 'audio/mpeg'])]);
        Storage::fake('s3');
        $this->actingAs(User::factory()->create());
        // 75% of 20 is 15: a 10-character prefetch fits once, not twice.
        SiteSetting::updateOrCreate(['key' => AiVoice::LIMIT_SETTING_KEY], ['value' => '20', 'type' => 'text']);

        $this->postJson(route('ai-voice.prefetch'), ['text' => 'Ten chars!', 'locale' => 'en'])->assertOk();
        $this->postJson(route('ai-voice.prefetch'), ['text' => 'Ten more!!', 'locale' => 'en'])->assertStatus(429);
        $this->postJson(route('ai-voice.speak'), ['text' => 'Ten more!!', 'locale' => 'en'])->assertOk();
    }
}
