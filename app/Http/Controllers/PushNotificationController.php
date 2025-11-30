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
     * @param int $userId
     * @param string $title
     * @param string $body
     * @param array $data Optional associative array of additional data to include in the notification payload.
     *                    Example: ['url' => 'https://example.com', 'type' => 'message']
     *                    All keys should be strings, and values should be serializable (string, int, bool, array).
     * @return array Result of the notification send attempt.
     */
    public static function sendNotification($userId, $title, $body, $data = [])
    {
        // Validate $data parameter
        if (!is_array($data)) {
            return [
                'error' => 'Invalid $data parameter: must be an array',
                'sent' => 0,
                'failed' => 0,
                'results' => []
            ];
        }
        $webPushClass = 'Minishlink\WebPush\WebPush';
        $subscriptionClass = 'Minishlink\WebPush\Subscription';
        
        if (!class_exists($webPushClass)) {
            return [
                'error' => 'WebPush package not installed',
                'sent' => 0,
                'failed' => 0,
                'results' => []
            ];
        }

        $subscriptions = PushSubscription::where('user_id', $userId)->get();

        if ($subscriptions->isEmpty()) {
            return [
                'error' => 'No subscriptions found',
                'sent' => 0,
                'failed' => 0,
                'results' => []
            ];
        }

        $publicKey = config('services.webpush.public_key');
        $privateKey = config('services.webpush.private_key');

        if (!$publicKey || !$privateKey) {
            return [
                'error' => 'VAPID keys not configured',
                'sent' => 0,
                'failed' => 0,
                'results' => []
            ];
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

        // Track endpoint to subscription mapping for cleanup
        $endpointToSubscription = [];

        foreach ($subscriptions as $subscription) {
            try {
                // Validate that required keys are present
                if (!isset($subscription->keys['p256dh']) || !isset($subscription->keys['auth'])) {
                    continue;
                }

                /** @var \Minishlink\WebPush\Subscription $pushSubscription */
                $pushSubscription = $subscriptionClass::create([
                    'endpoint' => $subscription->endpoint,
                    'keys' => $subscription->keys,
                ]);

                // Track this subscription for cleanup
                $endpointToSubscription[$subscription->endpoint] = $subscription;

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
                Log::error('Push notification error: ' . $e->getMessage(), [
                    'subscription_id' => $subscription->id ?? null,
                    'user_id' => $subscription->user_id ?? null,
                    'endpoint' => $subscription->endpoint ?? null
                ]);
            }
        }

        $results = [];
        foreach ($webPush->flush() as $report) {
            if ($report->isSuccess()) {
                $results[] = ['success' => true, 'endpoint' => $report->getEndpoint()];
            } else {
                $results[] = ['success' => false, 'endpoint' => $report->getEndpoint(), 'reason' => $report->getReason()];
                Log::error('Push notification failed: ' . $report->getReason());
                // Remove invalid subscriptions - use both user_id and endpoint to match composite unique constraint
                if ($report->isSubscriptionExpired()) {
                    $endpoint = $report->getEndpoint();
                    if (isset($endpointToSubscription[$endpoint])) {
                        $subscription = $endpointToSubscription[$endpoint];
                        PushSubscription::where('user_id', $subscription->user_id)
                            ->where('endpoint', $endpoint)
                            ->delete();
                    } else {
                        // Fallback: delete by endpoint only if mapping not found (shouldn't happen)
                        // But since we're in the context of a specific userId, we can filter by that
                        PushSubscription::where('user_id', $userId)
                            ->where('endpoint', $endpoint)
                            ->delete();
                    }
                }
            }
        }
        
        return [
            'sent' => count(array_filter($results, fn($r) => $r['success'])),
            'failed' => count(array_filter($results, fn($r) => !$r['success'])),
            'results' => $results
        ];
    }
}

