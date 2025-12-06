import { usePage } from "@inertiajs/vue3";
import { onMounted, onUnmounted, ref } from "vue";

export function usePusherNotifications() {
  const channel = ref(null);
  const retryTimeout = ref(null);
  const maxRetries = 10;
  const retryCount = ref(0);

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
    } catch (error) {
      return;
    }

    channel.value.notification((notification) => {
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
      } catch (error) {
        // Silently fail
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

  return {
    setupNotifications,
    cleanup
  };
}
