<?php

namespace App\Events;

use App\Models\Collage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CollagePageRemoved implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Collage $collage;

    /**
     * Create a new event instance.
     */
    public function __construct(Collage $collage)
    {
        $this->collage = $collage;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('collages'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'CollagePageRemoved';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $this->collage->loadMissing('pages');

        return [
            'collage' => [
                'id' => $this->collage->id,
                'is_archived' => $this->collage->is_archived,
                'is_locked' => $this->collage->is_locked,
                'pages' => $this->collage->pages->map(fn ($page) => ['id' => $page->id])->values()->toArray(),
            ],
        ];
    }
}
