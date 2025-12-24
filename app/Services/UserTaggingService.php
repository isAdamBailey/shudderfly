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
     * Notify tagged users about being mentioned in a message or comment.
     *
     * @param  array<int>  $taggedUserIds
     * @param  User  $tagger
     * @param  Message|MessageComment  $content
     * @param  string  $contentType  Either 'message' or 'comment'
     * @return void
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

            // Send database notification
            $taggedUser->notify(new UserTagged($content, $tagger, $contentType));

            // Prepare content text for push notification
            $contentText = $contentType === 'comment' && $content instanceof MessageComment
                ? $content->comment
                : ($content instanceof Message ? $content->message : '');

            // Truncate content for push notification (max ~120 chars for body)
            $pushBody = mb_strlen($contentText, 'UTF-8') > 120
                ? mb_substr($contentText, 0, 117, 'UTF-8').'...'
                : $contentText;

            // Build push notification data
            $pushData = [
                'type' => 'user_tagged',
                'tagger_id' => $tagger->id,
                'tagger_name' => $tagger->name,
                'url' => route('messages.index'),
            ];

            // Add content-specific data
            if ($contentType === 'comment' && $content instanceof MessageComment) {
                $pushData['comment_id'] = $content->id;
                $pushData['message_id'] = $content->message_id;
                $pushData['comment'] = $content->comment;
                $pushData['url'] = route('messages.index').'#message-'.$content->message_id;
            } else {
                $pushData['message_id'] = $content instanceof Message ? $content->id : null;
                $pushData['message'] = $contentText;
            }

            // Send push notification
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

