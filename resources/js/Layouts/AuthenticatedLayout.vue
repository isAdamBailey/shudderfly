<script setup>
import FlashMessage from "@/Components/Flash.vue";
import MusicFlyout from "@/Components/Music/MusicFlyout.vue";
import SearchInput from "@/Components/SearchInput.vue";
import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { usePusherNotifications } from "@/composables/usePusherNotifications";
import { usePushNotifications } from "@/composables/usePushNotifications";
import { useWorldClockSync } from "@/composables/useWorldClockSync";
import Footer from "@/Layouts/Nav/Footer.vue";
import Navigation from "@/Layouts/Nav/Navigation.vue";
import {
  syncAppLocaleFromPage,
  syncStoredSpeechLanguage,
} from "@/composables/speechVoice";
import { usePage } from "@inertiajs/vue3";
import { onMounted, ref, watch } from "vue";

usePusherNotifications();

const page = usePage();
const { playSong, openFlyout } = useMusicPlayer();

// Seed the shared World Clock state app-wide (once) so the nav logo clock and
// the shared timer work on every page. Live updates arrive via Echo; a full
// page refresh re-seeds from the server, keeping every session consistent.
const worldClockSync = useWorldClockSync();
if (page.props.worldClock) worldClockSync.hydrate(page.props.worldClock);

async function playSongFromFlash(songId) {
  if (songId == null || songId === "") return;
  try {
    const response = await window.axios.get(
      // eslint-disable-next-line no-undef
      route("music.show", songId),
      { headers: { Accept: "application/json" } }
    );
    if (response.data?.song) {
      playSong(response.data.song);
      openFlyout();
    }
  } catch (e) {
    console.error("Failed to load song from redirect:", e);
  }
}

onMounted(() => {
  playSongFromFlash(page.props.flash?.open_song_id);
});

watch(
  () => page.props.flash?.open_song_id,
  (id) => playSongFromFlash(id)
);

watch(
  () => page.props.locale,
  () => {
    const locale = syncAppLocaleFromPage(page);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        syncStoredSpeechLanguage(voices, locale);
      }
    }
  },
  { immediate: true }
);

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
  </div>
</template>
