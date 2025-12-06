<?php

namespace App\Notifications;

use App\Models\Message;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Notifications\Messages\BroadcastMessage;
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
        return ['database', 'broadcast'];
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
                'created_at' => $this->message->created_at->toIso8601String(),
                'url' => route('messages.index'),
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
            'created_at' => $this->message->created_at->toIso8601String(),
            'url' => route('messages.index'),
        ];
    }
}
