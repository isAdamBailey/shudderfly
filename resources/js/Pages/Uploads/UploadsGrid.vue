<script setup>
import LazyLoader from "@/Components/LazyLoader.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { Link, router, usePage } from "@inertiajs/vue3";
import { onMounted, ref, watch } from "vue";

const props = defineProps({
    photos: {
        type: Object,
        required: true,
    },
});

const uploads = ref(
    props.photos.data.map((photo) => ({ ...photo, loading: false }))
);
const infiniteScroll = ref(null);
let observer = null;
const fetchedPages = new Set();

watch(
    () => usePage().props.search,
    (newSearch) => {
        if (newSearch) {
            uploads.value = props.photos.data.map((photo) => ({
                ...photo,
                loading: false,
            }));
        }
    },
    { immediate: true }
);

onMounted(async () => {
    observer = new IntersectionObserver((entries) =>
        entries.forEach((entry) => entry.isIntersecting && fetchUploads(), {
            rootMargin: "-150px 0px 0px 0px",
        })
    );
    observer.observe(infiniteScroll.value);
});

function fetchUploads() {
    const nextPageUrl = props.photos.next_page_url;
    if (fetchedPages.has(nextPageUrl)) {
        return;
    }
    fetchedPages.add(nextPageUrl);
    router.get(
        nextPageUrl,
        {},
        {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                uploads.value = [
                    ...uploads.value,
                    ...props.photos.data.map((photo) => ({
                        ...photo,
                        loading: false,
                    })),
                ];
                window.history.replaceState({}, "", usePage().url);
            },
        }
    );
}

function mediaPath(photo) {
    if (photo.media_poster) {
        return photo.media_poster;
    }
    return photo.media_path;
}

function setUploadLoading(photo) {
    photo.loading = true;
}
</script>

<template>
    <div
        v-if="uploads.length"
        class="mt-3 md:mt-0 mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-2 md:p-4"
    >
        <div
            v-for="photo in uploads"
            :key="photo.id"
            class="relative flex justify-center flex-wrap shadow-sm rounded-lg overflow-hidden bg-gray-300"
        >
            <Link
                prefetch
                class="w-full max-h-80"
                :href="route('pages.show', photo)"
                @click="setUploadLoading(photo)"
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
                    class="h-full w-full object-cover"
                />
                <VideoWrapper
                    v-if="photo.video_link"
                    :url="photo.video_link"
                    :controls="false"
                />
                <div
                    v-if="photo.content"
                    class="absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                    v-html="photo.content"
                ></div>
            </Link>
        </div>
    </div>
    <div v-else class="flex flex-col items-center mt-10">
        <h2
            class="mb-8 font-semibold text-2xl text-gray-900 dark:text-gray-100 leading-tight"
        >
            I don't see any uploads like that
        </h2>
        <ManEmptyCircle />
    </div>
    <div ref="infiniteScroll"></div>
</template>
