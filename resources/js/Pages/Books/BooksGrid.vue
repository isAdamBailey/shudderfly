<template>
    <div v-if="loading" class="h-36 flex justify-center pt-10">
        <span
            class="animate-pulse text-xl text-gray-100 font-bold dark:text-gray-800"
            >Loading {{ category.name }} books...</span
        >
    </div>
    <div v-else-if="workingBooks.length > 0">
        <h3
            class="pl-3 mt-3 text-xl text-gray-100 font-bold dark:text-gray-800"
        >
            {{ capitalize(category.name) }}
        </h3>
        <div
            ref="content"
            class="flex snap-x space-x-5 overflow-x-scroll overflow-y-hidden pb-6 scrollbar scrollbar-thumb-gray-500 scrollbar-thumb-rounded"
            @scroll="handleScroll"
        >
            <Link
                v-for="book in workingBooks"
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
import { ref, onMounted, computed } from "vue";
import axios from "axios";

const props = defineProps({
    category: {
        type: Object,
        required: true,
    },
});

const books = ref([]);
const content = ref(null);
const nextUrl = ref(null);
let loading = ref(true);

const handleScroll = async () => {
    const contentWidth = content.value.offsetWidth;
    const scrollLeft = content.value.scrollLeft;
    const scrollWidth = content.value.scrollWidth;
    if (nextUrl.value && scrollLeft >= scrollWidth - contentWidth) {
        const response = await fetchBooks();
        if (response?.data?.books) {
            books.value = [...books.value, ...response.data.books.data];
            nextUrl.value = response.data.books.next_page_url;
        }
    }
};

onMounted(async () => {
    const response = await fetchBooks();
    books.value = response.data.books.data;
    nextUrl.value = response.data.books.next_page_url;
    loading.value = false;
});

const workingBooks = computed(() => {
    return props.category.books || books.value;
});

function fetchBooks() {
    return axios.get(
        nextUrl.value ||
            route("books.category", { categoryName: props.category.name }),
        {
            preserveState: true,
        }
    );
}

function capitalize(string) {
    return string[0].toUpperCase() + string.slice(1);
}
</script>
