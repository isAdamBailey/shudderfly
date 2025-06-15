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
                prefetch
                :href="route('books.show', { book: book.slug })"
                class="relative w-60 h-60 overflow-hidden shrink-0 snap-start rounded-lg bg-white shadow-gray-200/50 transition hover:opacity-80 hover:shadow hover:shadow-gray-300/50"
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
                        class=" line-clamp-2 font-heading bg-theme-primary text-theme-button text-center uppercase text-2xl"
                    >
                        {{ book.title.toUpperCase() }}
                    </div>
                    <div
                        v-if="book.excerpt"
                        class="rounded-b-lg absolute inset-x-0 bottom-0 w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1 z-10"
                    >
                        {{ book.excerpt }}
                    </div>
                    <LazyLoader
                        :src="book.cover_image?.media_path"
                        :alt="`${book.title} cover image`"
                        :is-cover="true"
                        class="w-full h-full object-cover absolute inset-0"
                    />
                </div>
            </Link>
        </div>
    </div>
</template>

<script setup>
import LazyLoader from "@/Components/LazyLoader.vue";
import { Link } from "@inertiajs/vue3";
import { computed, reactive } from "vue";

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
    return (
        props.books?.map((book) => reactive({ ...book, loading: false })) || []
    );
});

function setBookLoading(book) {
    book.loading = true;
}
</script>
