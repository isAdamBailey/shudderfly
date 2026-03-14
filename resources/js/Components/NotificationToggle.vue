<script setup>
import Button from "@/Components/Button.vue";
import { usePushNotifications } from "@/composables/usePushNotifications";
import { useTranslations } from "@/composables/useTranslations";
import { router, usePage } from "@inertiajs/vue3";
import { ref } from "vue";

const { isSupported, isSubscribed, subscribe, unsubscribe } =
  usePushNotifications();
const { t } = useTranslations();
const loading = ref(false);
const message = ref("");
const emailLoading = ref(false);
const user = usePage().props.auth.user;
const emailNotificationsEnabled = ref(
  user?.email_notifications_enabled ?? true
);

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

const handleEmailToggle = () => {
  const nextValue = !emailNotificationsEnabled.value;
  emailLoading.value = true;

  router.patch(
    route("profile.notifications.preferences"),
    {
      email_notifications_enabled: nextValue
    },
    {
      preserveScroll: true,
      onSuccess: () => {
        emailNotificationsEnabled.value = nextValue;
      },
      onFinish: () => {
        emailLoading.value = false;
      }
    }
  );
};
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-3">
      <div class="flex items-center justify-between gap-4">
        <div class="flex-1">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t("notifications.email.description") }}
          </p>
        </div>
        <Button
          :disabled="emailLoading"
          :class="emailNotificationsEnabled ? '' : 'bg-red-600 hover:bg-red-700'"
          @click="handleEmailToggle"
        >
          {{
            emailLoading
              ? t("notifications.email.saving")
              : emailNotificationsEnabled
                ? t("notifications.email.disable")
                : t("notifications.email.enable")
          }}
        </Button>
      </div>
    </div>

    <div v-if="!isSupported" class="text-sm text-gray-600 dark:text-gray-400">
      Push notifications are not supported in this browser.
    </div>

    <div v-else class="space-y-3">
      <div
        v-if="message"
        class="p-2 rounded"
        :class="
          message.includes('Success')
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
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
