// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
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

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            // Check if there's already a window/tab open with the target URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window/tab
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

