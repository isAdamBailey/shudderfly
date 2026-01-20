<script setup>
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { Link, usePage } from "@inertiajs/vue3";
import { computed, watch } from "vue";
import { useMusicPlayer } from "@/composables/useMusicPlayer";

const props = defineProps({
    photos: {
        type: Object,
        required: true,
    },
});

const { items, infiniteScrollRef, setItemLoading } = useInfiniteScroll(
    props.photos.data,
    computed(() => props.photos)
);

const { speak } = useSpeechSynthesis();
const { playSong, openFlyout } = useMusicPlayer();

const notFountContent = "I can't find any uploads like that";

watch(
    () => usePage().props.search,
    (newSearch) => {
        if (newSearch) {
            items.value = props.photos.data.map((photo) => ({
                ...photo,
                loading: false,
            }));
            if (items.value.length === 0) {
                speak(notFountContent);
            }
        }
    },
    { immediate: true }
);

function mediaPath(photo) {
    // For songs, return the thumbnail
    if (photo.type === "song") {
        return photo.thumbnail_high || photo.thumbnail_default;
    }
    // For pages, return poster or media path
    if (photo.media_poster) {
        return photo.media_poster;
    }
    return photo.media_path;
}

function handleItemClick(item, event) {
    if (item.type === "song") {
        event.preventDefault();
        // Open flyout and play song
        playSong(item);
        openFlyout();
        return false;
    }
    // For pages, let the Link handle navigation
    return true;
}

function getItemLink(item) {
    if (item.type === "song") {
        // Return # to prevent navigation, we'll handle it with click
        return "#";
    }
    return route("pages.show", item.id);
}

function handleFooterClick(item, event) {
    if (item.type === "song") {
        event.preventDefault();
        // Just open flyout
        openFlyout();
        return false;
    }
    // For books, let the Link handle navigation
    return true;
}

function getFooterLink(item) {
    if (item.type === "song") {
        // Return # to prevent navigation, we'll handle it with click
        return "#";
    }
    return route("books.show", item.book?.slug || item.book?.id);
}

function getFooterText(item) {
    if (item.type === "song") {
        return "Music";
    }
    return item.book?.title || "";
}

function getDisplayText(item) {
    // For songs, use title; for pages, use content
    return item.title || item.content || "";
}
</script>

<template>
    <div
        v-if="items.length"
        class="mt-3 md:mt-0 mx-auto grid max-w-7xl gap-2 md:p-4 grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]"
    >
        <div
            v-for="photo in items"
            :key="`${photo.type}-${photo.id}`"
            class="relative flex flex-col justify-between shadow-sm rounded-lg overflow-hidden bg-gray-300 h-[400px]"
        >
            <div
                v-if="photo.loading"
                class="absolute inset-0 flex items-center justify-center bg-white/70 z-10"
            >
                <span class="animate-spin text-black">
                    <i class="ri-loader-line text-3xl"></i>
                </span>
            </div>
            <Link
                v-if="photo.type !== 'song'"
                prefetch="hover"
                as="button"
                class="relative w-full h-[350px] rounded-b-lg"
                :href="getItemLink(photo)"
                @click="setItemLoading(photo)"
            >
                <LazyLoader
                    v-if="mediaPath(photo)"
                    :src="mediaPath(photo)"
                    :object-fit="'cover'"
                    :fill-container="true"
                    :item-type="photo.type"
                />
                <VideoWrapper
                    v-if="photo.video_link"
                    :url="photo.video_link"
                    :controls="false"
                    :fill-container="true"
                />
                <div
                    v-if="getDisplayText(photo)"
                    class="absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 px-2 text-left text-sm leading-4 text-black backdrop-blur-sm line-clamp-1 z-10"
                    v-html="getDisplayText(photo)"
                ></div>
            </Link>
            <button
                v-else
                type="button"
                class="relative w-full h-[350px] rounded-b-lg"
                @click="handleItemClick(photo, $event)"
            >
                <LazyLoader
                    v-if="mediaPath(photo)"
                    :src="mediaPath(photo)"
                    :object-fit="'cover'"
                    :fill-container="true"
                    :item-type="photo.type"
                />
                <VideoWrapper
                    v-if="photo.video_link"
                    :url="photo.video_link"
                    :controls="false"
                    :fill-container="true"
                />
                <div
                    v-if="getDisplayText(photo)"
                    class="absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 px-2 text-left text-sm leading-4 text-black backdrop-blur-sm line-clamp-1 z-10"
                    v-html="getDisplayText(photo)"
                ></div>
            </button>
            <Link
                v-if="photo.type !== 'song'"
                :href="getFooterLink(photo)"
                prefetch="hover"
                class="w-full h-[50px]"
                :as="photo.loading ? 'span' : 'a'"
                @click="setItemLoading(photo)"
            >
                <Button
                    :disabled="photo.loading"
                    class="w-full h-full rounded-t-none rounded-b-lg whitespace-normal text-left"
                >
                    <span
                        class="line-clamp-2 font-heading text-theme-button uppercase text-lg"
                        >{{ getFooterText(photo) }}</span
                    >
                </Button>
            </Link>
            <button
                v-else
                type="button"
                class="w-full h-[50px]"
                @click="handleFooterClick(photo, $event)"
            >
                <Button
                    :disabled="photo.loading"
                    class="w-full h-full rounded-t-none rounded-b-lg whitespace-normal text-left"
                >
                    <span
                        class="line-clamp-2 font-heading text-theme-button uppercase text-lg"
                        >{{ getFooterText(photo) }}</span
                    >
                </Button>
            </button>
        </div>
    </div>
    <div v-else class="flex flex-col items-center mt-10">
        <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
            {{ notFountContent }}
        </h2>
        <ManEmptyCircle />
    </div>
    <div ref="infiniteScrollRef"></div>
</template>
