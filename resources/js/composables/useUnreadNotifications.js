import { userChannelName } from "@/utils/broadcastChannel";
import { onNotificationRefresh } from "@/utils/notificationRefresh";
import { router, usePage } from "@inertiajs/vue3";
import throttle from "lodash/throttle";
import { effectScope, onScopeDispose, ref, watch } from "vue";

// The bell is one thing on the page, so this is one piece of state shared by
// every consumer rather than a copy each. Navigation renders it, NotificationList
// reads it, and useNotificationSync decrements it optimistically — with a copy
// each, that decrement was invisible until a server round-trip caught the others
// up, and each copy also opened its own subscription to the same Echo channel.
const unreadCount = ref(0);
const isNewNotification = ref(false);

const NEW_NOTIFICATION_ANIMATION_MS = 4000;
const ECHO_RETRY_MS = 500;
const ECHO_MAX_RETRIES = 10;
const REFRESH_THROTTLE_MS = 150;

let consumers = 0;
let sharedPage = null;
let scope = null;
let animationTimer = null;
let echoRetryTimer = null;
let echoRetries = 0;
let notificationsChannel = null;
let unsubscribeRefresh = null;

/**
 * Re-read the count from the server. Trailing-edge throttled because a push and
 * the tab regaining focus routinely land together, and each partial reload
 * re-runs the whole route server-side.
 */
export const refreshUnreadCount = throttle(
    () => router.reload({ only: ["unread_notifications_count"] }),
    REFRESH_THROTTLE_MS,
    { leading: false }
);

const flagNewNotification = () => {
    isNewNotification.value = true;
    if (animationTimer) clearTimeout(animationTimer);
    animationTimer = setTimeout(() => {
        isNewNotification.value = false;
    }, NEW_NOTIFICATION_ANIMATION_MS);
};

/**
 * Drop the channel and any retry still trying to open one.
 *
 * Echo is loaded by a dynamic import in bootstrap.js, so on a cold page
 * listenToEcho is usually still mid-retry. Without cancelling that, a user
 * change during the window leaves the old retry chain running alongside the new
 * one and the count ends up incremented twice per notification.
 */
const stopListeningToEcho = (userId) => {
    if (echoRetryTimer) {
        clearTimeout(echoRetryTimer);
        echoRetryTimer = null;
    }
    echoRetries = 0;

    if (!notificationsChannel || !window.Echo || !userId) return;
    try {
        window.Echo.leave(userChannelName(userId));
    } catch {
        // Already gone; nothing to do.
    }
    notificationsChannel = null;
};

const listenToEcho = (page) => {
    const user = page.props.auth?.user;
    if (!user?.id || !window.Echo) {
        if (echoRetries < ECHO_MAX_RETRIES) {
            echoRetries++;
            echoRetryTimer = setTimeout(
                () => listenToEcho(page),
                ECHO_RETRY_MS
            );
        }
        return;
    }

    if (echoRetryTimer) {
        clearTimeout(echoRetryTimer);
        echoRetryTimer = null;
    }
    echoRetries = 0;

    notificationsChannel = window.Echo.private(userChannelName(user.id));
    notificationsChannel.notification(() => {
        unreadCount.value++;
        flagNewNotification();
    });
};

const start = (page) => {
    sharedPage = page;
    scope = effectScope(true);
    scope.run(() => {
        watch(
            () => [
                page.props.auth?.user,
                page.props.unread_notifications_count,
            ],
            ([newUser, newCount], [oldUser, oldCount] = []) => {
                if (newUser?.id !== oldUser?.id) {
                    stopListeningToEcho(oldUser?.id ?? newUser?.id);
                    unreadCount.value = newUser?.id ? newCount || 0 : 0;
                    if (newUser?.id) listenToEcho(page);
                } else if (newCount !== oldCount) {
                    unreadCount.value = newCount || 0;
                }
            },
            { immediate: true }
        );
    });

    // A push notification is the only signal an open-but-asleep tab gets: its
    // Echo websocket is exactly what the browser drops while the tab is
    // backgrounded. Pull the authoritative count from the server so the bell's
    // unread dot appears without a manual refresh.
    unsubscribeRefresh = onNotificationRefresh((reason) => {
        if (reason === "push") {
            flagNewNotification();
        }
        refreshUnreadCount();
    });
};

const stop = () => {
    scope?.stop();
    scope = null;

    if (unsubscribeRefresh) {
        unsubscribeRefresh();
        unsubscribeRefresh = null;
    }

    refreshUnreadCount.cancel();

    clearTimeout(animationTimer);
    animationTimer = null;

    stopListeningToEcho(sharedPage?.props.auth?.user?.id);
    sharedPage = null;
    isNewNotification.value = false;
};

export function useUnreadNotifications() {
    const page = usePage();

    if (consumers === 0) {
        start(page);
    }
    consumers++;

    onScopeDispose(() => {
        consumers--;
        if (consumers === 0) {
            stop();
        }
    });

    return {
        unreadCount,
        isNewNotification,
    };
}
