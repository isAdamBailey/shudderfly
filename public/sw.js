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

// Tell every open page about a push so the notification bell and the
// notifications list refresh themselves. Without this an already-open tab only
// learns about the notification through Echo, which is exactly the channel that
// is unavailable when the tab has been backgrounded long enough for the browser
// to drop the websocket -- the case a push notification exists to cover.
async function postToClients(payload) {
    try {
        const clientList = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
        });

        clientList.forEach(function (client) {
            try {
                client.postMessage(payload);
            } catch (error) {
                // A client that went away between matchAll() and postMessage()
                // is not something we can do anything about.
            }
        });
    } catch (error) {
        // Reaching open pages is a bonus; never let it fail the push handler.
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

            // The banner comes first: telling open pages is what makes the
            // bell update, but it must never cost the notification itself.
            await self.registration.showNotification(title, options);

            await postToClients({
                type: 'push-notification',
                notification: {
                    title: title,
                    body: options.body,
                    tag: options.tag,
                    data: options.data,
                },
            });
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
                    // Focusing an already-open page does not navigate, so
                    // nothing would otherwise refresh what it is showing.
                    try {
                        client.postMessage({
                            type: 'notification-click',
                            notification: { data: notificationData },
                        });
                    } catch (error) {
                        // Ignore: focusing still works.
                    }
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

