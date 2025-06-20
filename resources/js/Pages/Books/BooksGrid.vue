<template>
    <div v-if="loading" class="h-36 flex justify-center pt-10">
        <span class="animate-pulse text-2xl text-theme-primary font-bold"
            >Loading {{ title }}...</span
        >
    </div>
    <div v-else-if="workingBooks.length > 0">
        <div class="flex items-center ml-3 my-3">
            <button class="px-2 py-1 rounded-md bg-theme-primary text-theme-button" @click="speak(title)">
                <i class="ri-speak-line text-xl"></i>
            </button>
            <h3 class="ml-2 text-2xl text-theme-primary font-heading">
                {{ title }}
            </h3>
        </div>
        <div
            ref="content"
            class="flex snap-x space-x-1 overflow-x-auto overflow-y-hidden pb-2 scrollbar scrollbar-thumb-gray-500 scrollbar-thumb-rounded -webkit-overflow-scrolling: touch overscroll-x-contain"
            @scroll="handleScroll"
            @touchmove="handleScroll"
            @touchend="handleScroll"
        >
            <Link
                v-for="book in workingBooks"
                :key="book.id"
                prefetch
                as="button"
                :href="route('books.show', { book: book.slug })"
                class="relative w-60 h-60 overflow-hidden shrink-0 snap-start rounded-lg transition hover:opacity-80 hover:shadow hover:shadow-gray-300/50"
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
                <div v-else class="w-full h-full">
                    <div
                        class="line-clamp-2 font-heading bg-theme-primary text-theme-button text-center uppercase text-2xl"
                    >
                        {{ book.title.toUpperCase() }}
                    </div>
                    <div
                        v-if="book.excerpt"
                        class="rounded-b-lg absolute inset-x-0 bottom-0 w-full truncate bg-white/70 py-2.5 text-left px-2 text-sm leading-4 text-black backdrop-blur-sm line-clamp-1 z-10"
                    >
                        {{ book.excerpt }}
                    </div>
                    <LazyLoader
                        :src="book.cover_image?.media_path"
                        :alt="`${book.title} cover image`"
                        :is-cover="true"
                        :object-fit="'cover'"
                        :fill-container="true"
                    />
                </div>
            </Link>
        </div>
    </div>
</template>

<script setup>
import LazyLoader from "@/Components/LazyLoader.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { Link } from "@inertiajs/vue3";
import axios from "axios";
import { debounce } from "lodash";
import { computed, onMounted, ref } from "vue";

const { speak } = useSpeechSynthesis();

const props = defineProps({
    category: {
        type: Object,
        required: true,
    },
    label: {
        type: String,
        default: null,
    },
});

const title = computed(() => {
    if (props.label) {
        return props.label;
    }
    return capitalize(props.category.name);
});
const books = ref([]);
const content = ref(null);
const nextUrl = ref(null);
let loading = ref(true);

const handleScroll = debounce(async () => {
    if (!content.value) return;
    
    const contentWidth = content.value.offsetWidth;
    const scrollLeft = content.value.scrollLeft;
    const scrollWidth = content.value.scrollWidth;
    
    // Increase buffer zone for mobile devices
    const scrollBuffer = 100;
    const isNearEnd = (scrollLeft + contentWidth + scrollBuffer) >= scrollWidth;

    if (nextUrl.value && isNearEnd) {
        try {
            const response = await fetchBooks();
            if (response?.data?.books) {
                books.value = [...books.value, ...response.data.books.data];
                nextUrl.value = response.data.books.next_page_url;
            }
        } catch (error) {
            console.error('Error fetching more books:', error);
        }
    }
}, 50, { leading: true, trailing: true, maxWait: 100 });

onMounted(async () => {
    const response = await fetchBooks();
    books.value = response.data.books.data.map((book) => ({
        ...book,
        loading: false,
    }));
    nextUrl.value = response.data.books.next_page_url;
    loading.value = false;
});

const workingBooks = computed(() => {
    return (
        props.category.books?.map((book) => ({ ...book, loading: false })) ||
        books.value
    );
});

async function fetchBooks() {
    const response = await axios.get(
        nextUrl.value ||
            route("books.category", { categoryName: props.category.name }),
        {
            preserveState: true,
        }
    );
    if (response?.data?.books) {
        response.data.books.data.forEach((book) => (book.loading = false));
    }
    return response;
}

function capitalize(string) {
    return string[0].toUpperCase() + string.slice(1);
}

function setBookLoading(book) {
    book.loading = true;
}
</script>
