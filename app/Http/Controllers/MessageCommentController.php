<?php

namespace App\Http\Controllers;

use App\Events\CommentCreated;
use App\Jobs\StoreVoiceClip;
use App\Models\Message;
use App\Models\MessageComment;
use App\Models\User;
use App\Notifications\MessageCommented;
use App\Services\PushNotificationService;
use App\Services\UserTaggingService;
use App\Support\VoiceMessages;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MessageCommentController extends Controller
{
    public function __construct(
        protected PushNotificationService $pushNotificationService,
        protected UserTaggingService $userTaggingService
    ) {}

    /**
     * Store a newly created comment.
     */
    public function store(Request $request, Message $message): RedirectResponse
    {
        $validated = $request->validate([
            // A voice-only comment has no text.
            'comment' => ['required_without:voice_clip', 'nullable', 'string', 'max:1000'],
            ...VoiceMessages::rules(),
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
        ], VoiceMessages::messages());

        /** @var User $user */
        $user = $request->user();

        $voiceClipPath = VoiceMessages::storeUpload($request);

        $comment = MessageComment::create([
            'message_id' => $message->id,
            'user_id' => $user->id,
            'comment' => $validated['comment'] ?? null,
            ...VoiceMessages::pendingAttributes($voiceClipPath, $validated['voice_clip_duration'] ?? null),
        ]);

        $comment->load('user');
        $message->load('user');

        $taggedUserIds = $this->userTaggingService->extractTaggedUserIds($validated, $comment, 'comment');

        if (! empty($taggedUserIds)) {
            $this->userTaggingService->notifyTaggedUsers($taggedUserIds, $user, $comment, 'comment');
        }

        // Skip MessageCommented if the author is already receiving a UserTagged notification
        // to avoid sending them two notifications for the same action.
        $authorAlreadyTagged = in_array($message->user_id, array_map('intval', $taggedUserIds));

        if ($message->user_id !== $user->id && ! $authorAlreadyTagged) {
            $messageAuthor = $message->user;

            $messageAuthor->notify(new MessageCommented($message, $comment, $user));

            $title = __('messages.commented.push_title', ['name' => $user->name]);
            // A voice-only comment reads "{name} sent a voice comment".
            $commentPreview = $comment->previewText();
            $commentBody = mb_strlen($commentPreview, 'UTF-8') > 120
                ? mb_substr($commentPreview, 0, 117, 'UTF-8').'...'
                : $commentPreview;

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
                    'message' => $message->previewText(),
                    'comment' => $commentPreview,
                    'url' => route('messages.index').'#message-'.$message->id,
                ]
            );
        }

        event(new CommentCreated($comment));

        // After the broadcast, so a sync queue's "ready" can't arrive before
        // the comment it belongs to.
        if ($voiceClipPath) {
            StoreVoiceClip::dispatch($comment, $voiceClipPath);
        }

        return back();
    }

    /**
     * Remove the specified comment.
     */
    public function destroy(Message $message, MessageComment $comment): RedirectResponse
    {
        if (! Auth::user()->hasPermissionTo('admin')) {
            abort(403, __('messages.admin.only_comments'));
        }

        $comment->delete();

        return back()->with('success', __('messages.comment.deleted'));
    }
}
