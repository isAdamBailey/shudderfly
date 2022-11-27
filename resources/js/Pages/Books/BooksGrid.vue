<script setup>
import { Link } from "@inertiajs/inertia-vue3";

defineProps({
    books: Object,
});
</script>

<template>
    <div
        class="mt-3 md:mt-0 mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(22rem,1fr))] gap-2 md:p-4"
    >
        <Link
            v-for="book in books.data"
            :key="book.id"
            :href="route('books.show', book.slug)"
            class="border-2 rounded border-gray-900 overflow-hidden shadow-sm mx-3"
        >
            <div
                class="p-6 bg-gradient-to-r from-white to-yellow-100 h-full flex flex-col justify-between"
            >
                <div
                    class="flex flex-wrap justify-between mb-5 border-b border-gray-900"
                >
                    <h3 class="font-bold text-3xl w-full">{{ book.title }}</h3>
                    <p v-if="book.author" class="text-sm text-grey-900">
                        by: {{ book.author }}
                    </p>
                </div>
                <div class="flex justify-center flex-wrap">
                    <p class="prose mb-5">{{ book.excerpt }}</p>
                    <img
                        v-if="book.pages[0]?.image_path"
                        class="w-52 rounded-lg ml-1"
                        :src="book.pages[0].image_path"
                        alt="cover image"
                    />
                </div>
                <span class="text-sm text-gray-900 font-bold"
                    >{{ book.pages_count }}
                    <span class="text-gray-500">pages</span></span
                >
            </div>
        </Link>
    </div>
</template>
