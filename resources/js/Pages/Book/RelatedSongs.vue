<template>
  <div v-if="songs.length > 0" class="md:pl-3 mt-10">
    <h3
      class="pt-2 text-2xl text-yellow-200 dark:text-gray-100 font-heading"
    >
      {{ label }}
    </h3>
    <div
      class="flex snap-x space-x-1 overflow-x-auto overflow-y-hidden pb-2 scrollbar scrollbar-thumb-gray-500 scrollbar-thumb-rounded"
    >
      <button
        v-for="song in songs"
        :key="song.id"
        type="button"
        class="w-48 shrink-0 snap-start text-left rounded-lg overflow-hidden border border-gray-600 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        @click="handlePlay(song)"
      >
        <div class="relative w-full aspect-video bg-gray-200 dark:bg-gray-900">
          <img
            v-if="thumbnailUrl(song)"
            :src="thumbnailUrl(song)"
            :alt="song.title"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full flex items-center justify-center"
          >
            <i class="ri-music-2-line text-4xl text-gray-400 dark:text-gray-500"></i>
          </div>
        </div>
        <div class="p-2">
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
            {{ song.title }}
          </p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useMusicPlayer } from "@/composables/useMusicPlayer";

const props = defineProps({
  songs: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    default: "Related songs"
  }
});

const { playSong, openFlyout, setSongsList } = useMusicPlayer();

function thumbnailUrl(song) {
  return (
    song.thumbnail_high ||
    song.thumbnail_medium ||
    song.thumbnail_default ||
    ""
  );
}

function handlePlay(song) {
  setSongsList(props.songs);
  playSong(song);
  openFlyout();
}
</script>
