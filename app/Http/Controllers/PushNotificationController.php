<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PushNotificationController extends Controller
{
    /**
     * Store a push subscription
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|url',
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
                'keys' => json_encode($request->keys),
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
            'endpoint' => 'required|url',
        ]);

        $user = $request->user();

        PushSubscription::where('user_id', $user->id)
            ->where('endpoint', $request->endpoint)
            ->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Send a push notification to a user
     * This can be called from your Laravel backend when Pusher events occur
     * 
     * Requires: composer require minishlink/web-push
     */
    public static function sendNotification($userId, $title, $body, $data = [])
    {
        $webPushClass = 'Minishlink\WebPush\WebPush';
        $subscriptionClass = 'Minishlink\WebPush\Subscription';
        
        if (!class_exists($webPushClass)) {
            Log::warning('WebPush package not installed. Run: composer require minishlink/web-push');
            return;
        }

        $subscriptions = PushSubscription::where('user_id', $userId)->get();

        if ($subscriptions->isEmpty()) {
            return;
        }

        $publicKey = config('services.webpush.public_key');
        $privateKey = config('services.webpush.private_key');

        if (!$publicKey || !$privateKey) {
            Log::warning('VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env');
            return;
        }

        $auth = [
            'VAPID' => [
                'subject' => config('app.url'),
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ];

        /** @var \Minishlink\WebPush\WebPush $webPush */
        $webPush = new $webPushClass($auth);

        foreach ($subscriptions as $subscription) {
            try {
                /** @var \Minishlink\WebPush\Subscription $pushSubscription */
                $pushSubscription = $subscriptionClass::create([
                    'endpoint' => $subscription->endpoint,
                    'keys' => json_decode($subscription->keys, true),
                ]);

                $webPush->queueNotification(
                    $pushSubscription,
                    json_encode([
                        'title' => $title,
                        'body' => $body,
                        'icon' => '/android-chrome-192x192.png',
                        'data' => $data,
                    ])
                );
            } catch (\Exception $e) {
                Log::error('Push notification error: ' . $e->getMessage());
            }
        }

        foreach ($webPush->flush() as $report) {
            if (!$report->isSuccess()) {
                Log::error('Push notification failed: ' . $report->getReason());
                // Remove invalid subscriptions
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $report->getEndpoint())->delete();
                }
            }
        }
    }
}

