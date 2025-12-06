<template>
  <div class="space-y-4">
    <div v-if="loading" class="text-center py-4 text-gray-500">
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
          'p-4 rounded-lg border',
          notification.read_at
            ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            : 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700'
        ]"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <i
                v-if="notification.type === 'App\\Notifications\\UserTagged'"
                class="ri-user-add-line text-xl text-blue-600 dark:text-blue-400"
              ></i>
              <span
                v-if="!notification.read_at"
                class="inline-block w-2 h-2 bg-blue-600 rounded-full"
              ></span>
            </div>
            <div
              v-if="notification.type === 'App\\Notifications\\UserTagged'"
              class="text-gray-900 dark:text-gray-100"
            >
              <strong>{{ notification.data.tagger_name }}</strong> tagged you in a message:
              <p class="mt-2 text-gray-700 dark:text-gray-300 italic">
                "{{ notification.data.message }}"
              </p>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {{ formatDate(notification.created_at) }}
            </div>
            <a
              v-if="notification.data.message_id"
              :href="notification.data.url || route('messages.index')"
              class="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2 inline-block"
            >
              View message →
            </a>
          </div>
          <button
            v-if="!notification.read_at"
            type="button"
            class="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            @click="markAsRead(notification.id)"
            title="Mark as read"
          >
            <i class="ri-check-line text-xl"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/* global route */
import { router } from "@inertiajs/vue3";
import { onMounted, onUnmounted, ref } from "vue";
import { usePage } from "@inertiajs/vue3";
import axios from "axios";
import { useUnreadNotifications } from "@/composables/useUnreadNotifications";

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
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
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

const markAsRead = async (notificationId) => {
  try {
    await axios.post(route("notifications.read", notificationId));
    // Update local state
    const notification = notifications.value.find((n) => n.id === notificationId);
    if (notification) {
      notification.read_at = new Date().toISOString();
    }
    // Decrement global count
    if (unreadCount.value > 0) {
      unreadCount.value--;
    }
    // Reload page props to sync with server
    router.reload({ only: ['unread_notifications_count'] });
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
  notificationsChannel.value = window.Echo.private(`App.Models.User.${user.id}`);

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
    } catch {
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

