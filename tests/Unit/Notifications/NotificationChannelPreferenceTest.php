<?php

namespace Tests\Unit\Notifications;

use App\Models\Message;
use App\Models\MessageComment;
use App\Models\Song;
use App\Models\User;
use App\Notifications\MessageCommented;
use App\Notifications\UserTagged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationChannelPreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_message_commented_includes_mail_when_email_notifications_are_enabled()
    {
        $notifiable = User::factory()->create([
            'email_notifications_enabled' => true,
        ]);
        $commenter = User::factory()->create();
        $message = Message::factory()->for($notifiable)->create();
        $comment = MessageComment::factory()->for($message)->for($commenter)->create();

        $channels = (new MessageCommented($message, $comment, $commenter))->via($notifiable);

        $this->assertContains('mail', $channels);
    }

    public function test_message_commented_excludes_mail_when_email_notifications_are_disabled()
    {
        $notifiable = User::factory()->create([
            'email_notifications_enabled' => false,
        ]);
        $commenter = User::factory()->create();
        $message = Message::factory()->for($notifiable)->create();
        $comment = MessageComment::factory()->for($message)->for($commenter)->create();

        $channels = (new MessageCommented($message, $comment, $commenter))->via($notifiable);

        $this->assertNotContains('mail', $channels);
    }

    public function test_user_tagged_includes_mail_when_email_notifications_are_enabled()
    {
        $notifiable = User::factory()->create([
            'email_notifications_enabled' => true,
        ]);
        $tagger = User::factory()->create();
        $message = Message::factory()->for($tagger)->create();

        $channels = (new UserTagged($message, $tagger, 'message'))->via($notifiable);

        $this->assertContains('mail', $channels);
    }

    public function test_user_tagged_excludes_mail_when_email_notifications_are_disabled()
    {
        $notifiable = User::factory()->create([
            'email_notifications_enabled' => false,
        ]);
        $tagger = User::factory()->create();
        $message = Message::factory()->for($tagger)->create();

        $channels = (new UserTagged($message, $tagger, 'message'))->via($notifiable);

        $this->assertNotContains('mail', $channels);
    }

    public function test_user_tagged_can_be_queued_after_message_has_song_loaded(): void
    {
        $tagger = User::factory()->create();
        $song = Song::factory()->create();
        $message = Message::factory()->for($tagger)->create(['song_id' => $song->id]);
        $message->load(['song', 'user']);

        $notification = new UserTagged($message, $tagger, 'message');

        /** @var UserTagged $restored */
        $restored = unserialize(serialize($notification));

        $this->assertSame($message->id, $restored->content->id);
        $this->assertFalse($restored->content->relationLoaded('song'));
    }
}
