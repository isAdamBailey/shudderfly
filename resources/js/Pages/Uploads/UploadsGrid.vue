<script setup>
import { Link } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";

import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";

defineProps({
    photos: Array,
});

function embedUrl(link) {
    if (link) {
        const parts = link.split("/");
        const idAndParams = parts[parts.length - 1];
        const videoId = idAndParams.includes("=")
            ? new URLSearchParams(idAndParams).get("v")
            : idAndParams;
        return `https://www.youtube.com/embed/${videoId}?controls=0&modestbranding=1&rel=0`;
    }
    return null;
}
</script>

<template>
    <div
        v-if="photos.length"
        class="mt-3 md:mt-0 mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2 md:p-4"
    >
        <div
            v-for="photo in photos"
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
</template>
