<?php

namespace App\Http\Controllers;

use App\Events\CommentCreated;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\User;
use App\Notifications\MessageCommented;
use App\Services\PushNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageCommentController extends Controller
{
    public function __construct(
        protected PushNotificationService $pushNotificationService
    ) {}

    /**
     * Store a newly created comment.
     */
    public function store(Request $request, Message $message): RedirectResponse
    {
        $validated = $request->validate([
            'comment' => ['required', 'string', 'max:1000'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $comment = MessageComment::create([
            'message_id' => $message->id,
            'user_id' => $user->id,
            'comment' => $validated['comment'],
        ]);

        $comment->load('user');
        $message->load('user');

        if ($message->user_id !== $user->id) {
            $messageAuthor = $message->user;

            $messageAuthor->notify(new MessageCommented($message, $comment, $user));

            $title = $user->name.' commented on your message';
            $commentBody = mb_strlen($comment->comment, 'UTF-8') > 120
                ? mb_substr($comment->comment, 0, 117, 'UTF-8').'...'
                : $comment->comment;

            $this->pushNotificationService->sendNotification(
                $messageAuthor->id,
                $title,
                $commentBody,
                [
                    'type' => 'message_commented',
                    'message_id' => $message->id,
                    'comment_id' => $comment->id,
                    'commenter_id' => $user->id,
                    'commenter_name' => $user->name,
                    'message' => $message->message,
                    'comment' => $comment->comment,
                    'url' => route('messages.index').'#message-'.$message->id,
                ]
            );
        }

        event(new CommentCreated($comment));

        return back();
    }

    /**
     * Remove the specified comment.
     */
    public function destroy(Message $message, MessageComment $comment): RedirectResponse
    {
        if (! Auth::user()->hasPermissionTo('admin')) {
            abort(403, 'Only admins can delete comments.');
        }

        $comment->delete();

        return back()->with('success', 'Comment deleted successfully.');
    }
}
