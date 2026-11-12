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

class MessageCommented extends Notification implements ShouldBroadcast
{
    use Queueable;

    public Message $message;

    public MessageComment $comment;

    public User $commenter;

    /**
     * Create a new notification instance.
     */
    public function __construct(Message $message, MessageComment $comment, User $commenter)
    {
        $this->message = $message->withoutRelations();
        $this->comment = $comment->withoutRelations();
        $this->commenter = $commenter;
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
        $url = route('messages.index').'#message-'.$this->message->id;

        $quotedMessage = $this->message->previewText();

        return (new MailMessage)
            ->subject(__('messages.commented.subject', ['name' => $this->commenter->name]))
            ->greeting(__('messages.commented.greeting', ['name' => $notifiable->name]))
            ->line(__('messages.commented.line', ['name' => $this->commenter->name]))
            ->line('"'.$quotedMessage.'"')
            ->line(__('messages.commented.comment_line', ['comment' => $this->comment->previewText()]))
            ->action(__('messages.commented.action'), $url)
            ->line(__('messages.notifications.email.opt_out_markdown', ['url' => route('profile.edit')]))
            ->line(__('messages.commented.thank_you'));
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        $title = __('messages.commented.title', ['name' => $this->commenter->name]);
        // A voice-only comment reads "{name} sent a voice comment".
        $commentPreview = $this->comment->previewText();
        $commentBody = mb_strlen($commentPreview, 'UTF-8') > 120
            ? mb_substr($commentPreview, 0, 117, 'UTF-8').'...'
            : $commentPreview;

        $messagePreview = $this->message->previewText();

        return new BroadcastMessage([
            'id' => $this->id,
            'type' => 'App\Notifications\MessageCommented',
            'title' => $title,
            'body' => $commentBody,
            'icon' => '/android-chrome-192x192.png',
            'data' => [
                'message_id' => $this->message->id,
                'comment_id' => $this->comment->id,
                'message' => $messagePreview,
                'comment' => $commentPreview,
                'commenter_id' => $this->commenter->id,
                'commenter_name' => $this->commenter->name,
                'commenter_avatar' => $this->commenter->avatar,
                'created_at' => $this->comment->created_at->toIso8601String(),
                'url' => route('messages.index').'#message-'.$this->message->id,
            ],
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
        return [
            'message_id' => $this->message->id,
            'comment_id' => $this->comment->id,
            'message' => $this->message->previewText(),
            'comment' => $this->comment->previewText(),
            'commenter_id' => $this->commenter->id,
            'commenter_name' => $this->commenter->name,
            'commenter_avatar' => $this->commenter->avatar,
            'created_at' => $this->comment->created_at->toIso8601String(),
            'url' => route('messages.index').'#message-'.$this->message->id,
        ];
    }
}
