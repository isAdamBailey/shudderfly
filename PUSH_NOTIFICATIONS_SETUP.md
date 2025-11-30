# Push Notifications Setup Guide

This guide explains how to set up native push notifications that work with Pusher/WebSockets.

## Overview

The system uses the **Web Push API** to send native browser notifications. When a Pusher event is received, you can trigger a native notification even when the app is closed.

## Setup Steps

### 1. Install Web Push Package

```bash
./vendor/bin/sail composer require minishlink/web-push
```

### 2. Generate VAPID Keys

You need to generate VAPID (Voluntary Application Server Identification) keys for push notifications:

```bash
# Generate keys using Node.js (if you have it installed)
npx web-push generate-vapid-keys

# Or use this PHP script:
php -r "echo 'Public Key: ' . base64_encode(random_bytes(32)) . PHP_EOL; echo 'Private Key: ' . base64_encode(random_bytes(32)) . PHP_EOL;"
```

### 3. Add to .env

Add the VAPID keys to your `.env` file:

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

Also add to your frontend `.env` (or pass via Vite):

```env
VITE_VAPID_PUBLIC_KEY=your_public_key_here
```

### 4. Run Migration

```bash
./vendor/bin/sail artisan migrate
```

### 5. Enable Pusher (if not already)

Uncomment the Pusher setup in `resources/js/bootstrap.js` and install dependencies:

```bash
npm install laravel-echo pusher-js
```

## Usage

### Frontend: Subscribe to Push Notifications

In any Vue component:

```vue
<script setup>
import { usePushNotifications } from '@/composables/usePushNotifications';

const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
</script>

<template>
  <button v-if="isSupported && !isSubscribed" @click="subscribe">
    Enable Notifications
  </button>
  <button v-else-if="isSubscribed" @click="unsubscribe">
    Disable Notifications
  </button>
</template>
```

### Frontend: Listen to Pusher Events and Show Notifications

In `resources/js/bootstrap.js` or a component:

```javascript
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;
window.Echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY,
    // ... other config
});

// Listen to private channel for user
window.Echo.private(`App.Models.User.${userId}`)
    .notification((notification) => {
        // Show native notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.body,
                icon: notification.icon || '/android-chrome-192x192.png',
                data: notification.data,
            });
        }
    });
```

### Backend: Send Push Notification from Laravel

When a Pusher event occurs, you can send a push notification:

```php
use App\Http\Controllers\PushNotificationController;

// In your event listener, job, or controller
PushNotificationController::sendNotification(
    $userId,
    'New Message',
    'You have a new message',
    ['url' => '/messages/123']
);
```

### Backend: Send Notification from Broadcast Event

In your Laravel event that implements `ShouldBroadcast`:

```php
use App\Http\Controllers\PushNotificationController;

public function broadcastOn()
{
    return new PrivateChannel('App.Models.User.' . $this->userId);
}

public function handle()
{
    // After broadcasting, also send push notification
    PushNotificationController::sendNotification(
        $this->userId,
        $this->title,
        $this->body,
        $this->data
    );
}
```

## How It Works

1. **User subscribes**: Frontend requests notification permission and subscribes via the Web Push API
2. **Subscription stored**: Backend stores the subscription in the database
3. **Pusher event received**: When a Pusher event arrives, the frontend can show a notification
4. **Backend push**: The backend can also send push notifications directly (works even when app is closed)
5. **Service Worker**: The service worker (`public/sw.js`) handles receiving and displaying notifications

## Testing

1. Enable notifications in your browser
2. Subscribe via the UI
3. Send a test notification from Laravel:
   ```php
   PushNotificationController::sendNotification(
       auth()->id(),
       'Test',
       'This is a test notification'
   );
   ```

## Notes

- Push notifications work even when the browser/app is closed
- Requires HTTPS in production (localhost works for development)
- Service worker must be registered and active
- User must grant notification permission

