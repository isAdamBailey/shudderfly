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

    /**
     * Create a new notification instance.
     */
    public function __construct(Message|MessageComment $content, User $tagger, string $contentType = 'message')
    {
        $this->content = $content;
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
        return ['database', 'broadcast', 'mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $messageId = $this->contentType === 'comment' && $this->content instanceof MessageComment
            ? $this->content->message_id
            : ($this->content instanceof Message ? $this->content->id : null);
        
        $contentText = $this->contentType === 'comment' && $this->content instanceof MessageComment
            ? $this->content->comment
            : ($this->content instanceof Message ? $this->content->message : '');
        
        $url = route('messages.index').'#message-'.$messageId;

        return (new MailMessage)
            ->subject(__('messages.tagged.subject', ['name' => $this->tagger->name]))
            ->greeting(__('messages.tagged.greeting', ['name' => $notifiable->name]))
            ->line(__('messages.tagged.line', ['name' => $this->tagger->name]))
            ->line('"'.$contentText.'"')
            ->action(__('messages.tagged.action'), $url)
            ->line(__('messages.tagged.thank_you'));
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        $title = __('messages.tagged.title', ['name' => $this->tagger->name]);
        
        $contentText = $this->contentType === 'comment' && $this->content instanceof MessageComment
            ? $this->content->comment
            : ($this->content instanceof Message ? $this->content->message : '');
        
        $messageBody = mb_strlen($contentText, 'UTF-8') > 120
            ? mb_substr($contentText, 0, 117, 'UTF-8').'...'
            : $contentText;

        $messageId = $this->contentType === 'comment' && $this->content instanceof MessageComment
            ? $this->content->message_id
            : ($this->content instanceof Message ? $this->content->id : null);

        $data = [
            'tagger_id' => $this->tagger->id,
            'tagger_name' => $this->tagger->name,
            'tagger_avatar' => $this->tagger->avatar,
            'created_at' => $this->content->created_at->toIso8601String(),
            'url' => route('messages.index').'#message-'.$messageId,
        ];

        if ($this->contentType === 'comment' && $this->content instanceof MessageComment) {
            $data['comment_id'] = $this->content->id;
            $data['message_id'] = $this->content->message_id;
            $data['comment'] = $this->content->comment;
        } else {
            $data['message_id'] = $this->content instanceof Message ? $this->content->id : null;
            $data['message'] = $contentText;
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
        $messageId = $this->contentType === 'comment' && $this->content instanceof MessageComment
            ? $this->content->message_id
            : ($this->content instanceof Message ? $this->content->id : null);
        
        $contentText = $this->contentType === 'comment' && $this->content instanceof MessageComment
            ? $this->content->comment
            : ($this->content instanceof Message ? $this->content->message : '');

        $data = [
            'tagger_id' => $this->tagger->id,
            'tagger_name' => $this->tagger->name,
            'tagger_avatar' => $this->tagger->avatar,
            'created_at' => $this->content->created_at->toIso8601String(),
            'url' => route('messages.index').'#message-'.$messageId,
        ];

        if ($this->contentType === 'comment' && $this->content instanceof MessageComment) {
            $data['comment_id'] = $this->content->id;
            $data['message_id'] = $this->content->message_id;
            $data['comment'] = $this->content->comment;
        } else {
            $data['message_id'] = $this->content instanceof Message ? $this->content->id : null;
            $data['message'] = $contentText;
        }

        return $data;
    }
}
