import { usePage } from "@inertiajs/vue3";
import { onMounted, onUnmounted, ref } from "vue";

export function usePusherNotifications() {
  let channel = null;
  let retryTimeout = null;
  const maxRetries = 10;
  // Use ref to ensure each composable instance has its own retry count
  const retryCount = ref(0);

  const setupNotifications = () => {
    // Check if Echo is available and user is authenticated
    if (!window.Echo) {
      // Echo is initialized asynchronously, retry if not available yet
      if (retryCount.value < maxRetries) {
        retryCount.value++;
        retryTimeout = setTimeout(() => {
          setupNotifications();
        }, 500);
      }
      return;
    }

    // Clear any pending retry
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }

    const user = usePage().props.auth?.user;
    if (!user || !user.id) {
      return;
    }

    // Subscribe to user's private channel
    channel = window.Echo.private(`App.Models.User.${user.id}`);

    // Listen for notifications
    channel.notification((notification) => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon || "/android-chrome-192x192.png",
          data: notification.data
        });
      }
    });
  };

  const cleanup = () => {
    // Clear any pending retry
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }

    if (channel && window.Echo) {
      try {
        window.Echo.leave(`App.Models.User.${usePage().props.auth?.user?.id}`);
      } catch (error) {
        // Silently fail
      }
      channel = null;
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
