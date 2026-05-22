<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Message $message;

    /**
     * Create a new event instance.
     */
    public function __construct(Message $message)
    {
        $this->message = $message;
        $this->message->loadMissing(['user', 'page', 'song']);
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, PrivateChannel>
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
        return 'MessageCreated';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'user_id' => $this->message->user_id,
            'message' => $this->message->message,
            'page_id' => $this->message->page_id,
            'song_id' => $this->message->song_id,
            'created_at' => $this->message->created_at->toIso8601String(),
            'user' => [
                'id' => $this->message->user->id,
                'name' => $this->message->user->name,
            ],
            'page' => $this->message->page ? [
                'id' => $this->message->page->id,
                'content' => $this->message->page->content,
                'media_path' => $this->message->page->media_path,
                'media_poster' => $this->message->page->media_poster,
                'video_link' => $this->message->page->video_link,
            ] : null,
            'song' => $this->message->song ? [
                'id' => $this->message->song->id,
                'title' => $this->message->song->title,
                'thumbnail_high' => $this->message->song->thumbnail_high,
                'thumbnail_default' => $this->message->song->thumbnail_default,
            ] : null,
            'grouped_reactions' => [],
        ];
    }
}
