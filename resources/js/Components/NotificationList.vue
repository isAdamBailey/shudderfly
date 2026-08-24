<template>
    <div class="max-h-96 overflow-y-auto bg-white dark:bg-gray-800">
        <div
            class="px-4 py-3 border-b border-indigo-100 dark:border-gray-700 bg-gradient-to-b from-indigo-50/70 to-transparent dark:from-gray-900/40"
        >
            <h2
                class="font-heading text-xl tracking-wide text-indigo-700 dark:text-amber-400 flex items-center gap-2"
            >
                Notifications
                <span
                    v-if="unreadCount > 0"
                    class="px-2 py-0.5 text-xs font-bold text-amber-100 bg-orange-700 rounded-full shadow-sm"
                >
                    {{ unreadCount }}
                </span>
            </h2>
        </div>
        <div
            class="px-4 py-2.5 flex items-center justify-between border-b border-indigo-100 dark:border-gray-700 bg-indigo-50/50 dark:bg-gray-900/30"
        >
            <SpeakButton
                v-if="notifications.length > 0"
                :disabled="speaking"
                aria-label="Speak unread notifications summary"
                icon-class="ri-speak-fill text-lg"
                @click.stop="speakSummary"
            />
            <button
                v-if="unreadCount > 0"
                type="button"
                class="btn-bulge px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-button bg-theme-primary hover:bg-theme-button active:bg-theme-button-active active:text-theme-button-active rounded-md shadow-sm transition-colors"
                @click.stop="markAllAsRead"
            >
                Clear all
            </button>
        </div>
        <div class="p-3 space-y-2">
            <div
                v-if="loading"
                class="text-center py-4 text-gray-500 dark:text-gray-400"
            >
                Loading notifications...
            </div>

            <div
                v-else-if="notifications.length === 0"
                class="text-center py-8 text-gray-500 dark:text-gray-400"
            >
                No notifications yet.
            </div>

            <div v-else class="space-y-2">
                <div
                    v-for="notification in notifications"
                    :key="notification.id"
                    :class="[
                        'p-2.5 rounded-lg border cursor-pointer transition-colors',
                        notification.read_at
                            ? 'bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                            : 'bg-amber-50 dark:bg-indigo-900/30 border-amber-200 dark:border-indigo-700/60 shadow-sm hover:bg-amber-100 dark:hover:bg-indigo-900/50',
                    ]"
                    @click="handleNotificationClick(notification)"
                >
                    <div>
                        <div class="mb-2">
                            <div
                                v-if="
                                    notification.type ===
                                    'App\\Notifications\\UserTagged'
                                "
                                class="text-gray-900 dark:text-gray-100"
                            >
                                <div class="flex items-center gap-2 mb-1">
                                    <Avatar
                                        class="ring-2 ring-white dark:ring-gray-800"
                                        :avatar="
                                            notification.data.tagger_avatar
                                        "
                                        :user="{
                                            id: notification.data.tagger_id,
                                            name: notification.data.tagger_name,
                                        }"
                                        size="sm"
                                    />
                                    <div
                                        class="flex items-center gap-1.5 flex-wrap"
                                    >
                                        <strong>{{
                                            notification.data.tagger_name
                                        }}</strong>
                                        <span class="text-sm">tagged you:</span>
                                        <span
                                            v-if="!notification.read_at"
                                            class="inline-block w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_4px_1px_rgba(245,158,11,0.55)]"
                                        ></span>
                                    </div>
                                </div>
                                <p
                                    class="text-sm text-gray-700 dark:text-gray-300 italic ml-8 mb-1"
                                >
                                    "{{
                                        stripGameShareSlugMarker(
                                            notificationBodyText(notification)
                                        )
                                    }}"
                                </p>
                            </div>
                            <div
                                v-else-if="
                                    notification.type ===
                                    'App\\Notifications\\MessageCommented'
                                "
                                class="text-gray-900 dark:text-gray-100"
                            >
                                <div class="flex items-center gap-2 mb-1">
                                    <Avatar
                                        class="ring-2 ring-white dark:ring-gray-800"
                                        :avatar="
                                            notification.data.commenter_avatar
                                        "
                                        :user="{
                                            id: notification.data.commenter_id,
                                            name: notification.data
                                                .commenter_name,
                                        }"
                                        size="sm"
                                    />
                                    <div
                                        class="flex items-center gap-1.5 flex-wrap"
                                    >
                                        <strong>{{
                                            notification.data.commenter_name
                                        }}</strong>
                                        <span class="text-sm"
                                            >commented on your message:</span
                                        >
                                        <span
                                            v-if="!notification.read_at"
                                            class="inline-block w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_4px_1px_rgba(245,158,11,0.55)]"
                                        ></span>
                                    </div>
                                </div>
                                <p
                                    class="text-sm text-gray-700 dark:text-gray-300 italic ml-8 mb-1"
                                >
                                    "{{
                                        stripGameShareSlugMarker(
                                            notification.data.message
                                        )
                                    }}"
                                </p>
                                <p
                                    v-if="notification.data.comment"
                                    class="text-sm text-gray-600 dark:text-gray-400 ml-8 mt-1"
                                >
                                    "{{
                                        stripGameShareSlugMarker(
                                            notification.data.comment
                                        )
                                    }}"
                                </p>
                            </div>
                            <div
                                v-else-if="
                                    notification.type ===
                                    'App\\Notifications\\MessageReacted'
                                "
                                class="text-gray-900 dark:text-gray-100"
                            >
                                <div class="flex items-center gap-2 mb-1">
                                    <Avatar
                                        class="ring-2 ring-white dark:ring-gray-800"
                                        :avatar="
                                            notification.data.reactor_avatar
                                        "
                                        :user="{
                                            id: notification.data.reactor_id,
                                            name: notification.data
                                                .reactor_name,
                                        }"
                                        size="sm"
                                    />
                                    <div
                                        class="flex items-center gap-1.5 flex-wrap"
                                    >
                                        <strong>{{
                                            notification.data.reactor_name
                                        }}</strong>
                                        <span class="text-sm">{{
                                            reactionLabel(notification)
                                        }}</span>
                                        <span
                                            v-if="!notification.read_at"
                                            class="inline-block w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_4px_1px_rgba(245,158,11,0.55)]"
                                        ></span>
                                    </div>
                                </div>
                                <p
                                    class="text-sm text-gray-700 dark:text-gray-300 italic ml-8 mb-1"
                                >
                                    "{{
                                        stripGameShareSlugMarker(
                                            notificationBodyText(notification)
                                        )
                                    }}"
                                </p>
                            </div>
                            <div
                                v-else-if="
                                    notification.type ===
                                    'App\\Notifications\\UnblockRequested'
                                "
                                class="text-gray-900 dark:text-gray-100"
                            >
                                <div class="flex items-center gap-2 mb-1">
                                    <Avatar
                                        class="ring-2 ring-white dark:ring-gray-800"
                                        :avatar="
                                            notification.data.requester_avatar
                                        "
                                        :user="{
                                            id: notification.data.requester_id,
                                            name: notification.data
                                                .requester_name,
                                        }"
                                        size="sm"
                                    />
                                    <div
                                        class="flex items-center gap-1.5 flex-wrap"
                                    >
                                        <strong>{{
                                            notification.data.requester_name
                                        }}</strong>
                                        <span class="text-sm">{{
                                            t("unblock_request.asked_label")
                                        }}</span>
                                        <span
                                            v-if="!notification.read_at"
                                            class="inline-block w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_4px_1px_rgba(245,158,11,0.55)]"
                                        ></span>
                                    </div>
                                </div>
                                <p
                                    class="text-sm text-gray-700 dark:text-gray-300 ml-8 mb-1"
                                >
                                    {{ notificationBodyText(notification) }}
                                </p>
                            </div>
                            <div
                                class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-8"
                            >
                                <span>{{
                                    formatDate(notification.created_at)
                                }}</span>
                                <span
                                    class="font-semibold text-indigo-700 dark:text-amber-400"
                                    >{{ notificationCta(notification) }} →</span
                                >
                            </div>
                        </div>
                        <div
                            class="flex items-center justify-end gap-1 pt-2 border-t border-gray-200 dark:border-gray-700"
                        >
                            <button
                                v-if="!notification.read_at"
                                type="button"
                                title="Clear"
                                class="px-2 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-amber-400 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                                @click.stop="markAsRead(notification.id)"
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                title="Delete notification"
                                class="px-2 py-1 text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-md transition-colors"
                                @click.stop="
                                    deleteNotification(notification.id)
                                "
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
/* global route */
import Avatar from "@/Components/Avatar.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import { useNotificationSync } from "@/composables/useNotificationSync";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useUnblockAll } from "@/composables/useUnblockAll";
import { useUnreadNotifications } from "@/composables/useUnreadNotifications";
import { userChannelName } from "@/utils/broadcastChannel";
import { router, usePage } from "@inertiajs/vue3";
import axios from "axios";
import { onMounted, onUnmounted, ref } from "vue";

const GAME_SHARE_SLUG_MARKER = /\uE000g:[a-z0-9-]+\uE000/g;

const stripGameShareSlugMarker = (text) => {
    if (text == null || text === "") {
        return "";
    }
    return String(text).replace(GAME_SHARE_SLUG_MARKER, "");
};

const notificationBodyText = (notification) => {
    if (notification.type === "App\\Notifications\\UserTagged") {
        if (notification.data.comment) {
            return notification.data.comment;
        }
        return notification.data.message || "";
    }

    if (notification.type === "App\\Notifications\\MessageCommented") {
        return notification.data.comment || notification.data.message || "";
    }

    if (notification.type === "App\\Notifications\\MessageReacted") {
        return notification.data.comment || notification.data.message || "";
    }

    if (notification.type === "App\\Notifications\\UnblockRequested") {
        return t("unblock_request.body", {
            count: notification.data.blocked_count ?? 0,
        });
    }

    return notification.data.message || "";
};

// The default footer says "view message"; unblock requests go somewhere else.
const notificationCta = (notification) =>
    notification.type === "App\\Notifications\\UnblockRequested"
        ? t("unblock_request.action")
        : t("general.view_message");

const reactionLabel = (notification) => {
    const emoji = notification.data.emoji || "";
    return notification.data.comment_id
        ? t("notifications.reaction_comment_label", { emoji })
        : t("notifications.reaction_label", { emoji });
};

const notifications = ref([]);
const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();
const { unblockAll } = useUnblockAll();
const loading = ref(true);
const notificationsChannel = ref(null);
const { unreadCount } = useUnreadNotifications();
const { markAsRead: syncMarkAsRead, markAllAsRead: syncMarkAllAsRead } =
    useNotificationSync();

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60)
        return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
};

const loadNotifications = async () => {
    try {
        loading.value = true;
        const response = await axios.get(route("profile.notifications"));
        notifications.value = response.data.data || [];
    } catch (error) {
        console.error("Failed to load notifications:", error);
    } finally {
        loading.value = false;
    }
};

const handleNotificationClick = async (notification) => {
    // Unblock requests act in place rather than navigating: admins unblock
    // directly, the same as the emailed link, with no confirm step. Marking
    // read is independent of unblocking, so the two run together.
    if (notification.type === "App\\Notifications\\UnblockRequested") {
        await Promise.all([
            notification.read_at
                ? Promise.resolve()
                : markAsRead(notification.id),
            unblockAll(),
        ]);
        return;
    }

    // Mark as read if not already read
    if (!notification.read_at) {
        await markAsRead(notification.id);
    }

    // Navigate to messages timeline with message ID hash if available
    // If URL already exists in notification data, use it (it may already include hash)
    // Otherwise, construct URL with hash if message_id is available
    let url = notification.data.url;
    if (!url) {
        url = route("messages.index");
        if (notification.data.message_id) {
            url = `${url}#message-${notification.data.message_id}`;
        }
    }
    router.visit(url);
};

const markAsRead = async (notificationId) => {
    // Update local state optimistically
    const notification = notifications.value.find(
        (n) => n.id === notificationId
    );
    if (notification) {
        notification.read_at = new Date().toISOString();
    }
    await syncMarkAsRead(notificationId);
};

const markAllAsRead = async () => {
    const unreadIds = notifications.value
        .filter((n) => !n.read_at)
        .map((n) => n.id);
    // Update local state optimistically
    notifications.value.forEach((notification) => {
        if (!notification.read_at) {
            notification.read_at = new Date().toISOString();
        }
    });
    await syncMarkAllAsRead(unreadIds);
};

const deleteNotification = async (notificationId) => {
    try {
        await axios.delete(route("notifications.delete", notificationId));
        const index = notifications.value.findIndex(
            (n) => n.id === notificationId
        );
        if (index !== -1) {
            const notification = notifications.value[index];
            if (!notification.read_at && unreadCount.value > 0) {
                unreadCount.value--;
            }
            notifications.value.splice(index, 1);
        }
        router.reload({ only: ["unread_notifications_count"] });
    } catch (error) {
        console.error("Failed to delete notification:", error);
    }
};

const SPEECH_SENDER_LIMIT = 5;

const senderNameForNotification = (notification) => {
    if (notification.type === "App\\Notifications\\UserTagged") {
        return notification.data.tagger_name;
    }
    if (notification.type === "App\\Notifications\\MessageCommented") {
        return notification.data.commenter_name;
    }
    if (notification.type === "App\\Notifications\\MessageReacted") {
        return notification.data.reactor_name;
    }
    if (notification.type === "App\\Notifications\\UnblockRequested") {
        return notification.data.requester_name;
    }
    return null;
};

const joinWithAnd = (items) => {
    if (items.length <= 1) return items.join("");
    const and = t("notifications.summary_and");
    if (items.length === 2) return `${items[0]} ${and} ${items[1]}`;
    return `${items.slice(0, -1).join(", ")}, ${and} ${
        items[items.length - 1]
    }`;
};

const getSummaryForSpeech = () => {
    const unread = notifications.value.filter((n) => !n.read_at);
    if (unread.length === 0) return t("notifications.summary_none");

    const countsBySender = new Map();
    unread.forEach((notification) => {
        const name =
            senderNameForNotification(notification) ||
            t("notifications.summary_someone");
        countsBySender.set(name, (countsBySender.get(name) || 0) + 1);
    });
    const senderNames = Array.from(countsBySender.keys());
    const tap = t("notifications.summary_tap");

    if (unread.length === 1) {
        return `${t("notifications.summary_single", {
            name: senderNames[0],
        })} ${tap}`;
    }

    if (senderNames.length === 1) {
        return `${t("notifications.summary_all_from_one", {
            count: unread.length,
            name: senderNames[0],
        })} ${tap}`;
    }

    const shownNames = senderNames.slice(0, SPEECH_SENDER_LIMIT);
    const senderParts = shownNames.map((name) =>
        t("notifications.summary_from", {
            count: countsBySender.get(name),
            name,
        })
    );
    const extraSenders = senderNames.length - shownNames.length;
    const more =
        extraSenders > 0
            ? " " + t("notifications.summary_more", { count: extraSenders })
            : "";
    const countText = t("notifications.summary_count", {
        count: unread.length,
    });

    return `${countText} ${joinWithAnd(senderParts)}.${more} ${tap}`;
};

const speakSummary = () => {
    speak(getSummaryForSpeech());
};

const setupEchoListener = () => {
    // A pending retry can outlive the page, leaving no window to look at.
    if (typeof window === "undefined") return;
    const user = usePage().props.auth?.user;
    if (!user || !user.id || !window.Echo) {
        // Retry after a short delay
        setTimeout(setupEchoListener, 500);
        return;
    }

    // Subscribe to user's private channel for notifications
    notificationsChannel.value = window.Echo.private(userChannelName(user.id));

    // Listen for new notifications
    notificationsChannel.value.notification((notification) => {
        // Add new notification to the beginning of the array
        notifications.value.unshift(notification);
        // Count is already incremented by useUnreadNotifications composable
    });
};

const cleanup = () => {
    const user = usePage().props.auth?.user;
    if (notificationsChannel.value && window.Echo && user) {
        try {
            window.Echo.leave(userChannelName(user.id));
        } catch (error) {
            // Ignore errors when leaving channel
        }
        notificationsChannel.value = null;
    }
};

onMounted(() => {
    loadNotifications();
    setupEchoListener();
});

onUnmounted(() => {
    cleanup();
});

defineExpose({
    markAllAsRead,
});
</script>
