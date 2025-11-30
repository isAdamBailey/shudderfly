<script setup>
import Button from "@/Components/Button.vue";
import { usePushNotifications } from "@/composables/usePushNotifications";
import { ref } from "vue";

const { isSupported, isSubscribed, subscribe, unsubscribe } =
  usePushNotifications();
const loading = ref(false);
const message = ref("");

const handleSubscribe = async () => {
  loading.value = true;
  message.value = "";
  try {
    const success = await subscribe();
    if (success) {
      message.value = "Successfully subscribed to push notifications!";
    } else {
      message.value = "Failed to subscribe. Please check browser permissions.";
    }
  } catch (error) {
    message.value = `Error: ${error.message}`;
  } finally {
    loading.value = false;
  }
};

const handleUnsubscribe = async () => {
  loading.value = true;
  message.value = "";
  try {
    const success = await unsubscribe();
    if (success) {
      message.value = "Successfully unsubscribed from push notifications.";
    } else {
      message.value = "Failed to unsubscribe.";
    }
  } catch (error) {
    message.value = `Error: ${error.message}`;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
    <h3 class="text-lg font-semibold mb-4">Push Notifications</h3>

    <div v-if="!isSupported" class="text-sm text-gray-600 dark:text-gray-400">
      Push notifications are not supported in this browser.
    </div>

    <div v-else>
      <div
        v-if="message"
        class="mb-4 p-2 rounded"
        :class="
          message.includes('Success')
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        "
      >
        {{ message }}
      </div>

      <div class="flex items-center gap-4">
        <div class="flex-1">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{
              isSubscribed
                ? "You are subscribed to push notifications."
                : "Enable push notifications to receive updates even when the app is closed."
            }}
          </p>
        </div>

        <Button
          v-if="!isSubscribed"
          :disabled="loading"
          @click="handleSubscribe"
        >
          {{ loading ? "Subscribing..." : "Enable Notifications" }}
        </Button>

        <Button
          v-else
          :disabled="loading"
          class="bg-red-600 hover:bg-red-700"
          @click="handleUnsubscribe"
        >
          {{ loading ? "Unsubscribing..." : "Disable Notifications" }}
        </Button>
      </div>
    </div>
  </div>
</template>
