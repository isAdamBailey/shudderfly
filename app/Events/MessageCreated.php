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
        $this->message->loadMissing(['user', 'page', 'song', 'book.coverImage', 'sound', 'collage']);
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
            'movie_tmdb_id' => $this->message->movie_tmdb_id,
            'movie_title' => $this->message->movie_title,
            'movie_image_path' => $this->message->movie_image_path,
            'book_id' => $this->message->book_id,
            'sound_id' => $this->message->sound_id,
            'collage_id' => $this->message->collage_id,
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
            'book' => $this->message->book ? [
                'id' => $this->message->book->id,
                'slug' => $this->message->book->slug,
                'title' => $this->message->book->title,
                'cover_image' => $this->message->book->coverImage ? [
                    'media_path' => $this->message->book->coverImage->media_path,
                ] : null,
            ] : null,
            'sound' => $this->message->sound ? [
                'id' => $this->message->sound->id,
                'title' => $this->message->sound->title,
                'emoji' => $this->message->sound->emoji,
                'audio_path' => $this->message->sound->audio_path,
            ] : null,
            'collage' => $this->message->collage ? [
                'id' => $this->message->collage->id,
                'preview_path' => $this->message->collage->preview_path,
            ] : null,
            'grouped_reactions' => [],
        ];
    }
}
