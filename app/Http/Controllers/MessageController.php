<?php

namespace App\Http\Controllers;

use App\Events\MessageCreated;
use App\Models\Message;
use App\Models\SiteSetting;
use App\Models\User;
use App\Notifications\UserTagged;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
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
        $taggedUserIds = !empty($validated['tagged_user_ids'])
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

                PushNotificationController::sendNotification(
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

        return back()->with('success', 'Message posted successfully!');
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
