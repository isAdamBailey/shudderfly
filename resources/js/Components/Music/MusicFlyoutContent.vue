<template>
    <div class="flex flex-col">
        <!-- Header -->
        <div
            ref="headingRef"
            class="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700"
        >
            <button @click="applyFilter()">
                <h2
                    class="font-heading text-2xl text-indigo-600 dark:text-gray-100 leading-tight"
                >
                    {{ title }}
                </h2>
            </button>
            <div v-if="canAdmin" class="flex gap-2">
                <Button
                    :disabled="syncing"
                    class="text-sm"
                    @click="syncPlaylist"
                >
                    <span v-if="syncing">Syncing...</span>
                    <span v-else>Sync</span>
                </Button>
                <Button class="text-sm" @click="showAddForm = !showAddForm">
                    Add
                </Button>
            </div>
        </div>

        <!-- Add song form (admin only) -->
        <form
            v-if="canAdmin && showAddForm"
            class="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2"
            @submit.prevent="submitAddSong"
        >
            <input
                v-model="addSongInput"
                type="text"
                placeholder="Paste a YouTube link or Share text"
                class="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-md p-2 text-sm"
            />
            <div class="flex items-center gap-2">
                <Button
                    type="submit"
                    :disabled="addingSong || !addSongInput.trim()"
                    class="text-sm"
                >
                    <span v-if="addingSong">Adding...</span>
                    <span v-else>Add song</span>
                </Button>
                <span
                    v-if="addSongFeedback"
                    class="text-xs"
                    :class="
                        addSongFeedback.type === 'error'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400'
                    "
                >
                    {{ addSongFeedback.text }}
                </span>
            </div>
        </form>

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
            <Button
                type="button"
                :is-active="isNewest"
                :disabled="loading"
                class="rounded-full my-2"
                :title="t('music.filter_newest')"
                @click="applyFilter('newest')"
            >
                <i class="ri-sort-desc text-2xl"></i>
            </Button>
            <Button
                type="button"
                :is-active="isOldest"
                :disabled="loading"
                class="rounded-full my-2"
                :title="t('music.filter_oldest')"
                @click="applyFilter('oldest')"
            >
                <i class="ri-sort-asc text-2xl"></i>
            </Button>
        </div>

        <!-- Song List -->
        <div>
            <div v-if="items.length > 0" class="bg-white dark:bg-gray-800">
                <SongListItem
                    v-for="song in items"
                    :key="song.id"
                    :song="song"
                    :current-song="currentSong"
                    :is-playing="isPlaying"
                    :can-delete="canAdmin"
                    @play="playSong"
                    @delete="deleteSong"
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
                <h2
                    class="mb-8 font-semibold text-xl text-gray-100 leading-tight"
                >
                    {{ notFoundContent }}
                </h2>
                <ManEmptyCircle />
            </div>
        </div>

        <ConfirmDialog
            v-model:show="confirmShow"
            :title="confirmTitle"
            :message="confirmMessage"
            :confirm-label="confirmOkLabel || t('common.ok')"
            :cancel-label="confirmCancelLabel || t('common.cancel')"
            :confirm-variant="confirmVariant"
            @confirm="confirmOnOk"
            @cancel="confirmOnCancel"
        />
    </div>
</template>

<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import ConfirmDialog from "@/Components/ConfirmDialog.vue";
import SongListItem from "@/Components/Music/SongListItem.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { useConfirmDialog } from "@/composables/useConfirmDialog";
import { usePermissions } from "@/composables/permissions";
import { useMusicPlayer } from "@/composables/useMusicPlayer";
import { useTranslations } from "@/composables/useTranslations";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router } from "@inertiajs/vue3";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const { speak } = useSpeechSynthesis();
const { t } = useTranslations();
const {
    show: confirmShow,
    message: confirmMessage,
    title: confirmTitle,
    confirmLabel: confirmOkLabel,
    cancelLabel: confirmCancelLabel,
    confirmVariant,
    ask: askConfirm,
    onConfirmed: confirmOnOk,
    onCancelled: confirmOnCancel,
} = useConfirmDialog();
const { canAdmin } = usePermissions();
const {
    currentSong,
    isPlaying,
    playSong: playSongGlobal,
    toggleCurrentSongPlayback,
    setSongsList,
    removeSongFromList,
    setSearch,
    setFilter,
} = useMusicPlayer();

const emit = defineEmits(["play", "reload"]);

const notFoundContent = computed(() => t("search.not_found_music"));

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
    scrollRootEl: {
        type: [Object, null],
        default: null,
    },
});

const syncing = ref(false);
const loading = ref(false);
const showAddForm = ref(false);
const addSongInput = ref("");
const addingSong = ref(false);
const addSongFeedback = ref(null); // { type: "error"|"warning", text: string }
const infiniteScrollRef = ref(null);
const headingRef = ref(null);
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

const isNewest = computed(() => {
    return props.filter === "newest";
});

const isOldest = computed(() => {
    return props.filter === "oldest";
});

const getTitle = (search, filter) => {
    if (search) {
        return t("music.title_search", { search });
    }
    if (filter === "favorites") {
        return t("music.title_favorites");
    }
    if (filter === "newest") {
        return t("music.title_newest");
    }
    if (filter === "oldest") {
        return t("music.title_oldest");
    }
    return t("music.title_latest");
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
                "X-Requested-With": "XMLHttpRequest",
            },
        });

        if (response.ok) {
            const data = await response.json();
            const newItems = (data.songs.data || []).map((song) => ({
                ...song,
                loading: false,
            }));
            items.value = [...items.value, ...newItems];
            nextPageUrl.value = data.songs.next_page_url || null;
            setSongsList(items.value);
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
                loading: false,
            }));
            nextPageUrl.value = newSongs.next_page_url || null;
            fetchedPages.clear();
            setSongsList(items.value);
            if (items.value.length === 0) {
                speak(notFoundContent.value);
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

const fetchWithCsrf = (url, options = {}) =>
    fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": document
                .querySelector('meta[name="csrf-token"]')
                .getAttribute("content"),
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
            ...options.headers,
        },
    });

const playSong = (song) => {
    if (currentSong.value && currentSong.value.id === song.id) {
        toggleCurrentSongPlayback();
        return;
    }
    playSongGlobal(song);
    if (props.scrollRootEl) {
        props.scrollRootEl.scrollTo({ top: 0, behavior: "smooth" });
    }
};

const deleteSong = async (song) => {
    const confirmText = song.is_manual
        ? `Delete "${song.title}"?`
        : `Delete "${song.title}"? This will also remove it from the YouTube playlist.`;
    const ok = await askConfirm(confirmText);
    if (!ok) {
        return;
    }

    try {
        const response = await fetchWithCsrf(route("music.destroy", song.id), {
            method: "DELETE",
        });

        if (response.ok) {
            items.value = items.value.filter((s) => s.id !== song.id);
            removeSongFromList(song.id);
        } else {
            const data = await response.json();
            alert(data.error || "Failed to delete song.");
        }
    } catch (error) {
        console.error("Error deleting song:", error);
        alert("Failed to delete song.");
    }
};

const applyFilter = async (filter) => {
    loading.value = true;
    setFilter(filter || "");

    const titleToSpeak = getTitle(props.search, filter);
    speak(titleToSpeak);

    emit("reload", { filter: filter || null, search: props.search || null });

    await nextTick();
    if (props.scrollRootEl && headingRef.value) {
        const rootRect = props.scrollRootEl.getBoundingClientRect();
        const headingRect = headingRef.value.getBoundingClientRect();
        const top =
            props.scrollRootEl.scrollTop + (headingRect.top - rootRect.top);
        props.scrollRootEl.scrollTo({ top, behavior: "smooth" });
    }

    loading.value = false;
};

const submitAddSong = async () => {
    if (addingSong.value || !addSongInput.value.trim()) return;

    addingSong.value = true;
    addSongFeedback.value = null;

    try {
        const response = await fetchWithCsrf(route("music.store"), {
            method: "POST",
            body: JSON.stringify({ youtube_video_id: addSongInput.value }),
        });

        const data = await response.json();

        if (response.ok) {
            addSongInput.value = "";
            if (data.warning) {
                addSongFeedback.value = { type: "warning", text: data.warning };
            } else {
                showAddForm.value = false;
            }
            emit("reload", {
                filter: props.filter || null,
                search: props.search || null,
            });
        } else {
            addSongFeedback.value = {
                type: "error",
                text: data.error || "Failed to add song.",
            };
        }
    } catch (error) {
        console.error("Error adding song:", error);
        addSongFeedback.value = { type: "error", text: "Failed to add song." };
    } finally {
        addingSong.value = false;
    }
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
            },
        }
    );
};

const setupObserver = () => {
    if (observer) {
        observer.disconnect();
    }

    if (!infiniteScrollRef.value || !props.scrollRootEl) {
        return;
    }

    observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (
                    entry.isIntersecting &&
                    nextPageUrl.value &&
                    !loadingMore.value
                ) {
                    fetchMore();
                }
            });
        },
        {
            root: props.scrollRootEl,
            rootMargin: "0px 0px 100px 0px",
            threshold: 0.1,
        }
    );

    observer.observe(infiniteScrollRef.value);
};

onMounted(async () => {
    await nextTick();
    setupObserver();
});

watch([infiniteScrollRef, () => props.scrollRootEl], async () => {
    await nextTick();
    setupObserver();
});

onUnmounted(() => {
    if (observer) {
        observer.disconnect();
    }
});
</script>
