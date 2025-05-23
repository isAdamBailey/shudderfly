<template>
    <Link 
        prefetch="hover"
        :href="route('books.show', book)"
        class="flex justify-center group mx-5"
        @click="isLoading = true"
    >
        <div class="relative w-full">
            <div class="absolute inset-0 bg-theme-primary opacity-60 rounded-full mt-3 mb-3 transition-opacity duration-200 group-hover:opacity-100"></div>
            <div class="relative w-full rounded-full mt-3 px-2 py-2 flex justify-center flex-wrap mb-3 border-theme-primary">
                <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/70 rounded-full">
                    <span class="animate-spin text-black">
                        <i class="ri-loader-line text-3xl"></i>
                    </span>
                </div>
                <h2 class="font-heading text-5xl uppercase text-theme-button">
                    {{ book.title }}
                </h2>
            </div>
        </div>
    </Link>
</template>

<script setup>
import { Link } from '@inertiajs/vue3';
import { ref } from 'vue';

defineProps({
    book: { type: Object, required: true },
});

const isLoading = ref(false);
</script>
