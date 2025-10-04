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
                <button @click="filter()">
                    <h2
                        class="font-heading text-3xl text-theme-title leading-tight"
                    >
                        {{ title }}
                    </h2>
                </button>
            </div>
            <div v-if="canSync" class="flex justify-center mb-6 w-full mx-auto">
                <Button :disabled="syncing" @click="syncPlaylist">
                    <span v-if="syncing">Syncing YouTube Playlist...</span>
                    <span v-else>Sync YouTube Playlist</span>
                </Button>
            </div>
        </template>

        <div class="p-2 pb-0 flex flex-wrap justify-around">
            <Button
                type="button"
                :is-active="isFavorites"
                :disabled="loading"
                class="rounded-full my-3"
                @click="filter('favorites')"
            >
                <i class="ri-star-line text-4xl"></i>
            </Button>
        </div>

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
    filter: {
        type: String,
        default: "",
    },
    canSync: {
        type: Boolean,
        default: false,
    },
});

const syncing = ref(false);
const currentSong = ref(null);
const isPlaying = ref(false);
const loading = ref(false);

const isFavorites = computed(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("filter") === "favorites";
});

const title = computed(() => {
    const search = usePage().props.search;
    if (search) {
        return `Music with "${search}"`;
    }
    if (isFavorites.value) {
        return "Your favorite songs";
    }
    return "Latest music";
});

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

const filter = (filter) => {
    loading.value = true;
    router.get(route("music.index", { filter }));
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
