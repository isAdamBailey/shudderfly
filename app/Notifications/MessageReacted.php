<?php

namespace App\Notifications;

use App\Models\Message;
use App\Models\MessageComment;
use App\Models\User;
use App\Support\GameShareMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MessageReacted extends Notification implements ShouldBroadcast
{
    use Queueable;

    public Message $message;

    public ?MessageComment $comment;

    public User $reactor;

    public string $emoji;

    /**
     * Create a new notification instance.
     *
     * When $comment is provided the reaction was added to a reply on the message.
     */
    public function __construct(Message $message, User $reactor, string $emoji, ?MessageComment $comment = null)
    {
        $this->message = $message->withoutRelations();
        $this->comment = $comment?->withoutRelations();
        $this->reactor = $reactor;
        $this->emoji = $emoji;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];

        if ($notifiable->email_notifications_enabled) {
            $channels[] = 'mail';
        }

        return $channels;
    }

    /**
     * The text the reaction was added to.
     */
    protected function contentText(): string
    {
        return $this->comment
            ? $this->comment->comment
            : GameShareMessage::stripSlugMarker($this->message->message);
    }

    /**
     * Link back to the message the reaction belongs to.
     */
    protected function url(): string
    {
        return route('messages.index').'#message-'.$this->message->id;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $subjectKey = $this->comment ? 'messages.reacted.comment_subject' : 'messages.reacted.subject';
        $lineKey = $this->comment ? 'messages.reacted.comment_line' : 'messages.reacted.line';

        return (new MailMessage)
            ->subject(__($subjectKey, ['name' => $this->reactor->name, 'emoji' => $this->emoji]))
            ->greeting(__('messages.reacted.greeting', ['name' => $notifiable->name]))
            ->line(__($lineKey, ['name' => $this->reactor->name, 'emoji' => $this->emoji]))
            ->line('"'.$this->contentText().'"')
            ->action(__('messages.reacted.action'), $this->url())
            ->line(__('messages.notifications.email.opt_out_markdown', ['url' => route('welcome')]))
            ->line(__('messages.reacted.thank_you'));
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        $titleKey = $this->comment ? 'messages.reacted.comment_title' : 'messages.reacted.title';

        $preview = $this->contentText();
        $body = mb_strlen($preview, 'UTF-8') > 120
            ? mb_substr($preview, 0, 117, 'UTF-8').'...'
            : $preview;

        return new BroadcastMessage([
            'id' => $this->id,
            'type' => 'App\Notifications\MessageReacted',
            'title' => __($titleKey, ['name' => $this->reactor->name, 'emoji' => $this->emoji]),
            'body' => $body,
            'icon' => '/android-chrome-192x192.png',
            'data' => $this->toArray($notifiable),
            'read_at' => null,
        ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $data = [
            'message_id' => $this->message->id,
            'message' => GameShareMessage::stripSlugMarker($this->message->message),
            'emoji' => $this->emoji,
            'reactor_id' => $this->reactor->id,
            'reactor_name' => $this->reactor->name,
            'reactor_avatar' => $this->reactor->avatar,
            'created_at' => now()->toIso8601String(),
            'url' => $this->url(),
        ];

        if ($this->comment) {
            $data['comment_id'] = $this->comment->id;
            $data['comment'] = $this->comment->comment;
        }

        return $data;
    }
}
