<?php

namespace App\Events;

use App\Models\WorldClockSetting;
use App\Support\WorldClockState;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WorldClockUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public WorldClockSetting $setting;

    public function __construct(WorldClockSetting $setting)
    {
        $this->setting = $setting;
    }

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('world-clock'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'WorldClockUpdated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return WorldClockState::payload($this->setting);
    }
}
