// Service Worker for Push Notifications
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

            return self.registration.showNotification(title, options);
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

