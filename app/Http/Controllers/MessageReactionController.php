<?php

namespace App\Http\Controllers;

use App\Events\MessageReactionUpdated;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Notifications\MessageReacted;
use App\Services\PushNotificationService;
use App\Support\GameShareMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageReactionController extends Controller
{
    public function __construct(
        protected PushNotificationService $pushNotificationService
    ) {}

    /**
     * Store or update a reaction for a message.
     */
    public function store(Request $request, Message $message): JsonResponse
    {
        $validated = $request->validate([
            'emoji' => ['required', 'string', 'max:10'],
        ]);

        $emoji = $validated['emoji'];

        // Validate emoji is in allowed list
        if (! MessageReaction::isAllowedEmoji($emoji)) {
            return response()->json([
                'error' => __('messages.emoji.invalid', ['emojis' => implode(' ', MessageReaction::ALLOWED_EMOJIS)]),
            ], 422);
        }

        // Get or create reaction for this user and message
        $reaction = MessageReaction::updateOrCreate(
            [
                'message_id' => $message->id,
                'user_id' => Auth::id(),
            ],
            [
                'emoji' => $emoji,
            ]
        );

        // Load relationships
        $reaction->load('user');
        $message->load('reactions.user');

        // Notify the message author when someone else reacts, but not when the
        // same emoji is simply re-saved.
        if ($reaction->wasRecentlyCreated || $reaction->wasChanged('emoji')) {
            $this->notifyMessageAuthor($message, $emoji);
        }

        // Broadcast the update
        event(new MessageReactionUpdated($message));

        return response()->json([
            'reaction' => [
                'id' => $reaction->id,
                'emoji' => $reaction->emoji,
                'user' => [
                    'id' => $reaction->user->id,
                    'name' => $reaction->user->name,
                ],
            ],
            'grouped_reactions' => $message->getGroupedReactions(),
        ]);
    }

    /**
     * Remove a reaction from a message.
     */
    public function destroy(Message $message): JsonResponse
    {
        $reaction = MessageReaction::where('message_id', $message->id)
            ->where('user_id', Auth::id())
            ->first();

        if ($reaction) {
            $reaction->delete();
        }

        // Load relationships for broadcast
        $message->load('reactions.user');

        // Broadcast the update
        event(new MessageReactionUpdated($message));

        return response()->json([
            'grouped_reactions' => $message->getGroupedReactions(),
        ]);
    }

    /**
     * Send database/broadcast and push notifications to the message author.
     */
    protected function notifyMessageAuthor(Message $message, string $emoji): void
    {
        $reactor = Auth::user();

        if (! $reactor || $message->user_id === $reactor->id) {
            return;
        }

        $author = $message->user()->first();

        if (! $author) {
            return;
        }

        $author->notify(new MessageReacted($message, $reactor, $emoji));

        $preview = GameShareMessage::stripSlugMarker($message->message);
        $body = mb_strlen($preview, 'UTF-8') > 120
            ? mb_substr($preview, 0, 117, 'UTF-8').'...'
            : $preview;

        $this->pushNotificationService->sendNotification(
            $author->id,
            __('messages.reacted.push_title', ['name' => $reactor->name, 'emoji' => $emoji]),
            $body,
            [
                'type' => 'message_reacted',
                'message_id' => $message->id,
                'emoji' => $emoji,
                'reactor_id' => $reactor->id,
                'reactor_name' => $reactor->name,
                'message' => $preview,
                'url' => route('messages.index').'#message-'.$message->id,
            ]
        );
    }
}
