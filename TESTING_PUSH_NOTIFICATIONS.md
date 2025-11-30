# Testing Push Notifications - Step by Step Guide

## Prerequisites Checklist

Before testing, make sure you have:

1. ✅ **VAPID Keys Generated**

   ```bash
   # Generate keys (if you haven't already)
   npx web-push generate-vapid-keys
   ```

2. ✅ **VAPID Keys in .env**

   ```env
   VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_private_key
   VITE_VAPID_PUBLIC_KEY=your_public_key
   ```

3. ✅ **Database Migration Run**

   ```bash
   ./vendor/bin/sail artisan migrate
   ```

4. ✅ **Pusher Credentials (if testing Pusher)**

   ```env
   BROADCAST_DRIVER=pusher
   PUSHER_APP_ID=your_app_id
   PUSHER_APP_KEY=your_key
   PUSHER_APP_SECRET=your_secret
   PUSHER_APP_CLUSTER=your_cluster
   VITE_PUSHER_APP_KEY=your_key
   VITE_PUSHER_APP_CLUSTER=your_cluster
   ```

5. ✅ **HTTPS or Localhost**
   - Push notifications require HTTPS in production
   - Localhost works for development

---

## Test 1: Web Push API Subscription (Frontend)

### Step 1: Add Notification Toggle Component

Add the `NotificationToggle` component to a page (e.g., Profile page):

```vue
<!-- In resources/js/Pages/Profile/Edit.vue -->
<script setup>
import NotificationToggle from "@/Components/NotificationToggle.vue";
// ... other imports
</script>

<template>
  <!-- ... existing content ... -->
  <Accordion title="Push Notifications">
    <NotificationToggle />
  </Accordion>
</template>
```

### Step 2: Test Subscription

1. Open your app in the browser
2. Navigate to the page with `NotificationToggle`
3. Click "Enable Notifications"
4. Browser will ask for permission - click "Allow"
5. You should see "Successfully subscribed to push notifications!"

### Step 3: Verify in Database

```bash
./vendor/bin/sail artisan tinker
```

```php
\App\Models\PushSubscription::all();
// Should show your subscription with endpoint and keys
```

---

## Test 2: Send Push Notification from Backend

### Option A: Using Tinker (Quick Test)

```bash
./vendor/bin/sail artisan tinker
```

```php
use App\Http\Controllers\PushNotificationController;

// Get your user ID
$user = auth()->user();
$userId = $user->id;

// Send a test notification
PushNotificationController::sendNotification(
    $userId,
    'Test Notification',
    'This is a test push notification!',
    ['url' => '/']
);
```

**Expected Result:** You should receive a native browser notification even if the app tab is in the background!

### Option B: Create a Test Route

Add to `routes/web.php`:

```php
Route::middleware('auth')->get('/test-push', function () {
    \App\Http\Controllers\PushNotificationController::sendNotification(
        auth()->id(),
        'Test Notification',
        'This is a test push notification!',
        ['url' => '/']
    );
    return redirect()->back()->with('success', 'Notification sent!');
});
```

Then visit `/test-push` in your browser.

### Option C: Create a Test Command

```bash
./vendor/bin/sail artisan make:command TestPushNotification
```

In the command:

```php
use App\Http\Controllers\PushNotificationController;

public function handle()
{
    $userId = $this->argument('user_id') ?? auth()->id();

    PushNotificationController::sendNotification(
        $userId,
        'Test Notification',
        'This is a test push notification!',
        ['url' => '/']
    );

    $this->info('Notification sent!');
}
```

Run with:

```bash
./vendor/bin/sail artisan test:push {user_id}
```

---

## Test 3: Pusher WebSocket Notifications

### Step 1: Verify Pusher is Connected

1. Open browser DevTools → Console
2. Check for: `Service Worker registered` and `Echo is available`
3. If you see "Echo is not available", check your Pusher credentials

### Step 2: Create a Test Broadcast Event

Create a test event:

```bash
./vendor/bin/sail artisan make:event TestNotificationEvent
```

In `app/Events/TestNotificationEvent.php`:

```php
<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TestNotificationEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $userId;
    public $title;
    public $body;

    public function __construct($userId, $title, $body)
    {
        $this->userId = $userId;
        $this->title = $title;
        $this->body = $body;
    }

    public function broadcastOn()
    {
        return new PrivateChannel('App.Models.User.' . $this->userId);
    }

    public function broadcastAs()
    {
        return 'notification';
    }

    public function broadcastWith()
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
            'icon' => '/android-chrome-192x192.png',
            'data' => ['url' => '/']
        ];
    }
}
```

### Step 3: Broadcast the Event

```bash
./vendor/bin/sail artisan tinker
```

```php
use App\Events\TestNotificationEvent;

event(new TestNotificationEvent(
    auth()->id(),
    'Pusher Test',
    'This notification came from Pusher!'
));
```

**Expected Result:** You should see a native notification appear (if app is open and permission is granted).

---

## Test 4: Notification When App is Closed

1. Subscribe to push notifications (Test 1)
2. Close the browser tab/window completely
3. Send a notification from backend (Test 2, Option A)
4. **Expected Result:** Notification should appear even though the app is closed!

---

## Troubleshooting

### "Service Worker registration failed"

- Check that `public/sw.js` exists
- Check browser console for errors
- Make sure you're on HTTPS or localhost

### "VAPID keys not configured"

- Check `.env` has `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
- Restart your dev server after adding env vars

### "Echo is not available"

- Check Pusher credentials in `.env`
- Make sure `BROADCAST_DRIVER=pusher`
- Check browser console for connection errors

### "Permission denied"

- User must click "Allow" when browser asks for notification permission
- Check browser settings if permission was previously denied

### Notifications not appearing

- Check browser notification settings
- Check service worker is registered (DevTools → Application → Service Workers)
- Check browser console for errors

---

## Quick Test Script

Create `test-push.php` in your project root:

```php
<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Http\Controllers\PushNotificationController;

$userId = $argv[1] ?? 1; // User ID from command line

PushNotificationController::sendNotification(
    $userId,
    'Test Notification',
    'This is a test!',
    ['url' => '/']
);

echo "Notification sent to user $userId\n";
```

Run with:

```bash
php test-push.php 1
```
