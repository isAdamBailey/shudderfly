<script setup>
import FlashMessage from "@/Components/Flash.vue";
import MessageBuilderFlyout from "@/Components/Messages/MessageBuilderFlyout.vue";
import MusicFlyout from "@/Components/Music/MusicFlyout.vue";
import SearchInput from "@/Components/SearchInput.vue";
import { usePusherNotifications } from "@/composables/usePusherNotifications";
import { usePushNotifications } from "@/composables/usePushNotifications";
import Footer from "@/Layouts/Nav/Footer.vue";
import Navigation from "@/Layouts/Nav/Navigation.vue";
import { ref, watch } from "vue";

usePusherNotifications();

const { isSupported, isSubscribed, subscribe } = usePushNotifications();
const dismissedKey = "notification_prompt_dismissed";
const hasPrompted = ref(false);

const checkAndPrompt = async () => {
  const dismissed = localStorage.getItem(dismissedKey);

  if (
    isSupported.value &&
    !isSubscribed.value &&
    !dismissed &&
    !hasPrompted.value
  ) {
    setTimeout(async () => {
      if (
        isSupported.value &&
        !isSubscribed.value &&
        !localStorage.getItem(dismissedKey) &&
        !hasPrompted.value
      ) {
        hasPrompted.value = true;
        try {
          await subscribe();
        } catch (error) {
          if (
            error?.message?.includes("denied") ||
            Notification.permission === "denied"
          ) {
            localStorage.setItem(dismissedKey, "true");
          }
        }
      }
    }, 3000);
  }
};

watch(
  [isSupported, isSubscribed],
  () => {
    if (!isSubscribed.value) {
      checkAndPrompt();
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <div class="flex flex-col flex-grow bg-gray-900">
      <Navigation />

      <FlashMessage />

      <SearchInput />

      <header v-if="$slots.header" class="border-gray-900">
        <div class="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8 mt-3">
          <slot name="header" />
        </div>
      </header>

      <main>
        <slot />
      </main>

      <Footer />
    </div>

    <MusicFlyout />
    <MessageBuilderFlyout />
  </div>
</template>
