<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use App\Notifications\UserTagged;
use App\Services\PushNotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    public function __construct(
        protected PushNotificationService $pushNotificationService
    ) {}

    /**
     * Display the messages index page.
     */
    public function index(): Response
    {
        // Get raw value to avoid accessor conversion
        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return Inertia::render('Messages/Index', [
                'messages' => [],
                'messagingEnabled' => false,
            ]);
        }

        $messages = Message::with(['user', 'page', 'reactions.user', 'comments.user', 'comments.reactions.user'])
            ->recent()
            ->withinRetentionPeriod()
            ->paginate(20);

        // Transform messages to include grouped reactions and comments with grouped reactions
        $messages->getCollection()->transform(function ($message) {
            $message->grouped_reactions = $message->getGroupedReactions();

            // Transform comments to include grouped reactions
            $message->comments->transform(function ($comment) {
                $comment->grouped_reactions = $comment->getGroupedReactions();

                return $comment;
            });

            return $message;
        });

        $users = User::select('id', 'name')
            ->orderBy('name')
            ->get()
            ->makeVisible(['id']);

        return Inertia::render('Messages/Index', [
            'messages' => $messages,
            'messagingEnabled' => true,
            'users' => $users,
        ]);
    }

    /**
     * Get a specific message by ID.
     */
    public function show(Message $message): \Illuminate\Http\JsonResponse
    {
        $message->load(['user', 'reactions.user', 'comments.user', 'comments.reactions.user']);

        // Transform comments to include grouped reactions
        $comments = $message->comments->map(function ($comment) {
            return [
                'id' => $comment->id,
                'comment' => $comment->comment,
                'created_at' => $comment->created_at->toIso8601String(),
                'user' => [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                ],
                'grouped_reactions' => $comment->getGroupedReactions(),
            ];
        });

        return response()->json([
            'id' => $message->id,
            'user_id' => $message->user_id,
            'message' => $message->message,
            'created_at' => $message->created_at->toIso8601String(),
            'user' => [
                'id' => $message->user->id,
                'name' => $message->user->name,
            ],
            'grouped_reactions' => $message->getGroupedReactions(),
            'comments' => $comments,
        ]);
    }

    /**
     * Store a newly created message.
     */
    public function store(Request $request): RedirectResponse
    {
        // Get raw value to avoid accessor conversion
        $setting = SiteSetting::where('key', 'messaging_enabled')->first();
        $messagingEnabled = $setting && ($setting->getAttributes()['value'] ?? $setting->value) === '1';

        if (! $messagingEnabled) {
            return back()->withErrors(['message' => __('messages.messaging.disabled')]);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $message = Message::create([
            'user_id' => $user->id,
            'message' => $validated['message'],
        ]);

        // Load user relationship for broadcasting
        $message->load('user');

        // Use tagged user IDs from request if provided and not empty, otherwise parse from message
        $taggedUserIds = ! empty($validated['tagged_user_ids'])
            ? $validated['tagged_user_ids']
            : $message->getTaggedUserIds();

        if (! is_array($taggedUserIds)) {
            $taggedUserIds = [];
        }

        foreach ($taggedUserIds as $userId) {
            $taggedUser = User::find($userId);
            if ($taggedUser) {
                // Send database notification
                $taggedUser->notify(new UserTagged($message, $user));

                // Send push notification
                $title = __('messages.tagged.push_title', ['name' => $user->name]);
                // Truncate message for push notification (max ~120 chars for body)
                $messageBody = mb_strlen($message->message, 'UTF-8') > 120
                    ? mb_substr($message->message, 0, 117, 'UTF-8').'...'
                    : $message->message;

                $this->pushNotificationService->sendNotification(
                    $taggedUser->id,
                    $title,
                    $messageBody,
                    [
                        'type' => 'user_tagged',
                        'message_id' => $message->id,
                        'tagger_id' => $user->id,
                        'tagger_name' => $user->name,
                        'message' => $message->message,
                        'url' => route('messages.index'),
                    ]
                );
            }
        }

        // Broadcast the new message
        event(new MessageCreated($message));

        // Flash message is handled via Echo broadcast for all users
        return back();
    }

    /**
     * Remove the specified message.
     */
    public function destroy(Message $message): RedirectResponse
    {
        // Only admins can delete messages
        if (! Auth::user()->hasPermissionTo('admin')) {
            abort(403, __('messages.admin.only_messages'));
        }

        $message->delete();

        return back()->with('success', __('messages.message.deleted'));
    }
}
