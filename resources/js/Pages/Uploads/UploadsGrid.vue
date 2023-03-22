<script setup>
import { Link } from "@inertiajs/inertia-vue3";
import Button from "@/Components/Button.vue";
import { useMedia } from "@/mediaHelpers";

const { isVideo } = useMedia();

defineProps({
    photos: Array,
});
</script>

<template>
    <div
        class="mt-3 md:mt-0 mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2 md:p-4"
    >
        <div v-for="photo in photos" :key="photo.id" class="shadow-sm">
            <div class="flex justify-center flex-wrap">
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
                <img
                    v-else-if="photo.image_path"
                    class="w-full rounded-t"
                    :src="photo.image_path"
                    alt="image"
                    loading="lazy"
                />
                <Link
                    class="w-full"
                    :href="route('books.show', photo.book.slug)"
                >
                    <Button class="w-full rounded-none"
                        >See Book {{ photo.book.title }}</Button
                    >
                </Link>
            </div>
        </div>
    </div>
</template>
