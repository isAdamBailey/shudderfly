<template>
    <div
        class="notification-list-scroll max-h-[calc(100dvh-9rem)] overflow-y-auto bg-white dark:bg-gray-900 sm:max-h-[min(36rem,calc(100dvh-10rem))]"
    >
        <div
            class="flex items-center justify-between gap-3 border-b border-indigo-200 bg-indigo-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-950/70"
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
                        'cursor-pointer rounded-xl border p-3 transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0',
                        notification.read_at
                            ? 'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700/80'
                            : 'border-amber-300 bg-amber-50 shadow-sm hover:bg-amber-100 dark:border-amber-500/60 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/70',
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
                                    class="notification-message ml-8 mb-1 text-sm italic text-gray-700 dark:text-gray-200"
                                    :class="messageHeightClass(notification)"
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
                                    class="notification-message ml-8 mb-1 text-sm italic text-gray-700 dark:text-gray-200"
                                    :class="messageHeightClass(notification)"
                                >
                                    "{{
                                        stripGameShareSlugMarker(
                                            notification.data.message
                                        )
                                    }}"
                                </p>
                                <p
                                    v-if="notification.data.comment"
                                    class="notification-message ml-8 mt-1 text-sm text-gray-700 dark:text-gray-200"
                                    :class="messageHeightClass(notification)"
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
                                    class="notification-message ml-8 mb-1 text-sm italic text-gray-700 dark:text-gray-200"
                                    :class="messageHeightClass(notification)"
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
                                    class="notification-message ml-8 mb-1 text-sm text-gray-700 dark:text-gray-200"
                                    :class="messageHeightClass(notification)"
                                >
                                    {{ notificationBodyText(notification) }}
                                </p>
                            </div>
                            <button
                                v-if="hasLongMessage(notification)"
                                type="button"
                                class="ml-8 mt-1 min-h-11 rounded-md px-2 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-50 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-amber-300 dark:hover:bg-gray-700 dark:hover:text-amber-200"
                                :aria-expanded="isExpanded(notification.id)"
                                @click.stop="toggleMessage(notification.id)"
                            >
                                {{
                                    isExpanded(notification.id)
                                        ? t("notifications.show_less")
                                        : t("notifications.show_more")
                                }}
                            </button>
                            <div
                                class="ml-8 mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"
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
                            class="flex items-center gap-2 border-t border-gray-200 pt-2 dark:border-gray-700"
                        >
                            <SpeakButton
                                :disabled="speaking"
                                :aria-label="
                                    t('notifications.speak_item_aria', {
                                        name:
                                            senderNameForNotification(
                                                notification
                                            ) ||
                                            t('notifications.summary_someone'),
                                    })
                                "
                                @click.stop="speakNotification(notification)"
                            />
                            <div class="ml-auto flex items-center gap-1">
                                <button
                                    v-if="!notification.read_at"
                                    type="button"
                                    title="Clear"
                                    class="min-h-11 rounded-md px-3 text-xs font-bold uppercase tracking-wide text-indigo-700 transition-colors hover:bg-indigo-50 dark:text-amber-400 dark:hover:bg-gray-700"
                                    @click.stop="markAsRead(notification.id)"
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    title="Delete notification"
                                    class="min-h-11 rounded-md px-3 text-xs font-bold uppercase tracking-wide text-red-700 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40"
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
    </div>
</template>

<script setup>
/* global route */
import Avatar from "@/Components/Avatar.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import { useNotificationRefresh } from "@/composables/useNotificationRefresh";
import { useNotificationSync } from "@/composables/useNotificationSync";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { useUnblockAll } from "@/composables/useUnblockAll";
import {
    refreshUnreadCount,
    useUnreadNotifications,
} from "@/composables/useUnreadNotifications";
import { userChannelName } from "@/utils/broadcastChannel";
import { router, usePage } from "@inertiajs/vue3";
import axios from "axios";
import { onMounted, onUnmounted, ref, watch } from "vue";

const GAME_SHARE_SLUG_MARKER = /\uE000[gm]:[a-z0-9-]+\uE000/g;

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

const props = defineProps({
    // Whether the bell dropdown is showing this list. Only used to decide
    // whether a background refresh is worth a request right now.
    open: { type: Boolean, default: false },
});

const notifications = ref([]);
const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();
const { unblockAll } = useUnblockAll();
const loading = ref(true);
const notificationsChannel = ref(null);
const { unreadCount } = useUnreadNotifications();
const { markAsRead: syncMarkAsRead, markAllAsRead: syncMarkAllAsRead } =
    useNotificationSync();
const expandedNotifications = ref(new Set());

const notificationTextParts = (notification) => {
    const parts =
        notification.type === "App\\Notifications\\MessageCommented"
            ? [notification.data?.message, notification.data?.comment]
            : [notificationBodyText(notification)];

    return parts
        .filter((text) => typeof text === "string" && text.trim() !== "")
        .map(stripGameShareSlugMarker);
};

const hasLongMessage = (notification) =>
    notificationTextParts(notification).some((text) => text.length > 150);

const isExpanded = (notificationId) =>
    expandedNotifications.value.has(notificationId);

const messageHeightClass = (notification) =>
    hasLongMessage(notification)
        ? isExpanded(notification.id)
            ? "line-clamp-none opacity-100 translate-y-0"
            : "line-clamp-3 opacity-95 translate-y-0.5"
        : "opacity-100 translate-y-0";

const toggleMessage = (notificationId) => {
    const expanded = new Set(expandedNotifications.value);
    if (expanded.has(notificationId)) {
        expanded.delete(notificationId);
    } else {
        expanded.add(notificationId);
    }
    expandedNotifications.value = expanded;
};

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

// `loading` starts true and is never set back, so a background refresh leaves
// the rendered list up instead of replacing it with "Loading notifications...".
let inFlight = null;
// A refresh asked for while a fetch was already running. It cannot share that
// fetch — the request may have been sent before the notification it is meant to
// pick up existed — so it runs again after, rather than being dropped.
let refetchWhenDone = false;

const loadNotifications = async () => {
    if (inFlight) {
        refetchWhenDone = true;
        return inFlight;
    }

    const request = (async () => {
        try {
            const response = await axios.get(route("profile.notifications"));
            notifications.value = response.data.data || [];
        } catch (error) {
            console.error("Failed to load notifications:", error);
        } finally {
            loading.value = false;
            inFlight = null;
        }
    })();
    inFlight = request;
    await request;

    if (refetchWhenDone) {
        refetchWhenDone = false;
        await loadNotifications();
    }
};

// A Web Push means the server has a notification this list has not seen. Echo
// would normally have pushed it in already, but the tab may have been asleep
// with its websocket dropped, which is why the push exists at all — so re-fetch
// rather than trust the in-memory list.
//
// The dropdown renders with v-show, so this list stays mounted on every page.
// Fetching 20 notifications nobody is looking at — on every tab focus — is not
// worth it, so a refresh that lands while the bell is closed is remembered and
// spent when it next opens.
let staleWhileClosed = false;

useNotificationRefresh(() => {
    if (props.open) {
        loadNotifications();
    } else {
        staleWhileClosed = true;
    }
});

watch(
    () => props.open,
    (open) => {
        if (open && staleWhileClosed) {
            staleWhileClosed = false;
            loadNotifications();
        }
    }
);

const handleNotificationClick = async (notification) => {
    // Unblock requests act in place rather than navigating: admins unblock
    // directly, the same as the emailed link, with no confirm step.
    if (notification.type === "App\\Notifications\\UnblockRequested") {
        // Not marked read: the server deletes these outright once the ask is
        // answered, so it would be a write to a row about to disappear.
        // An entry predating the scoped route carries no id and falls back to
        // the unscoped unblock, which resolves every ask anyway — safe, just
        // not single-use.
        const outcome = await unblockAll(notification.data.unblock_request_id);

        if (outcome === "unblocked") {
            // One unblock answers every outstanding ask, so the server clears
            // the lot. Drop them here too, rather than leave entries that
            // could only 409 on the next click.
            notifications.value = notifications.value.filter(
                (entry) => entry.type !== "App\\Notifications\\UnblockRequested"
            );
        } else if (outcome === "already-handled") {
            // Only this ask was spent. Another child's may still be live, and
            // the bell is the only place left to act on it.
            notifications.value = notifications.value.filter(
                (entry) => entry.id !== notification.id
            );
        }
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
        refreshUnreadCount();
    } catch (error) {
        console.error("Failed to delete notification:", error);
    }
};

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

const speakNotification = (notification) => {
    const sender = senderNameForNotification(notification);
    const context =
        notification.type === "App\\Notifications\\MessageReacted"
            ? reactionLabel(notification)
            : "";

    speak([sender, context, ...notificationTextParts(notification)].filter(Boolean).join(". "));
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
