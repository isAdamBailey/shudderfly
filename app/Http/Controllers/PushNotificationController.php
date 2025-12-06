<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PushNotificationController extends Controller
{
    public function __construct(
        protected PushNotificationService $pushNotificationService
    ) {
    }
    /**
     * Store a push subscription
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string|max:1000',
            'keys' => 'required|array',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        $user = $request->user();

        // Store or update subscription
        PushSubscription::updateOrCreate(
            [
                'user_id' => $user->id,
                'endpoint' => $request->endpoint,
            ],
            [
                'keys' => $request->keys,
            ]
        );

        return response()->json(['success' => true]);
    }

    /**
     * Remove a push subscription
     */
    public function unsubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string|max:1000',
        ]);

        $user = $request->user();

        PushSubscription::where('user_id', $user->id)
            ->where('endpoint', $request->endpoint)
            ->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Send a Web Push API notification to a user's browser using the minishlink/web-push library.
     *
     * This method sends browser push notifications, not Pusher notifications.
     * Requires: composer require minishlink/web-push
     *
     * @param  int  $userId
     * @param  string  $title
     * @param  string  $body
     * @param  array  $data  Optional associative array of additional data to include in the notification payload.
     *                       Example: ['url' => 'https://example.com', 'type' => 'message']
     *                       All keys should be strings, and values should be serializable (string, int, bool, array).
     * @return array Result of the notification send attempt.
     * @deprecated Use PushNotificationService::sendNotification() instead. This method is kept for backward compatibility.
     */
    public static function sendNotification($userId, $title, $body, $data = [])
    {
        // Delegate to service for backward compatibility
        $service = app(PushNotificationService::class);
        return $service->sendNotification($userId, $title, $body, $data);
    }
}
