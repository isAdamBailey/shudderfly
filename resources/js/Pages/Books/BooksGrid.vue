<template>
    <div v-if="category.books?.length">
        <h3
            class="pl-3 mt-3 text-xl text-gray-100 font-bold dark:text-gray-800"
        >
            {{ capitalize(category.name) }}
        </h3>
        <div
            class="flex snap-x space-x-5 overflow-x-scroll overflow-y-hidden pb-6 scrollbar scrollbar-thumb-gray-500 scrollbar-thumb-rounded"
        >
            <Link
                v-for="book in category.books"
                :key="book.id"
                :href="route('books.show', book.slug)"
                class="relative w-48 shrink-0 snap-start rounded-lg bg-white shadow-gray-200/50 transition hover:opacity-80 hover:shadow hover:shadow-gray-300/50"
            >
                <div
                    class="rounded-t-lg absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 text-center text-xl leading-4 text-black backdrop-blur-sm line-clamp-1"
                >
                    {{ book.title }}
                </div>
                <div
                    v-if="book.excerpt"
                    class="rounded-b-lg absolute inset-x-0 bottom-0 w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                >
                    {{ book.excerpt }}
                </div>
                <div class="h-36">
                    <LazyImage
                        :src="book.pages[0]?.image_path"
                        :alt="`${book.title} cover image`"
                    />
                </div>
            </Link>
        </div>
    </div>
</template>

<script setup>
import LazyImage from "@/Components/LazyImage.vue";
import { Link } from "@inertiajs/inertia-vue3";

defineProps({
    category: Object,
});

function capitalize(string) {
    return string[0].toUpperCase() + string.slice(1);
}
</script>
