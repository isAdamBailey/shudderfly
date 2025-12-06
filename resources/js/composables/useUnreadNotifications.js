import { usePage } from "@inertiajs/vue3";
import { onMounted, onUnmounted, ref, watch } from "vue";

export function useUnreadNotifications() {
  const unreadCount = ref(0);
  const notificationsChannel = ref(null);
  const retryTimeout = ref(null);
  const maxRetries = 10;
  const retryCount = ref(0);
  const page = usePage();

  unreadCount.value = page.props.unread_notifications_count || 0;

  const setupEchoListener = () => {
    const user = page.props.auth?.user;
    if (!user || !user.id || !window.Echo) {
      if (retryCount.value < maxRetries) {
        retryCount.value++;
        retryTimeout.value = setTimeout(() => {
          setupEchoListener();
        }, 500);
      }
      return;
    }

    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value);
      retryTimeout.value = null;
    }
    retryCount.value = 0;

    notificationsChannel.value = window.Echo.private(
      `App.Models.User.${user.id}`
    );

    notificationsChannel.value.notification(() => {
      unreadCount.value++;
    });
  };

  const cleanup = () => {
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value);
      retryTimeout.value = null;
    }

    const user = page.props.auth?.user;
    if (notificationsChannel.value && window.Echo && user) {
      try {
        window.Echo.leave(`App.Models.User.${user.id}`);
      } catch {}
      notificationsChannel.value = null;
    }
    retryCount.value = 0;
  };

  watch(
    () => [page.props.auth?.user, page.props.unread_notifications_count],
    ([newUser, newCount], [oldUser, oldCount] = []) => {
      if (newUser?.id !== oldUser?.id) {
        cleanup();
        if (newUser?.id) {
          unreadCount.value = newCount || 0;
          setupEchoListener();
        } else {
          unreadCount.value = 0;
        }
      } else if (newCount !== oldCount) {
        unreadCount.value = newCount || 0;
      }
    },
    { immediate: true }
  );

  onMounted(() => {
    // Only setup if not already set up by the watch (which runs with immediate: true)
    // This prevents duplicate listeners when user is already authenticated on mount
    const user = page.props.auth?.user;
    if (user?.id && !notificationsChannel.value && window.Echo) {
      setupEchoListener();
    }
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    unreadCount
  };
}
