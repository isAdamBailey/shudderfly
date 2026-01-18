<?php

namespace App\Services;

use App\Models\Message;
use App\Models\MessageComment;
use App\Models\User;
use App\Notifications\UserTagged;

class UserTaggingService
{
    public function __construct(
        protected PushNotificationService $pushNotificationService
    ) {}

    /**
     * Process and notify tagged users from request or content.
     * Handles validation, normalization, extraction, and notification.
     *
     * @param  array<string, mixed>  $validated  Validated request data
     * @param  User  $tagger  User who created the content
     * @param  Message|MessageComment  $content  The message or comment
     * @param  string  $contentType  Either 'message' or 'comment'
     * @param  string  $contentField  Field name for parsing (e.g., 'message', 'comment')
     * @return void
     */
    public function processAndNotifyTaggedUsers(
        array $validated,
        User $tagger,
        Message|MessageComment $content,
        string $contentType,
        string $contentField = 'message'
    ): void {
        $taggedUserIds = $this->extractTaggedUserIds($validated, $content, $contentField);

        if (! empty($taggedUserIds)) {
            $this->notifyTaggedUsers($taggedUserIds, $tagger, $content, $contentType);
        }
    }

    /**
     * Extract tagged user IDs from validated request or parse from content.
     *
     * @param  array<string, mixed>  $validated  Validated request data
     * @param  Message|MessageComment  $content  The message or comment
     * @param  string  $contentField  Field name for parsing (e.g., 'message', 'comment')
     * @return array<int>
     */
    public function extractTaggedUserIds(
        array $validated,
        Message|MessageComment $content,
        string $contentField = 'message'
    ): array {
        if (! empty($validated['tagged_user_ids'])) {
            $taggedUserIds = $validated['tagged_user_ids'];
        } else {
            $taggedUserIds = $content->getTaggedUserIds($contentField);
        }

        if (! is_array($taggedUserIds)) {
            $taggedUserIds = [];
        }

        return $taggedUserIds;
    }

    /**
     * Notify tagged users about being mentioned in a message or comment.
     *
     * @param  array<int>  $taggedUserIds
     * @param  string  $contentType  Either 'message' or 'comment'
     */
    public function notifyTaggedUsers(array $taggedUserIds, User $tagger, Message|MessageComment $content, string $contentType): void
    {
        if (! is_array($taggedUserIds) || empty($taggedUserIds)) {
            return;
        }

        foreach ($taggedUserIds as $userId) {
            $taggedUser = User::find($userId);
            if (! $taggedUser) {
                continue;
            }

            $taggedUser->notify(new UserTagged($content, $tagger, $contentType));

            $contentText = $contentType === 'comment' && $content instanceof MessageComment
                ? $content->comment
                : ($content instanceof Message ? $content->message : '');

            $pushBody = mb_strlen($contentText, 'UTF-8') > 120
                ? mb_substr($contentText, 0, 117, 'UTF-8').'...'
                : $contentText;

            $pushData = [
                'type' => 'user_tagged',
                'tagger_id' => $tagger->id,
                'tagger_name' => $tagger->name,
                'url' => route('messages.index'),
            ];

            if ($contentType === 'comment' && $content instanceof MessageComment) {
                $pushData['comment_id'] = $content->id;
                $pushData['message_id'] = $content->message_id;
                $pushData['comment'] = $content->comment;
                $pushData['url'] = route('messages.index').'#message-'.$content->message_id;
            } else {
                $pushData['message_id'] = $content instanceof Message ? $content->id : null;
                $pushData['message'] = $contentText;
            }

            $title = __('messages.tagged.push_title', ['name' => $tagger->name]);
            $this->pushNotificationService->sendNotification(
                $taggedUser->id,
                $title,
                $pushBody,
                $pushData
            );
        }
    }
}

