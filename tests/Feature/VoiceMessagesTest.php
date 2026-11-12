<?php

namespace Tests\Feature;

use App\Events\MessageCreated;
use App\Events\MessageVoiceClipUpdated;
use App\Jobs\StoreVoiceClip;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\SiteSetting;
use App\Models\User;
use App\Notifications\MessageCommented;
use App\Notifications\UserTagged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\ExecutableFinder;
use Tests\TestCase;

class VoiceMessagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        Storage::fake('s3');

        $this->setting('messaging_enabled', '1');
        $this->setting('voice_messages_enabled', '1');
    }

    private function setting(string $key, string $value): void
    {
        SiteSetting::updateOrCreate(['key' => $key], ['value' => $value, 'type' => 'boolean']);
    }

    private function clip(string $name = 'clip.m4a'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, file_get_contents(base_path('tests/fixtures/silence.m4a')));
    }

    /** A message whose clip finished processing, its file on the fake S3. */
    private function readyVoiceMessage(array $attributes = []): Message
    {
        $path = 'voice-clips/'.str()->uuid().'.m4a';
        Storage::disk('s3')->put($path, 'audio');

        return Message::factory()->create([
            'message' => null,
            'voice_clip_path' => $path,
            'voice_clip_duration' => 3,
            'voice_clip_status' => Message::VOICE_CLIP_READY,
            ...$attributes,
        ]);
    }

    public function test_voice_messages_setting_exists(): void
    {
        $this->assertDatabaseHas('site_settings', ['key' => 'voice_messages_enabled', 'type' => 'boolean']);
    }

    public function test_a_voice_only_message_posts_and_queues_its_clip(): void
    {
        Queue::fake();
        Event::fake([MessageCreated::class]);
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('messages.store'), [
            'voice_clip' => $this->clip(),
            'voice_clip_duration' => 4.2,
        ])->assertSessionHasNoErrors();

        $message = Message::sole();
        $this->assertNull($message->message);
        $this->assertSame(Message::VOICE_CLIP_PROCESSING, $message->voice_clip_status);
        // The browser's measure, until the job probes the real one.
        $this->assertSame(5, $message->voice_clip_duration);
        $this->assertNull($message->voice_clip_url);

        Event::assertDispatched(MessageCreated::class);
        Queue::assertPushed(StoreVoiceClip::class);
        $this->assertCount(1, Storage::disk('local')->files('tmp/voice-clips'));
    }

    public function test_a_message_can_carry_both_text_and_a_clip(): void
    {
        Queue::fake();
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('messages.store'), [
            'message' => 'Listen to this',
            'voice_clip' => $this->clip(),
            'voice_clip_duration' => 2,
        ])->assertSessionHasNoErrors();

        $message = Message::sole();
        $this->assertSame('Listen to this', $message->message);
        $this->assertSame(Message::VOICE_CLIP_PROCESSING, $message->voice_clip_status);
    }

    public function test_a_message_needs_text_or_a_clip(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('messages.store'), [])
            ->assertSessionHasErrors('message');

        $this->assertDatabaseCount('messages', 0);
    }

    public function test_server_rejects_a_clip_over_the_cap(): void
    {
        Queue::fake();
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('messages.store'), [
            'voice_clip' => $this->clip(),
            'voice_clip_duration' => config('voice_messages.max_seconds') + 1,
        ])->assertSessionHasErrors('voice_clip_duration');

        $this->assertDatabaseCount('messages', 0);
        Queue::assertNothingPushed();
    }

    public function test_server_rejects_a_clip_without_its_duration(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('messages.store'), [
            'voice_clip' => $this->clip(),
        ])->assertSessionHasErrors('voice_clip_duration');
    }

    public function test_server_rejects_a_clip_of_the_wrong_type(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('messages.store'), [
            'voice_clip' => UploadedFile::fake()->createWithContent('clip.txt', 'not audio at all'),
            'voice_clip_duration' => 2,
        ])->assertSessionHasErrors('voice_clip');

        $this->assertDatabaseCount('messages', 0);
    }

    public function test_server_rejects_a_clip_that_is_too_large(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('messages.store'), [
            'voice_clip' => UploadedFile::fake()->create('clip.m4a', config('voice_messages.max_kilobytes') + 1, 'audio/mp4'),
            'voice_clip_duration' => 2,
        ])->assertSessionHasErrors('voice_clip');

        $this->assertDatabaseCount('messages', 0);
    }

    public function test_server_rejects_a_clip_while_voice_messages_are_off(): void
    {
        Queue::fake();
        $this->setting('voice_messages_enabled', '0');
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('messages.store'), [
            'voice_clip' => $this->clip(),
            'voice_clip_duration' => 2,
        ])->assertSessionHasErrors('voice_clip');

        $this->assertDatabaseCount('messages', 0);
        Queue::assertNothingPushed();
    }

    public function test_existing_clips_still_play_while_voice_messages_are_off(): void
    {
        $this->setting('voice_messages_enabled', '0');
        $message = $this->readyVoiceMessage();

        $this->actingAs(User::factory()->create())
            ->get(route('messages.index'))
            ->assertInertia(fn ($page) => $page
                ->where('messages.data.0.id', $message->id)
                ->where('messages.data.0.voice_clip_url', $message->voice_clip_url)
                ->missing('messages.data.0.voice_clip_path')
            );
    }

    public function test_the_job_transcodes_the_clip_to_s3_and_marks_it_ready(): void
    {
        if (! (new ExecutableFinder)->find(config('laravel-ffmpeg.ffmpeg.binaries', 'ffmpeg'))) {
            $this->markTestSkipped('ffmpeg is not installed.');
        }

        Event::fake([MessageVoiceClipUpdated::class]);
        $message = Message::factory()->create(['message' => null, 'voice_clip_status' => Message::VOICE_CLIP_PROCESSING]);
        Storage::disk('local')->put('tmp/voice-clips/clip.m4a', file_get_contents(base_path('tests/fixtures/silence.m4a')));

        StoreVoiceClip::dispatchSync($message->id, 'tmp/voice-clips/clip.m4a');

        $message->refresh();
        $this->assertSame(Message::VOICE_CLIP_READY, $message->voice_clip_status);
        Storage::disk('s3')->assertExists($message->getRawOriginal('voice_clip_path'));
        Storage::disk('local')->assertMissing('tmp/voice-clips/clip.m4a');
        $this->assertNotNull($message->voice_clip_url);
        Event::assertDispatched(MessageVoiceClipUpdated::class, fn ($e) => $e->message->is($message));
    }

    public function test_a_clip_that_cannot_be_transcoded_is_marked_failed(): void
    {
        config(['laravel-ffmpeg.ffmpeg.binaries' => '/nonexistent/ffmpeg']);
        Event::fake([MessageVoiceClipUpdated::class]);
        $message = Message::factory()->create(['message' => null, 'voice_clip_status' => Message::VOICE_CLIP_PROCESSING]);
        Storage::disk('local')->put('tmp/voice-clips/clip.m4a', 'audio');

        try {
            StoreVoiceClip::dispatchSync($message->id, 'tmp/voice-clips/clip.m4a');
        } catch (\Throwable) {
            // dispatchSync rethrows after calling failed().
        }

        $this->assertSame(Message::VOICE_CLIP_FAILED, $message->refresh()->voice_clip_status);
        Storage::disk('local')->assertMissing('tmp/voice-clips/clip.m4a');
        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_a_retry_after_the_clip_is_ready_leaves_it_ready(): void
    {
        $message = $this->readyVoiceMessage();

        StoreVoiceClip::dispatchSync($message->id, 'tmp/voice-clips/already-gone.m4a');

        $this->assertSame(Message::VOICE_CLIP_READY, $message->refresh()->voice_clip_status);
    }

    public function test_a_clip_whose_message_is_deleted_while_transcoding_is_removed_from_s3(): void
    {
        if (! (new ExecutableFinder)->find(config('laravel-ffmpeg.ffmpeg.binaries', 'ffmpeg'))) {
            $this->markTestSkipped('ffmpeg is not installed.');
        }

        Event::fake([MessageVoiceClipUpdated::class]);
        $message = Message::factory()->create(['message' => null, 'voice_clip_status' => Message::VOICE_CLIP_PROCESSING]);
        Storage::disk('local')->put('tmp/voice-clips/clip.m4a', file_get_contents(base_path('tests/fixtures/silence.m4a')));

        // Deleted between the job loading it and attaching the clip.
        Message::retrieved(function (Message $retrieved) use ($message) {
            if ($retrieved->is($message)) {
                Message::whereKey($message->id)->delete();
            }
        });

        StoreVoiceClip::dispatchSync($message->id, 'tmp/voice-clips/clip.m4a');

        $this->assertSame([], Storage::disk('s3')->allFiles());
        Event::assertNotDispatched(MessageVoiceClipUpdated::class);
    }

    public function test_the_job_drops_the_upload_when_its_message_was_deleted(): void
    {
        Storage::disk('local')->put('tmp/voice-clips/clip.m4a', 'audio');

        StoreVoiceClip::dispatchSync(999, 'tmp/voice-clips/clip.m4a');

        Storage::disk('local')->assertMissing('tmp/voice-clips/clip.m4a');
        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_deleting_a_message_removes_its_clip(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');
        $message = $this->readyVoiceMessage();
        $path = $message->getRawOriginal('voice_clip_path');

        $this->actingAs($admin)->delete(route('messages.destroy', $message))->assertRedirect();

        $this->assertModelMissing($message);
        Storage::disk('s3')->assertMissing($path);
    }

    public function test_cleanup_removes_old_messages_clips_and_keeps_recent_ones(): void
    {
        $old = $this->readyVoiceMessage(['created_at' => now()->subDays(40)]);
        $recent = $this->readyVoiceMessage();
        $oldPath = $old->getRawOriginal('voice_clip_path');
        $recentPath = $recent->getRawOriginal('voice_clip_path');

        $this->artisan('messages:cleanup')->assertSuccessful();

        $this->assertModelMissing($old);
        Storage::disk('s3')->assertMissing($oldPath);
        Storage::disk('s3')->assertExists($recentPath);
    }

    public function test_voice_only_tag_and_comment_notifications_say_a_voice_message_was_sent(): void
    {
        $sender = User::factory()->create(['name' => 'Gus']);
        $recipient = User::factory()->create();
        $message = $this->readyVoiceMessage(['user_id' => $sender->id]);
        $expected = __('messages.voice.sent', ['name' => 'Gus']);

        $this->assertSame($expected, $message->previewText());

        $tagged = new UserTagged($message, $sender, 'message');
        $this->assertSame($expected, $tagged->toArray($recipient)['message']);
        $this->assertSame($expected, $tagged->toBroadcast($recipient)->data['body']);

        $comment = MessageComment::factory()->create(['message_id' => $message->id, 'user_id' => $recipient->id]);
        $commented = new MessageCommented($message, $comment, $recipient);
        $this->assertSame($expected, $commented->toArray($sender)['message']);
    }

    public function test_the_voice_sent_wording_is_translated(): void
    {
        $sender = User::factory()->create(['name' => 'Gus']);
        $message = $this->readyVoiceMessage(['user_id' => $sender->id]);

        app()->setLocale('es');
        $this->assertSame('Gus envió un mensaje de voz', $message->previewText());

        app()->setLocale('fr');
        $this->assertSame('Gus a envoyé un message vocal', $message->previewText());
    }
}
