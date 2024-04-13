<script setup>
import { Link, router } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { onMounted, ref, watch } from "vue";
import useGetYouTubeVideoId from "@/composables/useGetYouTubeVideoId";

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
    () => props.photos,
    (newPhotos) => {
        if (newPhotos.search) {
            uploads.value = newPhotos.data;
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
    const { videoId } = useGetYouTubeVideoId(link);
    return `https://www.youtube.com/embed/${videoId.value}?controls=0&modestbranding=1&rel=0`;
}
</script>

<template>
    <div
        v-if="uploads.length"
        class="mt-3 md:mt-0 mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2 md:p-4"
    >
        <div
            v-for="photo in uploads"
            :key="photo.id"
            class="shadow-sm rounded-lg overflow-hidden"
        >
            <div class="relative flex justify-center flex-wrap">
                <LazyLoader
                    v-if="photo.image_path"
                    classes="rounded-top"
                    :src="photo.image_path"
                    :is-cover="true"
                />
                <div v-if="photo.video_link" class="video-container">
                    <iframe
                        :title="photo.description"
                        :src="embedUrl(photo.video_link)"
                        frameborder="0"
                        allow="accelerometer; encrypted-media;"
                    ></iframe>
                </div>
                <div
                    v-if="photo.content"
                    class="absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                    v-html="photo.content"
                ></div>
                <Link
                    class="w-full"
                    :href="
                        route('books.show', {
                            book: photo.book.slug,
                            pageId: photo.id,
                        })
                    "
                >
                    <Button class="w-full rounded-t-none"
                        >See Fart in {{ photo.book.title }}</Button
                    >
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
