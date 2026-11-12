<?php

namespace App\Events;

use App\Models\MessageComment;
use App\Support\BroadcastChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** A comment's voice clip finished processing (ready) or gave up (failed). */
class CommentVoiceClipUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public MessageComment $comment) {}

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
        return 'CommentVoiceClipUpdated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'comment_id' => $this->comment->id,
            'message_id' => $this->comment->message_id,
            ...$this->comment->voiceClipPayload(),
        ];
    }
}
