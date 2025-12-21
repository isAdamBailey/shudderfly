<?php

namespace App\Http\Controllers;

use App\Events\CommentReactionUpdated;
use App\Models\CommentReaction;
use App\Models\Message;
use App\Models\MessageComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentReactionController extends Controller
{
    /**
     * Store or update a reaction for a comment.
     */
    public function store(Request $request, Message $message, MessageComment $comment): JsonResponse
    {
        $validated = $request->validate([
            'emoji' => ['required', 'string', 'max:10'],
        ]);

        $emoji = $validated['emoji'];

        if (! CommentReaction::isAllowedEmoji($emoji)) {
            return response()->json([
                'error' => __('messages.emoji.invalid', ['emojis' => implode(' ', CommentReaction::ALLOWED_EMOJIS)]),
            ], 422);
        }

        $reaction = CommentReaction::updateOrCreate(
            [
                'comment_id' => $comment->id,
                'user_id' => Auth::id(),
            ],
            [
                'emoji' => $emoji,
            ]
        );

        $reaction->load('user');
        $comment->load('reactions.user');

        event(new CommentReactionUpdated($comment));

        return response()->json([
            'reaction' => [
                'id' => $reaction->id,
                'emoji' => $reaction->emoji,
                'user' => [
                    'id' => $reaction->user->id,
                    'name' => $reaction->user->name,
                ],
            ],
            'grouped_reactions' => $comment->getGroupedReactions(),
        ]);
    }

    /**
     * Remove a reaction from a comment.
     */
    public function destroy(Message $message, MessageComment $comment): JsonResponse
    {
        $reaction = CommentReaction::where('comment_id', $comment->id)
            ->where('user_id', Auth::id())
            ->first();

        if ($reaction) {
            $reaction->delete();
        }

        $comment->load('reactions.user');

        event(new CommentReactionUpdated($comment));

        return response()->json([
            'grouped_reactions' => $comment->getGroupedReactions(),
        ]);
    }
}
