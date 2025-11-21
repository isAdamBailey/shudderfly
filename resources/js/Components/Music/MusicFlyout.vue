<template>
  <!-- Only render if music is enabled -->
  <div v-if="musicEnabled">
    <!-- Backdrop -->
    <div
      v-if="isFlyoutOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
      @click="closeFlyout"
    ></div>

    <!-- Flyout Panel -->
    <div
      class="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out"
      :class="{
        'translate-x-0': isFlyoutOpen,
        'translate-x-full': !isFlyoutOpen
      }"
    >
      <!-- Music Indicator Button (attached to left edge of flyout) -->
      <div
        class="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 z-50"
        style="margin-top: -60px"
      >
        <button
          type="button"
          class="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white dark:text-white shadow-lg dark:shadow-gray-900 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-l-lg px-2 py-3 relative w-8 h-16"
          :class="{
            'ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-2 dark:ring-offset-gray-800':
              isPlaying && currentSong
          }"
          :aria-label="
            isPlaying && currentSong
              ? 'Music is playing - toggle music player'
              : 'Toggle music player'
          "
          @click="toggleFlyout"
        >
          <i
            class="ri-music-2-line text-lg"
            :class="{
              'animate-pulse': isPlaying && currentSong
            }"
          ></i>

          <!-- Visual indicator when playing -->
          <span
            v-if="isPlaying && currentSong"
            class="absolute -top-1 -right-1 flex h-3 w-3"
          >
            <span
              class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 dark:bg-red-500 opacity-75"
            ></span>
            <span
              class="relative inline-flex rounded-full h-3 w-3 bg-red-500 dark:bg-red-600"
            ></span>
          </span>
        </button>
      </div>
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
        >
          <h2
            class="text-2xl font-heading font-semibold text-blue-600 dark:text-gray-100"
          >
            Music
          </h2>
          <button
            class="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
            @click="closeFlyout"
          >
            <i class="ri-close-line text-xl"></i>
          </button>
        </div>

        <!-- Music Player -->
        <MusicPlayer />

        <!-- Flyout Content (Song List) -->
        <div class="flex-1 overflow-hidden">
          <div v-if="loading" class="flex items-center justify-center h-full">
            <i class="ri-loader-4-line animate-spin text-4xl text-gray-400"></i>
          </div>
          <MusicFlyoutContent
            v-else-if="songsData"
            :songs="songsData"
            :search="searchParam"
            :filter="filterParam"
            @reload="(params) => loadSongs(params.search, params.filter)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MusicFlyoutContent from "@/Components/Music/MusicFlyoutContent.vue";
import MusicPlayer from "@/Components/Music/MusicPlayer.vue";
import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { usePage } from "@inertiajs/vue3";
import { computed, ref, watch } from "vue";

const {
  isFlyoutOpen,
  closeFlyout,
  search,
  filter,
  toggleFlyout,
  currentSong,
  isPlaying
} = useMusicPlayer();

const page = usePage();
const musicEnabled = computed(() => page.props.settings?.music_enabled ?? true);

// Songs data - will be loaded when flyout opens
const songsData = ref(null);
const searchParam = ref("");
const filterParam = ref("");
const loading = ref(false);

// Load songs data using fetch (since controller returns JSON)
const loadSongs = async (searchValue = null, filterValue = null) => {
  loading.value = true;

  try {
    const params = new URLSearchParams();
    const searchParamValue =
      searchValue !== null ? searchValue : search.value || "";
    const filterParamValue =
      filterValue !== null ? filterValue : filter.value || "";

    if (searchParamValue) {
      params.append("search", searchParamValue);
    }
    if (filterParamValue) {
      params.append("filter", filterParamValue);
    }

    const url =
      route("music.index") + (params.toString() ? `?${params.toString()}` : "");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    if (response.ok) {
      const data = await response.json();
      songsData.value = data.songs;
      searchParam.value = data.search || "";
      filterParam.value = data.filter || "";
    }
  } catch (error) {
    console.error("Error loading songs:", error);
  } finally {
    loading.value = false;
  }
};

// Watch for flyout opening to load songs
watch(isFlyoutOpen, (open) => {
  if (open && !songsData.value) {
    loadSongs();
  }
});

// Watch for search/filter changes in global state
watch([search, filter], ([newSearch, newFilter]) => {
  if (isFlyoutOpen.value && songsData.value) {
    loadSongs(newSearch, newFilter);
  }
});
</script>
