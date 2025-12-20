<?php

namespace App\Events;

use App\Models\MessageComment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public MessageComment $comment;

    /**
     * Create a new event instance.
     */
    public function __construct(MessageComment $comment)
    {
        $this->comment = $comment;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('messages'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'CommentCreated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->comment->loadMissing('user');

        return [
            'id' => $this->comment->id,
            'message_id' => $this->comment->message_id,
            'user_id' => $this->comment->user_id,
            'comment' => $this->comment->comment,
            'created_at' => $this->comment->created_at->toIso8601String(),
            'user' => [
                'id' => $this->comment->user->id,
                'name' => $this->comment->user->name,
            ],
            'grouped_reactions' => [],
        ];
    }
}
