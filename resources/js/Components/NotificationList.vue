<template>
  <div class="space-y-2">
    <div v-if="loading" class="text-center py-4 text-gray-500 dark:text-gray-400">
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
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
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
              v-else-if="notification.type === 'App\\Notifications\\MessageCommented'"
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
              <p
                class="text-sm text-gray-600 dark:text-gray-400 ml-8 mt-1"
              >
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
          <button
            v-if="!notification.read_at"
            type="button"
            title="Mark as read"
            class="flex-shrink-0 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded z-10 transition-colors"
            @click.stop="markAsRead(notification.id)"
          >
            Mark read
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/* global route */
import Avatar from "@/Components/Avatar.vue";
import { useUnreadNotifications } from "@/composables/useUnreadNotifications";
import { router, usePage } from "@inertiajs/vue3";
import axios from "axios";
import { onMounted, onUnmounted, ref } from "vue";

const notifications = ref([]);
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
      console.debug("Error leaving channel:", error);
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
</script>

