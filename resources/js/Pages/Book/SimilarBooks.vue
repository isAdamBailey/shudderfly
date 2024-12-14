<template>
    <div v-if="workingBooks.length > 0" class="md:pl-3 mt-10">
        <h3
            class="pt-2 text-2xl text-yellow-200 dark:text-gray-100 font-heading"
        >
            {{ label }}
        </h3>
        <div
            class="flex snap-x space-x-1 overflow-y-hidden pb-2 scrollbar scrollbar-thumb-gray-500 scrollbar-thumb-rounded"
        >
            <Link
                v-for="book in workingBooks"
                :key="book.id"
                :href="route('books.show', { book: book.slug })"
                class="relative w-48 overflow-hidden shrink-0 snap-start rounded-lg bg-white shadow-gray-200/50 transition hover:opacity-80 hover:shadow hover:shadow-gray-300/50"
                @click="setBookLoading(book)"
            >
                <div
                    v-if="book.loading"
                    class="absolute inset-0 flex items-center justify-center bg-white/70"
                >
                    <span class="animate-spin text-black"
                        ><i class="ri-loader-line text-3xl"></i
                    ></span>
                </div>
                <div v-else>
                    <div
                        class="rounded-t-lg absolute inset-x-0 top-0 w-full truncate bg-white/70 py-2.5 text-center leading-4 text-black font-bold backdrop-blur-sm line-clamp-1"
                    >
                        {{ book.title.toUpperCase() }}
                    </div>
                    <div
                        v-if="book.excerpt"
                        class="rounded-b-lg absolute inset-x-0 bottom-0 w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                    >
                        {{ book.excerpt }}
                    </div>
                    <div class="h-36">
                        <LazyLoader
                            :src="book.cover_image?.media_path"
                            :alt="`${book.title} cover image`"
                            :is-cover="true"
                        />
                    </div>
                </div>
            </Link>
        </div>
    </div>
</template>

<script setup>
import LazyLoader from "@/Components/LazyLoader.vue";
import { Link } from "@inertiajs/vue3";
import { computed } from "vue";

const props = defineProps({
    books: {
        type: Array,
        required: true,
    },
    label: {
        type: String,
        default: null,
    },
});

const workingBooks = computed(() => {
    return props.books?.map((book) => ({ ...book, loading: false })) || [];
});

function setBookLoading(book) {
    book.loading = true;
}
</script>
