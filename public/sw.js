// Service Worker for Push Notifications

// Take over as soon as a new version of this file is deployed. Without this a
// worker sits in "waiting" until every tab is closed, which on an installed PWA
// can be weeks -- and until then pushes are still handled by the old worker.
self.addEventListener('install', function() {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

// Tell every open page that its notifications changed, so the bell and the
// notifications list refresh themselves. Without this an already-open tab only
// learns about the notification through Echo, which is exactly the channel that
// is unavailable when the tab has been backgrounded long enough for the browser
// to drop the websocket -- the case a push notification exists to cover.
//
// Only the type is sent: pages re-fetch from the server, so a copy of the
// notification here would just be a second, staler source of the same truth.
async function postToClients(type) {
    try {
        const clientList = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
        });

        clientList.forEach(function (client) {
            client.postMessage({ type: type });
        });
    } catch (error) {
        // Reaching open pages is a bonus; never let it fail the caller.
    }
}

self.addEventListener('push', function(event) {
    event.waitUntil(
        (async () => {
            let data = {};
            try {
                if (event.data) {
                    data = await event.data.json();
                }
            } catch (error) {
                // Try to get text data as fallback
                try {
                    const text = await event.data.text();
                    data = JSON.parse(text);
                } catch (parseError) {
                    // Silently fail - use defaults
                }
            }
            
            const title = data.title || 'Notification';
            const options = {
                body: data.body || '',
                icon: data.icon || '/android-chrome-192x192.png',
                badge: data.badge || '/android-chrome-192x192.png',
                image: data.image,
                data: data.data || {},
                tag: data.tag || 'default',
                requireInteraction: data.requireInteraction || false,
                actions: data.actions || [],
                vibrate: data.vibrate || [200, 100, 200],
            };

            await Promise.all([
                self.registration.showNotification(title, options),
                postToClients('push-notification'),
            ]);
        })()
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const notificationData = event.notification.data || {};
    const urlToOpen = notificationData.url || '/';
    
    // Convert relative URLs to absolute
    let absoluteUrlToOpen;
    try {
        absoluteUrlToOpen = new URL(urlToOpen, self.location.origin).href;
    } catch (e) {
        // If URL parsing fails, use the origin
        absoluteUrlToOpen = self.location.origin + urlToOpen;
    }

    event.waitUntil(
        self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            // Check if there's already a window/tab open with the target URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                // Normalize client URL for comparison (remove hash/fragment if present)
                const clientUrl = new URL(client.url);
                const targetUrl = new URL(absoluteUrlToOpen);
                // Compare origin and pathname (ignore hash and search params for matching)
                if (clientUrl.origin === targetUrl.origin && 
                    clientUrl.pathname === targetUrl.pathname && 
                    'focus' in client) {
                    // Focusing an already-visible page does not navigate and
                    // fires no visibilitychange, so nothing else would tell it
                    // to refresh.
                    client.postMessage({ type: 'notification-click' });
                    return client.focus();
                }
            }
            // If not, open a new window/tab
            // Use absolute URL since openWindow requires absolute URLs
            if (self.clients.openWindow) {
                return self.clients.openWindow(absoluteUrlToOpen);
            }
        })
    );
});

