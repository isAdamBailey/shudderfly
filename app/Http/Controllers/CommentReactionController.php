<?php

namespace App\Http\Controllers;

use App\Events\CommentReactionUpdated;
use App\Models\CommentReaction;
use App\Models\Message;
use App\Models\MessageComment;
use App\Notifications\MessageReacted;
use App\Services\PushNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommentReactionController extends Controller
{
    public function __construct(
        protected PushNotificationService $pushNotificationService
    ) {}

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

        // Notify the reply author when someone else reacts, but not when the
        // same emoji is simply re-saved.
        if ($reaction->wasRecentlyCreated || $reaction->wasChanged('emoji')) {
            $this->notifyCommentAuthor($message, $comment, $emoji);
        }

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

    /**
     * Send database/broadcast and push notifications to the reply author.
     */
    protected function notifyCommentAuthor(Message $message, MessageComment $comment, string $emoji): void
    {
        $reactor = Auth::user();

        if (! $reactor || $comment->user_id === $reactor->id) {
            return;
        }

        $author = $comment->user()->first();

        if (! $author) {
            return;
        }

        $author->notify(new MessageReacted($message, $reactor, $emoji, $comment));

        $body = mb_strlen($comment->comment, 'UTF-8') > 120
            ? mb_substr($comment->comment, 0, 117, 'UTF-8').'...'
            : $comment->comment;

        $this->pushNotificationService->sendNotification(
            $author->id,
            __('messages.reacted.comment_push_title', ['name' => $reactor->name, 'emoji' => $emoji]),
            $body,
            [
                'type' => 'message_reacted',
                'message_id' => $message->id,
                'comment_id' => $comment->id,
                'emoji' => $emoji,
                'reactor_id' => $reactor->id,
                'reactor_name' => $reactor->name,
                'comment' => $comment->comment,
                'url' => route('messages.index').'#message-'.$message->id,
            ]
        );
    }
}
