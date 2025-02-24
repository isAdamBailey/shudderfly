<template>
    <Link 
        prefetch="mount"
        :href="route('books.show', book)"
        class="flex justify-center"
    >
        <div
            class="w-full md:w-1/2 rounded-full mt-3 px-2 py-2 flex justify-center flex-wrap mb-3 bg-theme-primary text-theme-button border-theme-primary hover:text-theme-button-hover hover:bg-theme-button active:bg-theme-button focus:border-theme-button focus:shadow-theme-button"
        >
            <h2 class="font-heading text-5xl uppercase">
                {{ book.title }}
            </h2>
        </div>
    </Link>
</template>

<script setup>
import { Link } from '@inertiajs/vue3';
defineProps({
    book: { type: Object, required: true },
});
</script>
