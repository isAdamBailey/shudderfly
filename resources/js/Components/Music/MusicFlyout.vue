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
                'translate-x-full': !isFlyoutOpen,
            }"
        >
            <!-- Music Indicator Button (attached to left edge of flyout) -->
            <div
                class="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 z-50"
                style="margin-top: -60px"
            >
                <button
                    type="button"
                    class="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-700 dark:to-blue-800 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white dark:text-white shadow-xl dark:shadow-gray-900 flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-l-2xl px-3 py-4 relative w-12 h-20 hover:scale-105"
                    :class="{
                        'ring-2 ring-blue-400 dark:ring-blue-500 ring-offset-2 dark:ring-offset-gray-800 music-playing-bounce':
                            isPlaying && currentSong,
                    }"
                    :aria-label="
                        isPlaying && currentSong
                            ? 'Music is playing - toggle music player'
                            : 'Toggle music player'
                    "
                    @click="toggleFlyout"
                >
                    <i
                        class="ri-music-2-line text-2xl"
                        :class="{
                            'music-icon-pulse': isPlaying && currentSong,
                        }"
                    ></i>

                    <!-- Visual indicator when playing -->
                    <span
                        v-if="isPlaying && currentSong"
                        class="absolute -top-1 -right-1 flex h-4 w-4"
                    >
                        <span
                            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 dark:bg-red-500 opacity-75"
                        ></span>
                        <span
                            class="relative inline-flex rounded-full h-4 w-4 bg-red-500 dark:bg-red-600"
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
                    <div
                        v-if="loading"
                        class="flex items-center justify-center h-full"
                    >
                        <i
                            class="ri-loader-4-line animate-spin text-4xl text-gray-400"
                        ></i>
                    </div>
                    <MusicFlyoutContent
                        v-else-if="songsData"
                        :songs="songsData"
                        :search="searchParam"
                        :filter="filterParam"
                        @reload="
                            (params) => loadSongs(params.search, params.filter)
                        "
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
    isPlaying,
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
            route("music.index") + // eslint-disable-line no-undef
            (params.toString() ? `?${params.toString()}` : "");

        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
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

<style scoped>
/* Smooth bounce animation for the button when music is playing */
@keyframes music-bounce {
    0%,
    100% {
        transform: translateY(0) scale(1);
    }
    25% {
        transform: translateY(-4px) scale(1.05);
    }
    50% {
        transform: translateY(0) scale(1);
    }
    75% {
        transform: translateY(-2px) scale(1.02);
    }
}

.music-playing-bounce {
    animation: music-bounce 2s ease-in-out infinite;
}

/* Smooth pulse animation for the music icon */
@keyframes music-icon-pulse {
    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.1);
        opacity: 0.9;
    }
}

.music-icon-pulse {
    animation: music-icon-pulse 1.5s ease-in-out infinite;
}
</style>
