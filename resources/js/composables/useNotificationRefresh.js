import { onNotificationRefresh } from "@/utils/notificationRefresh";
import { onScopeDispose } from "vue";

/**
 * Component-scoped subscription to {@link onNotificationRefresh}.
 */
export function useNotificationRefresh(callback) {
    onScopeDispose(onNotificationRefresh(callback));
}
