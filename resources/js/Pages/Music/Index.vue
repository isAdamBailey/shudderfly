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
            <div class="flex justify-between items-center">
                <button @click="applyFilter()">
                    <h2
                        class="font-heading text-3xl text-theme-title leading-tight"
                    >
                        {{ title }}
                    </h2>
                </button>
                <Button
                    v-if="canSync"
                    :disabled="syncing"
                    @click="syncPlaylist"
                >
                    <span v-if="syncing">Syncing...</span>
                    <span v-else>Sync</span>
                </Button>
            </div>
        </template>

        <div class="p-2 pb-0 flex flex-wrap justify-around">
            <Button
                type="button"
                :is-active="isFavorites"
                :disabled="loading"
                class="rounded-full my-3"
                @click="applyFilter('favorites')"
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

            <div v-else class="flex flex-col items-center mt-10">
                <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
                    {{ notFoundContent }}
                </h2>
                <ManEmptyCircle />
            </div>
        </div>

        <ScrollTop />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import { Head, router, usePage } from "@inertiajs/vue3";
import { ref, computed, watch } from "vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import Button from "@/Components/Button.vue";
import MusicPlayer from "@/Components/MusicPlayer.vue";
import SongListItem from "@/Components/SongListItem.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";

const { speak } = useSpeechSynthesis();

const notFoundContent = "I can't find any music like that";

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
            if (items.value.length === 0) {
                speak(notFoundContent);
            }
        }
    },
    { immediate: true }
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

const applyFilter = (filter) => {
    loading.value = true;
    speak(title.value);
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
