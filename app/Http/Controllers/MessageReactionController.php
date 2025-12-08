<?php

namespace App\Http\Controllers;

use App\Events\MessageReactionUpdated;
use App\Models\Message;
use App\Models\MessageReaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageReactionController extends Controller
{
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
                'error' => 'Invalid emoji. Allowed emojis: '.implode(' ', MessageReaction::ALLOWED_EMOJIS),
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
}
