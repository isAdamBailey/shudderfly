<script setup>
import { Link } from "@inertiajs/inertia-vue3";
import Button from "@/Components/Button.vue";

defineProps({
    photos: Array,
});
</script>

<template>
    <div
        class="mt-3 md:mt-0 mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(22rem,1fr))] gap-2 md:p-4"
    >
        <div v-for="photo in photos" :key="photo.id" class="shadow-sm">
            <div class="flex justify-center flex-wrap">
                <img
                    class="w-full rounded-t"
                    :src="photo.image_path"
                    alt="cover image"
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
