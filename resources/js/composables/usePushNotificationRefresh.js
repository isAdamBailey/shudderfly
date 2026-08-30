import { onPushNotification } from "@/utils/pushNotificationBridge";
import { onMounted, onUnmounted } from "vue";

/**
 * Run `callback` when a push notification lands, so the page can refresh
 * itself instead of waiting for the user to reload.
 *
 * Two triggers, because neither alone is enough:
 *
 * - the service worker's `message` (see `@/utils/pushNotificationBridge`),
 *   which covers a page that is open and running; and
 * - the page becoming visible again, which covers the common mobile case where
 *   the push arrived while the tab was frozen and the message never got
 *   delivered -- returning to the app is then the first moment the page can
 *   act on it.
 *
 * @param {(payload: {type: string, notification?: object}) => void} callback
 * @param {{ refreshOnVisible?: boolean }} options
 */
export function usePushNotificationRefresh(callback, options = {}) {
    const { refreshOnVisible = true } = options;

    let unsubscribe = null;

    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            callback({ type: "page-visible" });
        }
    };

    onMounted(() => {
        unsubscribe = onPushNotification(callback);

        if (refreshOnVisible && typeof document !== "undefined") {
            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        }
    });

    onUnmounted(() => {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        if (refreshOnVisible && typeof document !== "undefined") {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        }
    });
}
