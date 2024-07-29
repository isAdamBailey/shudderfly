<script setup>
import { Link, router, usePage } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { onMounted, ref, watch } from "vue";
import useGetYouTubeVideo from "@/composables/useGetYouTubeVideo";

const props = defineProps({
    photos: {
        type: Object,
        required: true,
    },
});

const uploads = ref(props.photos.data);
const infiniteScroll = ref(null);
let observer = null;

watch(
    () => usePage().props.search,
    (newSearch) => {
        if (newSearch) {
            uploads.value = props.photos.data;
        }
    },
    { immediate: true }
);

onMounted(async () => {
    uploads.value = props.photos.data;
    observer = new IntersectionObserver((entries) =>
        entries.forEach((entry) => entry.isIntersecting && fetchUploads(), {
            rootMargin: "-150px 0px 0px 0px",
        })
    );
    observer.observe(infiniteScroll.value);
});

function fetchUploads() {
    router.get(
        props.photos.next_page_url,
        {},
        {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                uploads.value = [...uploads.value, ...page.props.photos.data];
            },
        }
    );
}

function videoId(link) {
    const { videoId } = useGetYouTubeVideo(link);
    return videoId.value;
}
</script>

<template>
    <div
        v-if="uploads.length"
        class="mt-3 md:mt-0 mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-1 md:p-4"
    >
        <div
            v-for="photo in uploads"
            :key="photo.id"
            class="shadow-sm rounded-lg overflow-hidden"
        >
            <div class="relative flex justify-center flex-wrap">
                <Link
                    class="w-full h-full"
                    :href="
                        route('books.show', {
                            book: photo.book.slug,
                            pageId: photo.id,
                        })
                    "
                >
                    <LazyLoader
                        v-if="photo.media_path"
                        classes="rounded-top pointer-events-none"
                        :src="photo.media_path"
                        :is-cover="true"
                    />
                    <div v-if="photo.video_link">
                        <VideoWrapper
                            :id="videoId(photo.video_link)"
                            :controls="false"
                        />
                    </div>
                    <div
                        v-if="photo.content"
                        class="absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                        v-html="photo.content"
                    ></div>

                    <Button class="w-full rounded-t-none truncate">{{
                        photo.book.title
                    }}</Button>
                </Link>
            </div>
        </div>
    </div>
    <div v-else class="flex flex-col items-center mt-10">
        <h2
            class="font-semibold text-2xl text-gray-900 dark:text-gray-100 leading-tight"
        >
            I don't see anything here
        </h2>
        <ManEmptyCircle />
    </div>
    <div ref="infiniteScroll"></div>
</template>
