import { usePage } from "@inertiajs/vue3";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { onMounted, onUnmounted, ref } from "vue";

/**
 * Composable for handling Pusher push notifications.
 * 
 * This composable automatically sets up and cleans up notification listeners
 * via Vue lifecycle hooks (onMounted/onUnmounted). It does not return any values.
 * 
 * Usage:
 *   import { usePusherNotifications } from "@/composables/usePusherNotifications";
 *   usePusherNotifications(); // Automatically handles setup and cleanup
 * 
 * The composable will:
 * - Subscribe to the user's private notification channel on mount
 * - Display browser notifications when notifications are received
 * - Clean up the channel subscription on unmount
 */
export function usePusherNotifications() {
  const { setFlashMessage } = useFlashMessage();
  const channel = ref(null);
  const retryTimeout = ref(null);
  const maxRetries = 10;
  const retryCount = ref(0);

  const getInteractionFlashMessage = (notification, recipientName) => {
    if (!notification || !recipientName) {
      return null;
    }

    if (notification.type === "App\\Notifications\\UserTagged") {
      const senderName = notification.data?.tagger_name;
      return senderName
        ? `${recipientName}, you received a message from ${senderName}`
        : null;
    }

    if (notification.type === "App\\Notifications\\MessageCommented") {
      const senderName = notification.data?.commenter_name;
      return senderName
        ? `${recipientName}, you received a reply from ${senderName}`
        : null;
    }

    return null;
  };

  const setupNotifications = () => {
    if (!window.Echo) {
      if (retryCount.value < maxRetries) {
        retryCount.value++;
        retryTimeout.value = setTimeout(() => {
          setupNotifications();
        }, 500);
      }
      return;
    }

    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value);
      retryTimeout.value = null;
    }

    const page = usePage();
    const user = page.props.auth?.user;
    
    if (!user || !user.id) {
      return;
    }

    try {
      channel.value = window.Echo.private(`App.Models.User.${user.id}`);
    } catch {
      return;
    }

    channel.value.notification((notification) => {
      const flashMessage = getInteractionFlashMessage(notification, user.name);
      if (flashMessage) {
        setFlashMessage("info", flashMessage, 5000);
      }

      if ("Notification" in window && Notification.permission === "granted") {
        const notificationData = {
          ...(notification.data || {}),
          url: notification.data?.url || notification.url || '/messages'
        };

        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.getRegistration().then(registration => {
            if (registration) {
              registration.showNotification(notification.title || 'Notification', {
                body: notification.body || '',
                icon: notification.icon || "/android-chrome-192x192.png",
                data: notificationData
              }).catch(() => {
                const fallbackNotification = new Notification(notification.title || 'Notification', {
                  body: notification.body || '',
                  icon: notification.icon || "/android-chrome-192x192.png",
                  data: notificationData
                });
                fallbackNotification.onclick = () => {
                  window.focus();
                  window.location.href = notificationData.url;
                };
              });
            } else {
              const fallbackNotification = new Notification(notification.title || 'Notification', {
                body: notification.body || '',
                icon: notification.icon || "/android-chrome-192x192.png",
                data: notificationData
              });
              fallbackNotification.onclick = () => {
                window.focus();
                window.location.href = notificationData.url;
              };
            }
          });
        } else {
          const fallbackNotification = new Notification(notification.title || 'Notification', {
            body: notification.body || '',
            icon: notification.icon || "/android-chrome-192x192.png",
            data: notificationData
          });
          fallbackNotification.onclick = () => {
            window.focus();
            window.location.href = notificationData.url;
          };
        }
      }
    });
  };

  const cleanup = () => {
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value);
      retryTimeout.value = null;
    }

    if (channel.value && window.Echo) {
      try {
        window.Echo.leave(`App.Models.User.${usePage().props.auth?.user?.id}`);
      } catch {
      }
      channel.value = null;
    }
  };

  onMounted(() => {
    setupNotifications();
  });

  onUnmounted(() => {
    cleanup();
  });
}
