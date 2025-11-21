<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div
      class="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700"
    >
      <button @click="applyFilter()">
        <h2
          class="font-heading text-2xl text-blue-600 dark:text-gray-100 leading-tight"
        >
          {{ title }}
        </h2>
      </button>
      <Button
        v-if="canAdmin"
        :disabled="syncing"
        class="text-sm"
        @click="syncPlaylist"
      >
        <span v-if="syncing">Syncing...</span>
        <span v-else>Sync</span>
      </Button>
    </div>

    <!-- Filters -->
    <div class="p-2 pb-0 flex flex-wrap justify-around">
      <Button
        type="button"
        :is-active="isFavorites"
        :disabled="loading"
        class="rounded-full my-2"
        @click="applyFilter('favorites')"
      >
        <i class="ri-star-line text-2xl"></i>
      </Button>
    </div>

    <!-- Song List -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto">
      <div v-if="items.length > 0" class="bg-white dark:bg-gray-800">
        <SongListItem
          v-for="song in items"
          :key="song.id"
          :song="song"
          :current-song="currentSong"
          :is-playing="isPlaying"
          @play="playSong"
        />

        <div
          ref="infiniteScrollRef"
          class="h-10 flex items-center justify-center"
        >
          <div
            v-if="loadingMore || nextPageUrl"
            class="text-sm text-gray-500 dark:text-gray-400"
          >
            {{ loadingMore ? "Loading more songs..." : "" }}
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center mt-10 p-4">
        <h2 class="mb-8 font-semibold text-xl text-gray-100 leading-tight">
          {{ notFoundContent }}
        </h2>
        <ManEmptyCircle />
      </div>
    </div>
  </div>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import SongListItem from "@/Components/Music/SongListItem.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { usePermissions } from "@/composables/permissions";
import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router } from "@inertiajs/vue3";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const { speak } = useSpeechSynthesis();
const { canAdmin } = usePermissions();
const {
  currentSong,
  isPlaying,
  playSong: playSongGlobal,
  setSearch,
  setFilter
} = useMusicPlayer();

const emit = defineEmits(["play", "reload"]);

const notFoundContent = "I can't find any music like that";

const props = defineProps({
  songs: {
    type: Object,
    default: () => ({})
  },
  search: {
    type: String,
    default: ""
  },
  filter: {
    type: String,
    default: ""
  }
});

const syncing = ref(false);
const loading = ref(false);
const scrollContainer = ref(null);
const infiniteScrollRef = ref(null);
const items = ref(
  (props.songs.data || []).map((song) => ({ ...song, loading: false }))
);
const loadingMore = ref(false);
const nextPageUrl = ref(props.songs.next_page_url || null);
const fetchedPages = new Set();
let observer = null;

const isFavorites = computed(() => {
  return props.filter === "favorites";
});

const getTitle = (search, filter) => {
  if (search) {
    return `Music with "${search}"`;
  }
  if (filter === "favorites") {
    return "Your favorite music";
  }
  return "Latest music";
};

const title = computed(() => {
  return getTitle(props.search, props.filter);
});

const fetchMore = async () => {
  const url = nextPageUrl.value;
  if (!url || fetchedPages.has(url) || loadingMore.value) {
    return;
  }

  fetchedPages.add(url);
  loadingMore.value = true;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest"
      }
    });

    if (response.ok) {
      const data = await response.json();
      const newItems = (data.songs.data || []).map((song) => ({
        ...song,
        loading: false
      }));
      items.value = [...items.value, ...newItems];
      nextPageUrl.value = data.songs.next_page_url || null;
    }
  } catch (error) {
    console.error("Error loading more songs:", error);
  } finally {
    loadingMore.value = false;
  }
};

watch(
  () => props.songs,
  async (newSongs) => {
    if (newSongs && newSongs.data) {
      items.value = newSongs.data.map((song) => ({
        ...song,
        loading: false
      }));
      nextPageUrl.value = newSongs.next_page_url || null;
      fetchedPages.clear();
      if (items.value.length === 0) {
        speak(notFoundContent);
      }
      await nextTick();
      setupObserver();
    }
  },
  { immediate: true, deep: true }
);

watch(
  () => props.search,
  (newSearch) => {
    if (newSearch !== undefined) {
      setSearch(newSearch);
    }
  }
);

const playSong = (song) => {
  playSongGlobal(song);
};

const applyFilter = async (filter) => {
  loading.value = true;
  setFilter(filter || "");

  const titleToSpeak = getTitle(props.search, filter);
  speak(titleToSpeak);

  // Emit event to parent to reload songs
  emit("reload", { filter: filter || null, search: props.search || null });

  loading.value = false;
};

const syncPlaylist = () => {
  if (syncing.value) return;

  syncing.value = true;
  // eslint-disable-next-line no-undef
  router.post(
    // eslint-disable-next-line no-undef
    route("music.sync"),
    {},
    {
      onFinish: () => {
        syncing.value = false;
      }
    }
  );
};

const setupObserver = () => {
  if (observer) {
    observer.disconnect();
  }

  if (!infiniteScrollRef.value || !scrollContainer.value) {
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && nextPageUrl.value && !loadingMore.value) {
          fetchMore();
        }
      });
    },
    {
      root: scrollContainer.value,
      rootMargin: "0px 0px 100px 0px",
      threshold: 0.1
    }
  );

  observer.observe(infiniteScrollRef.value);
};

onMounted(async () => {
  await nextTick();
  setupObserver();
});

watch([infiniteScrollRef, scrollContainer], async () => {
  await nextTick();
  setupObserver();
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>
