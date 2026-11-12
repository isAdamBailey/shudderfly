<?php

namespace App\Notifications;

use App\Models\Message;
use App\Models\MessageComment;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserTagged extends Notification implements ShouldBroadcast
{
    use Queueable;

    public Message|MessageComment $content;

    public User $tagger;

    public string $contentType;

    /** A sound mention returns to its new home in the World. */
    private function url(): string
    {
        if (
            $this->contentType === 'message'
            && $this->content instanceof Message
            && $this->content->sound_id
        ) {
            return route('games.index', ['scene' => 'guster-house.exhibit']);
        }

        $messageId = $this->contentType === 'comment' && $this->content instanceof MessageComment
            ? $this->content->message_id
            : ($this->content instanceof Message ? $this->content->id : null);

        return route('messages.index').'#message-'.$messageId;
    }

    /**
     * Create a new notification instance.
     */
    public function __construct(Message|MessageComment $content, User $tagger, string $contentType = 'message')
    {
        $this->content = $content->withoutRelations();
        $this->tagger = $tagger;
        $this->contentType = $contentType;
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
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $mailQuote = $this->content->previewText();

        return (new MailMessage)
            ->subject(__('messages.tagged.subject', ['name' => $this->tagger->name]))
            ->greeting(__('messages.tagged.greeting', ['name' => $notifiable->name]))
            ->line(__('messages.tagged.line', ['name' => $this->tagger->name]))
            ->line('"'.$mailQuote.'"')
            ->action(__('messages.tagged.action'), $this->url())
            ->line(__('messages.notifications.email.opt_out_markdown', ['url' => route('profile.edit')]))
            ->line(__('messages.tagged.thank_you'));
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        $title = __('messages.tagged.title', ['name' => $this->tagger->name]);

        $previewText = $this->content->previewText();

        $messageBody = mb_strlen($previewText, 'UTF-8') > 120
            ? mb_substr($previewText, 0, 117, 'UTF-8').'...'
            : $previewText;

        $messageId = $this->contentType === 'comment' && $this->content instanceof MessageComment
            ? $this->content->message_id
            : ($this->content instanceof Message ? $this->content->id : null);

        $data = [
            'tagger_id' => $this->tagger->id,
            'tagger_name' => $this->tagger->name,
            'tagger_avatar' => $this->tagger->avatar,
            'created_at' => $this->content->created_at->toIso8601String(),
            'url' => $this->url(),
        ];

        if ($this->contentType === 'comment' && $this->content instanceof MessageComment) {
            $data['comment_id'] = $this->content->id;
            $data['message_id'] = $this->content->message_id;
            $data['comment'] = $this->content->previewText();
            $data['message'] = $data['comment'];
        } else {
            $data['message_id'] = $this->content instanceof Message ? $this->content->id : null;
            $data['message'] = $this->content->previewText();
        }

        return new BroadcastMessage([
            'id' => $this->id,
            'type' => 'App\Notifications\UserTagged',
            'title' => $title,
            'body' => $messageBody,
            'icon' => '/android-chrome-192x192.png',
            'data' => $data,
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
            'tagger_id' => $this->tagger->id,
            'tagger_name' => $this->tagger->name,
            'tagger_avatar' => $this->tagger->avatar,
            'created_at' => $this->content->created_at->toIso8601String(),
            'url' => $this->url(),
        ];

        if ($this->contentType === 'comment' && $this->content instanceof MessageComment) {
            $data['comment_id'] = $this->content->id;
            $data['message_id'] = $this->content->message_id;
            $data['comment'] = $this->content->previewText();
            $data['message'] = $data['comment'];
        } else {
            $data['message_id'] = $this->content instanceof Message ? $this->content->id : null;
            $data['message'] = $this->content->previewText();
        }

        return $data;
    }
}
