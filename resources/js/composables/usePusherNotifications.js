import { userChannelName } from "@/utils/broadcastChannel";
import { usePage } from "@inertiajs/vue3";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { useTranslations } from "@/composables/useTranslations";
import { onMounted, onUnmounted, ref } from "vue";

/**
 * Composable for handling Pusher push notifications.
 *
 * This composable automatically sets up and cleans up notification listeners
 * via Vue lifecycle hooks (onMounted/onUnmounted). It does not return any values.
 *
 * Usage:
 *   import { usePusherNotifications } from "@/composables/usePusherNotifications";
 *   usePusherNotifications(); // Automatically handles setup and cleanup
 *
 * The composable will:
 * - Subscribe to the user's private notification channel on mount
 * - Show (and speak) an in-app flash message when a notification is received
 * - Clean up the channel subscription on unmount
 *
 * It deliberately does NOT raise an OS/browser notification: Web Push owns that
 * layer, and doing both here gave the user two banners plus the flash for a
 * single action.
 */
export function usePusherNotifications() {
    const { setFlashMessage } = useFlashMessage();
    const { t } = useTranslations();
    const channel = ref(null);
    const retryTimeout = ref(null);
    const maxRetries = 10;
    const retryCount = ref(0);

    const getInteractionFlashMessage = (notification, recipientName) => {
        if (!notification || !recipientName) {
            return null;
        }

        // Keep these short — the flash message is read aloud, so the full
        // message/comment text is deliberately left out.
        if (notification.type === "App\\Notifications\\UserTagged") {
            const senderName = notification.data?.tagger_name;
            if (!senderName) return null;
            return t("notifications.message_flash", {
                recipient: recipientName,
                sender: senderName,
            });
        }

        if (notification.type === "App\\Notifications\\MessageCommented") {
            const senderName = notification.data?.commenter_name;
            if (!senderName) return null;
            return t("notifications.reply_flash", {
                recipient: recipientName,
                sender: senderName,
            });
        }

        if (notification.type === "App\\Notifications\\MessageReacted") {
            const senderName = notification.data?.reactor_name;
            if (!senderName) return null;
            return t("notifications.reaction_flash", {
                recipient: recipientName,
                sender: senderName,
            });
        }

        return null;
    };

    const recentNotificationIds = new Set();

    const isDuplicateNotification = (notification) => {
        const id = notification?.id;
        if (!id) return false;
        if (recentNotificationIds.has(id)) return true;
        recentNotificationIds.add(id);
        setTimeout(() => recentNotificationIds.delete(id), 30000);
        return false;
    };

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
            channel.value = window.Echo.private(userChannelName(user.id));
        } catch {
            return;
        }

        channel.value.notification((notification) => {
            if (isDuplicateNotification(notification)) return;

            const flashMessage = getInteractionFlashMessage(
                notification,
                user.name
            );
            if (flashMessage) {
                setFlashMessage("info", flashMessage, 5000);
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
                window.Echo.leave(
                    userChannelName(usePage().props.auth?.user?.id)
                );
            } catch {}
            channel.value = null;
        }
    };

    onMounted(() => {
        setupNotifications();
    });

    onUnmounted(() => {
        cleanup();
    });
}
