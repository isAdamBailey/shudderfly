<template>
    <Head title="Music" />

    <BreezeAuthenticatedLayout>
        <!-- Music Player (sticky at top when playing) -->
        <MusicPlayer
            :current-song="currentSong"
            @close="closeMusicPlayer"
            @playing="handlePlayingState"
        />

        <template #header>
            <div class="flex justify-between items-center mb-10">
                <Link class="w-1/2" :href="route('music.index')">
                    <h2
                        class="font-heading text-3xl text-theme-title leading-tight"
                    >
                        Music
                    </h2>
                </Link>
            </div>

            <!-- Search Bar -->
            <div class="mb-6 w-full md:w-1/2 mx-auto">
                <form @submit.prevent="performSearch">
                    <div class="relative">
                        <input
                            v-model="searchQuery"
                            type="text"
                            placeholder="Search songs by title, description, or artist..."
                            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
                        />
                        <button
                            type="submit"
                            class="absolute right-2 top-2 px-4 py-1 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
                        >
                            Search
                        </button>
                    </div>
                </form>
                <button
                    v-if="props.search"
                    class="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                    @click="clearSearch"
                >
                    Clear search
                </button>
            </div>

            <!-- Sync Button for Admins -->
            <div v-if="canSync" class="mb-6 w-full md:w-1/2 mx-auto">
                <Button
                    :disabled="syncing"
                    class="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                    @click="syncPlaylist"
                >
                    <span v-if="syncing">Syncing YouTube Playlist...</span>
                    <span v-else>Sync YouTube Playlist</span>
                </Button>
            </div>
        </template>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div
                v-if="items.length > 0"
                class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
            >
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
                        v-if="props.songs.next_page_url"
                        class="text-sm text-gray-500 dark:text-gray-400"
                    >
                        Loading more songs...
                    </div>
                </div>
            </div>

            <div v-else class="text-center py-12">
                <div class="max-w-md mx-auto">
                    <h3
                        class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2"
                    >
                        No songs found
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">
                        <span v-if="props.search">
                            No songs match your search criteria. Try a different
                            search term.
                        </span>
                        <span v-else>
                            No songs have been added yet.
                            <span v-if="canSync"
                                >Sync your YouTube playlist to get
                                started.</span
                            >
                        </span>
                    </p>
                </div>
            </div>
        </div>

        <ScrollTop />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import { Head, Link, router, usePage } from "@inertiajs/vue3";
import { ref, computed, watch } from "vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import Button from "@/Components/Button.vue";
import MusicPlayer from "@/Components/MusicPlayer.vue";
import SongListItem from "@/Components/SongListItem.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";

const props = defineProps({
    songs: {
        type: Object,
        default: () => ({}),
    },
    search: {
        type: String,
        default: "",
    },
    canSync: {
        type: Boolean,
        default: false,
    },
});

const searchQuery = ref(props.search || "");
const syncing = ref(false);
const currentSong = ref(null);
const isPlaying = ref(false);

const { items, infiniteScrollRef } = useInfiniteScroll(
    props.songs.data || [],
    computed(() => props.songs)
);

watch(
    () => usePage().props.search,
    (newSearch) => {
        if (newSearch !== undefined) {
            items.value = (props.songs.data || []).map((song) => ({
                ...song,
                loading: false,
            }));
        }
    }
);

const playSong = (song) => {
    console.log("Playing song:", song.title);
    currentSong.value = song;
};

const closeMusicPlayer = () => {
    console.log("Closing music player");
    currentSong.value = null;
    isPlaying.value = false;
};

const handlePlayingState = (playing) => {
    isPlaying.value = playing;
};

const performSearch = () => {
    // Reset infinite scroll state before search
    items.value = [];

    router.get(
        window.route("music.index"),
        {
            search: searchQuery.value || undefined,
        },
        {
            preserveState: false, // Don't preserve state to ensure fresh data
            replace: true,
        }
    );
};

const clearSearch = () => {
    // Reset infinite scroll state before clearing search
    items.value = [];
    searchQuery.value = "";

    router.get(
        window.route("music.index"),
        {},
        {
            preserveState: false, // Don't preserve state to ensure fresh data
            replace: true,
        }
    );
};

const syncPlaylist = () => {
    if (syncing.value) return;

    syncing.value = true;
    router.post(
        window.route("music.sync"),
        {},
        {
            onFinish: () => {
                syncing.value = false;
            },
        }
    );
};
</script>
