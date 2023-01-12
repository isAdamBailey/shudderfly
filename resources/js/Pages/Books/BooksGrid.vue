<script setup>
import { Link } from "@inertiajs/inertia-vue3";
import { useDate } from "@/dateHelpers";

const { short } = useDate();

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
            class="border-2 rounded border-gray-900 overflow-hidden shadow-sm mx-3 dark:text-white"
        >
            <div
                class="p-6 bg-gradient-to-r from-white dark:from-gray-700 dark:via-gray-900 to-yellow-100 dark:to-black h-full flex flex-col justify-between"
            >
                <h3 class="font-bold text-3xl w-full">{{ book.title }}</h3>
                <div
                    class="flex flex-wrap justify-between mb-5 border-b border-gray-900"
                >
                    <p
                        v-if="book.author"
                        class="text-sm text-gray-900 dark:text-white"
                    >
                        by: {{ book.author }}
                    </p>
                    <p>
                        <span class="text-xs text-gray-900 dark:text-white">
                            On {{ short(book.created_at) }}
                        </span>
                    </p>
                </div>
                <div class="flex justify-center flex-wrap">
                    <p class="prose mb-5 dark:text-white">{{ book.excerpt }}</p>
                    <img
                        v-if="book.pages[0]?.image_path"
                        class="w-52 rounded-lg ml-1"
                        :src="book.pages[0].image_path"
                        alt="cover image"
                    />
                </div>
                <span class="text-sm text-gray-900 dark:text-white font-bold"
                    >{{ book.pages_count }}
                    <span class="text-gray-500 dark:text-white"
                        >pages</span
                    ></span
                >
            </div>
        </Link>
    </div>
</template>
