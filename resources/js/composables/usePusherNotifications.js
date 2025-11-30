import { onMounted, onUnmounted } from "vue";
import { usePage } from "@inertiajs/vue3";

export function usePusherNotifications() {
  let channel = null;

  const setupNotifications = () => {
    // Check if Echo is available and user is authenticated
    if (!window.Echo) {
      console.warn("Echo is not available");
      return;
    }

    const user = usePage().props.auth?.user;
    if (!user || !user.id) {
      console.warn("User is not authenticated");
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
    if (channel) {
      window.Echo.leave(`App.Models.User.${usePage().props.auth?.user?.id}`);
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

