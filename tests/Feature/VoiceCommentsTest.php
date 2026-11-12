<?php

namespace Tests\Feature;

use App\Events\CommentCreated;
use App\Events\CommentVoiceClipUpdated;
use App\Jobs\StoreVoiceClip;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\SiteSetting;
use App\Models\User;
use App\Notifications\MessageCommented;
use App\Notifications\MessageReacted;
use App\Notifications\UserTagged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\ExecutableFinder;
use Tests\TestCase;

/** Voice clips on message comments (phase 2 of voice messages, #223). */
class VoiceCommentsTest extends TestCase
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

    private function clip(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('clip.m4a', file_get_contents(base_path('tests/fixtures/silence.m4a')));
    }

    /** A comment whose clip finished processing, its file on the fake S3. */
    private function readyVoiceComment(array $attributes = []): MessageComment
    {
        $path = 'voice-clips/'.str()->uuid().'.m4a';
        Storage::disk('s3')->put($path, 'audio');

        return MessageComment::factory()->create([
            'comment' => null,
            'voice_clip_path' => $path,
            'voice_clip_duration' => 3,
            'voice_clip_status' => Message::VOICE_CLIP_READY,
            ...$attributes,
        ]);
    }

    public function test_a_voice_only_comment_posts_and_queues_its_clip(): void
    {
        Queue::fake();
        Event::fake([CommentCreated::class]);
        $message = Message::factory()->create();

        $this->actingAs(User::factory()->create())
            ->post(route('messages.comments.store', $message), [
                'voice_clip' => $this->clip(),
                'voice_clip_duration' => 4.2,
            ])->assertSessionHasNoErrors();

        $comment = MessageComment::sole();
        $this->assertNull($comment->comment);
        $this->assertSame(Message::VOICE_CLIP_PROCESSING, $comment->voice_clip_status);
        $this->assertSame(5, $comment->voice_clip_duration);
        $this->assertNull($comment->voice_clip_url);

        Event::assertDispatched(CommentCreated::class, fn ($e) => $e->broadcastWith()['voice_clip_status'] === Message::VOICE_CLIP_PROCESSING);
        Queue::assertPushed(StoreVoiceClip::class);
        $this->assertCount(1, Storage::disk('local')->files('tmp/voice-clips'));
    }

    public function test_a_comment_can_carry_both_text_and_a_clip(): void
    {
        Queue::fake();
        $message = Message::factory()->create();

        $this->actingAs(User::factory()->create())
            ->post(route('messages.comments.store', $message), [
                'comment' => 'Listen to this',
                'voice_clip' => $this->clip(),
                'voice_clip_duration' => 2,
            ])->assertSessionHasNoErrors();

        $comment = MessageComment::sole();
        $this->assertSame('Listen to this', $comment->comment);
        $this->assertSame(Message::VOICE_CLIP_PROCESSING, $comment->voice_clip_status);
    }

    public function test_a_comment_needs_text_or_a_clip(): void
    {
        $message = Message::factory()->create();

        $this->actingAs(User::factory()->create())
            ->post(route('messages.comments.store', $message), [])
            ->assertSessionHasErrors('comment');

        $this->assertDatabaseCount('message_comments', 0);
    }

    public function test_server_rejects_a_comment_clip_over_the_cap(): void
    {
        Queue::fake();
        $message = Message::factory()->create();

        $this->actingAs(User::factory()->create())
            ->post(route('messages.comments.store', $message), [
                'voice_clip' => $this->clip(),
                'voice_clip_duration' => config('voice_messages.max_seconds') + 1,
            ])->assertSessionHasErrors('voice_clip_duration');

        $this->assertDatabaseCount('message_comments', 0);
        Queue::assertNothingPushed();
    }

    public function test_server_rejects_a_comment_clip_while_voice_messages_are_off(): void
    {
        Queue::fake();
        $this->setting('voice_messages_enabled', '0');
        $message = Message::factory()->create();

        $this->actingAs(User::factory()->create())
            ->post(route('messages.comments.store', $message), [
                'voice_clip' => $this->clip(),
                'voice_clip_duration' => 2,
            ])->assertSessionHasErrors('voice_clip');

        $this->assertDatabaseCount('message_comments', 0);
        Queue::assertNothingPushed();
    }

    public function test_the_job_transcodes_a_comment_clip_and_broadcasts_it_ready(): void
    {
        if (! (new ExecutableFinder)->find(config('laravel-ffmpeg.ffmpeg.binaries', 'ffmpeg'))) {
            $this->markTestSkipped('ffmpeg is not installed.');
        }

        Event::fake([CommentVoiceClipUpdated::class]);
        $comment = MessageComment::factory()->create(['comment' => null, 'voice_clip_status' => Message::VOICE_CLIP_PROCESSING]);
        Storage::disk('local')->put('tmp/voice-clips/clip.m4a', file_get_contents(base_path('tests/fixtures/silence.m4a')));

        StoreVoiceClip::dispatchSync($comment, 'tmp/voice-clips/clip.m4a');

        $comment->refresh();
        $this->assertSame(Message::VOICE_CLIP_READY, $comment->voice_clip_status);
        Storage::disk('s3')->assertExists($comment->getRawOriginal('voice_clip_path'));
        Storage::disk('local')->assertMissing('tmp/voice-clips/clip.m4a');
        Event::assertDispatched(CommentVoiceClipUpdated::class, function ($e) use ($comment) {
            $payload = $e->broadcastWith();

            return $payload['comment_id'] === $comment->id
                && $payload['message_id'] === $comment->message_id
                && $payload['voice_clip_url'] === $comment->voice_clip_url;
        });
    }

    public function test_a_comment_clip_that_cannot_be_transcoded_is_marked_failed(): void
    {
        config(['laravel-ffmpeg.ffmpeg.binaries' => '/nonexistent/ffmpeg']);
        Event::fake([CommentVoiceClipUpdated::class]);
        $comment = MessageComment::factory()->create(['comment' => null, 'voice_clip_status' => Message::VOICE_CLIP_PROCESSING]);
        Storage::disk('local')->put('tmp/voice-clips/clip.m4a', 'audio');

        try {
            StoreVoiceClip::dispatchSync($comment, 'tmp/voice-clips/clip.m4a');
        } catch (\Throwable) {
            // dispatchSync rethrows after calling failed().
        }

        $this->assertSame(Message::VOICE_CLIP_FAILED, $comment->refresh()->voice_clip_status);
        Event::assertDispatched(CommentVoiceClipUpdated::class);
        $this->assertSame([], Storage::disk('s3')->allFiles());
    }

    public function test_comment_clips_play_on_the_timeline_without_their_path(): void
    {
        $comment = $this->readyVoiceComment();

        $this->actingAs(User::factory()->create())
            ->get(route('messages.index'))
            ->assertInertia(fn ($page) => $page
                ->where('messages.data.0.comments.0.id', $comment->id)
                ->where('messages.data.0.comments.0.voice_clip_url', $comment->voice_clip_url)
                ->where('messages.data.0.comments.0.voice_clip_status', Message::VOICE_CLIP_READY)
                ->missing('messages.data.0.comments.0.voice_clip_path')
            );
    }

    public function test_deleting_a_comment_removes_its_clip(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');
        $comment = $this->readyVoiceComment();
        $path = $comment->getRawOriginal('voice_clip_path');

        $this->actingAs($admin)
            ->delete(route('messages.comments.destroy', [$comment->message_id, $comment]))
            ->assertRedirect();

        $this->assertModelMissing($comment);
        Storage::disk('s3')->assertMissing($path);
    }

    public function test_deleting_a_message_removes_its_comments_clips(): void
    {
        $admin = User::factory()->create();
        $admin->givePermissionTo('admin');
        $comment = $this->readyVoiceComment();
        $path = $comment->getRawOriginal('voice_clip_path');

        $this->actingAs($admin)
            ->delete(route('messages.destroy', $comment->message_id))
            ->assertRedirect();

        $this->assertModelMissing($comment);
        Storage::disk('s3')->assertMissing($path);
    }

    public function test_cleanup_removes_old_messages_comment_clips_and_keeps_recent_ones(): void
    {
        $old = $this->readyVoiceComment(['message_id' => Message::factory()->create(['created_at' => now()->subDays(40)])->id]);
        $recent = $this->readyVoiceComment();
        $oldPath = $old->getRawOriginal('voice_clip_path');
        $recentPath = $recent->getRawOriginal('voice_clip_path');

        $this->artisan('messages:cleanup')->assertSuccessful();

        $this->assertModelMissing($old);
        Storage::disk('s3')->assertMissing($oldPath);
        Storage::disk('s3')->assertExists($recentPath);
    }

    public function test_voice_only_comment_notifications_say_a_voice_comment_was_sent(): void
    {
        $commenter = User::factory()->create(['name' => 'Gus']);
        $author = User::factory()->create();
        $message = Message::factory()->create(['user_id' => $author->id]);
        $comment = $this->readyVoiceComment(['message_id' => $message->id, 'user_id' => $commenter->id]);
        $expected = 'Gus sent a voice comment';

        $this->assertSame($expected, $comment->previewText());

        $commented = new MessageCommented($message, $comment, $commenter);
        $this->assertSame($expected, $commented->toArray($author)['comment']);
        $this->assertSame($expected, $commented->toBroadcast($author)->data['body']);

        $tagged = new UserTagged($comment, $commenter, 'comment');
        $this->assertSame($expected, $tagged->toArray($author)['comment']);
        $this->assertSame($expected, $tagged->toBroadcast($author)->data['body']);

        $reacted = new MessageReacted($message, $author, '❤️', $comment);
        $this->assertSame($expected, $reacted->toArray($commenter)['comment']);
    }

    public function test_the_voice_comment_wording_is_translated(): void
    {
        $comment = $this->readyVoiceComment(['user_id' => User::factory()->create(['name' => 'Gus'])->id]);

        app()->setLocale('es');
        $this->assertSame('Gus envió un comentario de voz', $comment->previewText());

        app()->setLocale('fr');
        $this->assertSame('Gus a envoyé un commentaire vocal', $comment->previewText());
    }
}
