<script setup>
import { Link } from "@inertiajs/inertia-vue3";
import Button from "@/Components/Button.vue";
import LazyImage from "@/Components/LazyImage.vue";
import { useMedia } from "@/mediaHelpers";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";

const { isVideo } = useMedia();

defineProps({
    photos: Array,
});
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
                <video
                    v-if="isVideo(photo.image_path)"
                    controls
                    preload="none"
                    poster="/img/video-placeholder.png"
                    class="rounded"
                >
                    <source :src="photo.image_path" />
                    Your browser does not support the video tag.
                </video>
                <LazyImage
                    v-else-if="photo.image_path"
                    classes="rounded-top"
                    :src="photo.image_path"
                />
                <div
                    v-if="photo.content"
                    class="absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                    v-html="photo.content"
                ></div>
                <Link
                    class="w-full"
                    :href="route('books.show', photo.book.slug)"
                >
                    <Button class="w-full rounded-t-none"
                        >See Book {{ photo.book.title }}</Button
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
