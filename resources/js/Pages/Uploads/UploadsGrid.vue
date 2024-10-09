<script setup>
import { Link, router, usePage } from "@inertiajs/vue3";
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

function embedUrl(link) {
    const { embedUrl } = useGetYouTubeVideo(link, { noControls: true });
    return embedUrl;
}

function mediaPath(photo) {
    if (photo.media_poster) {
        return photo.media_poster;
    }
    return photo.media_path;
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
                    class="w-full h-28"
                    :href="
                        route('pages.show', { page: photo, increment: true })
                    "
                >
                    <LazyLoader
                        v-if="mediaPath(photo)"
                        classes="rounded-top pointer-events-none"
                        :src="mediaPath(photo)"
                        :is-cover="true"
                    />
                    <div v-if="photo.video_link">
                        <VideoWrapper
                            :url="embedUrl(photo.video_link)"
                            :controls="false"
                        />
                    </div>
                    <div
                        v-if="photo.content"
                        class="absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                        v-html="photo.content"
                    ></div>
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
