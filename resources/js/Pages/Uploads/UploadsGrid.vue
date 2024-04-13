<script setup>
import { Link, router } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import { onMounted, ref } from "vue";

const props = defineProps({
    photos: {
        type: Object,
        required: true,
    },
});

const uploads = ref(props.photos.data);
const infiniteScroll = ref(null);
let observer = null;

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
    if (link) {
        let videoId = null;

        if (link.includes("watch?v=")) {
            const urlObj = new URL(link);
            const params = new URLSearchParams(urlObj.search);
            videoId = params.get("v");
        } else {
            const parts = link.split("/");
            const idAndParams = parts[parts.length - 1];
            videoId = idAndParams.includes("=")
                ? new URLSearchParams(idAndParams).get("v")
                : idAndParams;
        }

        return videoId
            ? `https://www.youtube.com/embed/${videoId}?controls=0&modestbranding=1&rel=0`
            : null;
    }
    return null;
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
