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

        $messages = Message::with('user')
            ->recent()
            ->withinRetentionPeriod()
            ->paginate(20);

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
        $message->load('user');

        return response()->json([
            'id' => $message->id,
            'user_id' => $message->user_id,
            'message' => $message->message,
            'created_at' => $message->created_at->toIso8601String(),
            'user' => [
                'id' => $message->user->id,
                'name' => $message->user->name,
            ],
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
            return back()->withErrors(['message' => 'Messaging is currently disabled.']);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'tagged_user_ids' => ['sometimes', 'array'],
            'tagged_user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $message = Message::create([
            'user_id' => Auth::id(),
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
                $taggedUser->notify(new UserTagged($message, Auth::user()));

                // Send push notification
                $title = 'You were tagged by '.Auth::user()->name;
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
                        'tagger_id' => Auth::id(),
                        'tagger_name' => Auth::user()->name,
                        'message' => $message->message,
                        'url' => route('messages.index'),
                    ]
                );
            }
        }

        // Broadcast the new message
        event(new MessageCreated($message));

        // Return flash message for the user who posted (others will see it via Echo)
        return back()->with('success', 'New message added by '.Auth::user()->name);
    }

    /**
     * Remove the specified message.
     */
    public function destroy(Message $message): RedirectResponse
    {
        // Only admins can delete messages
        if (! Auth::user()->hasPermissionTo('admin')) {
            abort(403, 'Only admins can delete messages.');
        }

        $message->delete();

        return back()->with('success', 'Message deleted successfully.');
    }
}
