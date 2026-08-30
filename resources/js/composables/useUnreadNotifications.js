import { usePushNotificationRefresh } from "@/composables/usePushNotificationRefresh";
import { userChannelName } from "@/utils/broadcastChannel";
import { router, usePage } from "@inertiajs/vue3";
import { onMounted, onUnmounted, ref, watch } from "vue";

// Several components read the unread count, so a single push has to cost a
// single partial reload rather than one per component. The debounce also
// collapses the burst you get when a push and its Echo event land together.
const REFRESH_DEBOUNCE_MS = 150;

let refreshTimer = null;

const refreshUnreadCount = () => {
    if (refreshTimer) return;

    refreshTimer = setTimeout(() => {
        refreshTimer = null;
        router.reload({ only: ["unread_notifications_count"] });
    }, REFRESH_DEBOUNCE_MS);
};

export function useUnreadNotifications() {
    const unreadCount = ref(0);
    const isNewNotification = ref(false);
    const animationTimer = ref(null);
    const notificationsChannel = ref(null);
    const retryTimeout = ref(null);
    const maxRetries = 10;
    const retryCount = ref(0);
    const page = usePage();

    unreadCount.value = page.props.unread_notifications_count || 0;

    const flagNewNotification = () => {
        isNewNotification.value = true;
        if (animationTimer.value) clearTimeout(animationTimer.value);
        animationTimer.value = setTimeout(() => {
            isNewNotification.value = false;
        }, 4000);
    };

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
            userChannelName(user.id)
        );

        notificationsChannel.value.notification(() => {
            unreadCount.value++;
            flagNewNotification();
        });
    };

    const cleanup = () => {
        if (retryTimeout.value) {
            clearTimeout(retryTimeout.value);
            retryTimeout.value = null;
        }
        if (animationTimer.value) {
            clearTimeout(animationTimer.value);
            animationTimer.value = null;
        }

        const user = page.props.auth?.user;
        if (notificationsChannel.value && window.Echo && user) {
            try {
                window.Echo.leave(userChannelName(user.id));
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

    // A push notification is the only signal an open-but-asleep tab gets: its
    // Echo websocket is exactly what the browser drops while the tab is
    // backgrounded. Pull the authoritative count from the server so the bell's
    // unread dot appears without a manual refresh.
    usePushNotificationRefresh((payload) => {
        if (payload?.type === "push-notification") {
            flagNewNotification();
        }
        refreshUnreadCount();
    });

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
        unreadCount,
        isNewNotification,
    };
}
