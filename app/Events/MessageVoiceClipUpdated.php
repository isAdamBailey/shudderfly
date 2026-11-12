<?php

namespace App\Events;

use App\Models\Message;
use App\Support\BroadcastChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** A message's voice clip finished processing (ready) or gave up (failed). */
class MessageVoiceClipUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel(BroadcastChannel::name('messages')),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessageVoiceClipUpdated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'message_id' => $this->message->id,
            ...$this->message->voiceClipPayload(),
        ];
    }
}
