<template>
  <div class="max-h-96 overflow-y-auto">
    <div
      class="px-4 py-3 border-b border-gray-200 dark:border-gray-700"
    >
      <h2
        class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
      >
        Notifications
        <span
          v-if="unreadCount > 0"
          class="px-2 py-0.5 text-sm bg-red-600 text-white rounded-full"
        >
          {{ unreadCount }}
        </span>
      </h2>
    </div>
    <div
      class="px-4 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
    >
      <button
        v-if="notifications.length > 0"
        type="button"
        title="Speak unread notifications summary"
        class="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
        :disabled="speaking"
        @click.stop="speakSummary"
      >
        <i
          class="ri-speak-fill text-lg"
          :class="{ 'animate-pulse': speaking }"
        ></i>
      </button>
      <button
        v-if="unreadCount > 0"
        type="button"
        class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
        @click.stop="markAllAsRead"
      >
        Mark all read
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
              ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              : 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800'
          ]"
          @click="handleNotificationClick(notification)"
        >
          <div>
          <div class="mb-2">
            <div
              v-if="notification.type === 'App\\Notifications\\UserTagged'"
              class="text-gray-900 dark:text-gray-100"
            >
              <div class="flex items-center gap-2 mb-1">
                <Avatar
                  :avatar="notification.data.tagger_avatar"
                  :user="{
                    id: notification.data.tagger_id,
                    name: notification.data.tagger_name
                  }"
                  size="sm"
                />
                <div class="flex items-center gap-1.5 flex-wrap">
                  <strong>{{ notification.data.tagger_name }}</strong>
                  <span class="text-sm">tagged you:</span>
                  <span
                    v-if="!notification.read_at"
                    class="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full"
                  ></span>
                </div>
              </div>
              <p
                class="text-sm text-gray-700 dark:text-gray-300 italic ml-8 mb-1"
              >
                "{{ notification.data.message }}"
              </p>
            </div>
            <div
              v-else-if="
                notification.type === 'App\\Notifications\\MessageCommented'
              "
              class="text-gray-900 dark:text-gray-100"
            >
              <div class="flex items-center gap-2 mb-1">
                <Avatar
                  :avatar="notification.data.commenter_avatar"
                  :user="{
                    id: notification.data.commenter_id,
                    name: notification.data.commenter_name
                  }"
                  size="sm"
                />
                <div class="flex items-center gap-1.5 flex-wrap">
                  <strong>{{ notification.data.commenter_name }}</strong>
                  <span class="text-sm">commented on your message:</span>
                  <span
                    v-if="!notification.read_at"
                    class="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full"
                  ></span>
                </div>
              </div>
              <p
                class="text-sm text-gray-700 dark:text-gray-300 italic ml-8 mb-1"
              >
                "{{ notification.data.message }}"
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400 ml-8 mt-1">
                Comment: "{{ notification.data.comment }}"
              </p>
            </div>
            <div
              class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-8"
            >
              <span>{{ formatDate(notification.created_at) }}</span>
              <span class="text-blue-600 dark:text-blue-400"
                >View message →</span
              >
            </div>
          </div>
          <div
            class="flex items-center justify-end gap-1 pt-2 border-t border-gray-200 dark:border-gray-700"
          >
            <button
              v-if="!notification.read_at"
              type="button"
              title="Mark as read"
              class="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
              @click.stop="markAsRead(notification.id)"
            >
              Mark read
            </button>
            <button
              type="button"
              title="Delete notification"
              class="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-800 rounded transition-colors"
              @click.stop="deleteNotification(notification.id)"
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
import { useUnreadNotifications } from "@/composables/useUnreadNotifications";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { router, usePage } from "@inertiajs/vue3";
import axios from "axios";
import { onMounted, onUnmounted, ref } from "vue";

const notifications = ref([]);
const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();
const loading = ref(true);
const notificationsChannel = ref(null);
const { unreadCount } = useUnreadNotifications();

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
  try {
    await axios.post(route("notifications.read", notificationId));
    // Update local state
    const notification = notifications.value.find(
      (n) => n.id === notificationId
    );
    if (notification) {
      notification.read_at = new Date().toISOString();
    }
    // Decrement global count
    if (unreadCount.value > 0) {
      unreadCount.value--;
    }
    // Reload page props to sync with server
    router.reload({ only: ["unread_notifications_count"] });
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
};

const markAllAsRead = async () => {
  try {
    await axios.post(route("notifications.read-all"));
    // Update local state
    notifications.value.forEach((notification) => {
      if (!notification.read_at) {
        notification.read_at = new Date().toISOString();
      }
    });
    // Reset global count
    unreadCount.value = 0;
    // Reload page props to sync with server
    router.reload({ only: ["unread_notifications_count"] });
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
  }
};

const deleteNotification = async (notificationId) => {
  try {
    await axios.delete(route("notifications.delete", notificationId));
    const index = notifications.value.findIndex((n) => n.id === notificationId);
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

const getSummaryForSpeech = () => {
  const unread = notifications.value.filter((n) => !n.read_at);
  if (unread.length === 0) return t("notifications.summary_none");
  const countText =
    unread.length === 1
      ? t("notifications.summary_count_one") + " "
      : t("notifications.summary_count", { count: unread.length }) + " ";
  const parts = unread.slice(0, 5).map((n) => {
    if (n.type === "App\\Notifications\\UserTagged") {
      return t("notifications.summary_tagged", {
        name: n.data.tagger_name
      });
    }
    if (n.type === "App\\Notifications\\MessageCommented") {
      return t("notifications.summary_commented", {
        name: n.data.commenter_name
      });
    }
    return t("notifications.summary_new");
  });
  const summary = parts.join(" ");
  const more =
    unread.length > 5
      ? " " + t("notifications.summary_more", { count: unread.length - 5 })
      : "";
  const tap = " " + t("notifications.summary_tap");
  return countText + summary + more + tap;
};

const speakSummary = () => {
  speak(getSummaryForSpeech());
};

const setupEchoListener = () => {
  const user = usePage().props.auth?.user;
  if (!user || !user.id || !window.Echo) {
    // Retry after a short delay
    setTimeout(setupEchoListener, 500);
    return;
  }

  // Subscribe to user's private channel for notifications
  notificationsChannel.value = window.Echo.private(
    `App.Models.User.${user.id}`
  );

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
      window.Echo.leave(`App.Models.User.${user.id}`);
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
  markAllAsRead
});
</script>
