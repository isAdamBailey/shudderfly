<script setup>
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { Link, usePage } from "@inertiajs/vue3";
import { computed, watch } from "vue";

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
    if (photo.media_poster) {
        return photo.media_poster;
    }
    return photo.media_path;
}
</script>

<template>
    <div
        v-if="items.length"
        class="mt-3 md:mt-0 mx-auto grid max-w-7xl gap-2 md:p-4 grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]"
    >
        <div
            v-for="photo in items"
            :key="photo.id"
            class="relative flex flex-col justify-between shadow-sm rounded-lg overflow-hidden bg-gray-300 h-[400px]"
        >
            <Link
                prefetch="hover"
                as="button"
                class="w-full h-[350px] rounded-b-lg"
                :href="route('pages.show', photo)"
                @click="setItemLoading(photo)"
            >
                <div
                    v-if="photo.loading"
                    class="absolute inset-0 flex items-center justify-center bg-white/70"
                >
                    <span class="animate-spin text-black"
                        ><i class="ri-loader-line text-3xl"></i
                    ></span>
                </div>
                <LazyLoader
                    v-if="mediaPath(photo)"
                    :src="mediaPath(photo)"
                    :is-cover="true"
                    class="h-full w-full"
                    :object-fit="'cover'"
                />
                <VideoWrapper
                    v-if="photo.video_link"
                    :url="photo.video_link"
                    :controls="false"
                />
                <div
                    v-if="photo.content"
                    class="absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 px-2 text-left text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                    v-html="photo.content"
                ></div>
            </Link>
            <Link
                :href="route('books.show', photo.book)"
                prefetch="hover"
                class="w-full h-[50px]"
            >
                <Button class="w-full h-full rounded-t-none rounded-b-lg whitespace-normal text-left">
                    <span class="line-clamp-2">{{ photo.book.title }}</span>
                </Button>
            </Link>
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
