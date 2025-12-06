import { usePage } from "@inertiajs/vue3";
import { onMounted, onUnmounted, ref, watch } from "vue";

export function useUnreadNotifications() {
  const unreadCount = ref(0);
  const notificationsChannel = ref(null);
  const page = usePage();

  unreadCount.value = page.props.unread_notifications_count || 0;

  const setupEchoListener = () => {
    const user = page.props.auth?.user;
    if (!user || !user.id || !window.Echo) {
      setTimeout(setupEchoListener, 500);
      return;
    }

    notificationsChannel.value = window.Echo.private(`App.Models.User.${user.id}`);

    notificationsChannel.value.notification(() => {
      unreadCount.value++;
    });
  };

  const cleanup = () => {
    const user = page.props.auth?.user;
    if (notificationsChannel.value && window.Echo && user) {
      try {
        window.Echo.leave(`App.Models.User.${user.id}`);
      } catch (error) {
      }
      notificationsChannel.value = null;
    }
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
    setupEchoListener();
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    unreadCount,
  };
}

