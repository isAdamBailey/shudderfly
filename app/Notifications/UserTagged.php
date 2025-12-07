<?php

namespace App\Notifications;

use App\Models\Message;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserTagged extends Notification implements ShouldBroadcast
{
    use Queueable;

    public Message $message;

    public User $tagger;

    /**
     * Create a new notification instance.
     */
    public function __construct(Message $message, User $tagger)
    {
        $this->message = $message;
        $this->tagger = $tagger;
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
        $url = route('messages.index').'#message-'.$this->message->id;

        return (new MailMessage)
            ->subject('You were tagged in a message by '.$this->tagger->name)
            ->greeting('Hello '.$notifiable->name.'!')
            ->line($this->tagger->name.' tagged you in a message:')
            ->line('"'.$this->message->message.'"')
            ->action('View Message', $url)
            ->line('Thank you for using our platform!');
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        $title = 'You were tagged by '.$this->tagger->name;
        $messageBody = mb_strlen($this->message->message, 'UTF-8') > 120
            ? mb_substr($this->message->message, 0, 117, 'UTF-8').'...'
            : $this->message->message;

        return new BroadcastMessage([
            'id' => $this->id,
            'type' => 'App\Notifications\UserTagged',
            'title' => $title,
            'body' => $messageBody,
            'icon' => '/android-chrome-192x192.png',
            'data' => [
                'message_id' => $this->message->id,
                'message' => $this->message->message,
                'tagger_id' => $this->tagger->id,
                'tagger_name' => $this->tagger->name,
                'tagger_avatar' => $this->tagger->avatar,
                'created_at' => $this->message->created_at->toIso8601String(),
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
            'message' => $this->message->message,
            'tagger_id' => $this->tagger->id,
            'tagger_name' => $this->tagger->name,
            'tagger_avatar' => $this->tagger->avatar,
            'created_at' => $this->message->created_at->toIso8601String(),
            'url' => route('messages.index').'#message-'.$this->message->id,
        ];
    }
}
