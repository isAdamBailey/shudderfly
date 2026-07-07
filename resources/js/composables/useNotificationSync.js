/* global route */
import { useUnreadNotifications } from "@/composables/useUnreadNotifications";
import { router } from "@inertiajs/vue3";
import axios from "axios";
import { reactive } from "vue";

// Module-level (singleton) state so every component that calls this composable
// shares the same read-state map, keeping the notifications dropdown and the
// dashboard's "unread" lists in sync without either needing to know about the
// other.
const readAt = reactive({});

export function useNotificationSync() {
    const { unreadCount } = useUnreadNotifications();

    const isRead = (id) => Boolean(readAt[id]);

    const markAsRead = async (id) => {
        if (readAt[id]) return;

        readAt[id] = new Date().toISOString();
        if (unreadCount.value > 0) {
            unreadCount.value--;
        }

        try {
            await axios.post(route("notifications.read", id));
            router.reload({ only: ["unread_notifications_count"] });
        } catch (error) {
            delete readAt[id];
            unreadCount.value++;
            console.error("Failed to mark notification as read:", error);
        }
    };

    const markAllAsRead = async (ids = []) => {
        const now = new Date().toISOString();
        ids.forEach((id) => {
            readAt[id] = now;
        });
        unreadCount.value = 0;

        try {
            await axios.post(route("notifications.read-all"));
            router.reload({ only: ["unread_notifications_count"] });
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    };

    return { readAt, isRead, markAsRead, markAllAsRead };
}
