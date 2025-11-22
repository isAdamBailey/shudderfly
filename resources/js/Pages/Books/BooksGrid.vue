<template>
    <div v-if="loading" class="h-36 flex justify-center pt-10">
        <span class="animate-pulse text-2xl text-theme-primary font-bold"
            >Loading {{ title }}...</span
        >
    </div>
    <div v-else-if="workingBooks.length > 0">
        <div class="flex justify-between items-center ml-3 my-3">
            <Link
                :href="
                    route('categories.show', {
                        categoryName: props.category.name,
                    })
                "
                class="ml-2 text-2xl text-theme-primary font-heading hover:underline cursor-pointer transition"
            >
                {{ title }}
            </Link>
            <button
                class="px-2 py-1 mr-3 rounded-md bg-theme-primary text-theme-button"
                @click="speak(title)"
            >
                <i class="ri-speak-line text-xl"></i>
            </button>
        </div>
        <div
            ref="content"
            class="flex snap-x space-x-1 overflow-x-auto overflow-y-hidden pb-2 scrollbar scrollbar-thumb-gray-500 scrollbar-thumb-rounded -webkit-overflow-scrolling: touch overscroll-x-contain"
            @scroll="handleScroll"
            @touchmove="handleScroll"
            @touchend="handleScroll"
        >
            <BookCoverCard
                v-for="book in workingBooks"
                :key="book.id"
                :book="book"
                container-class="w-48 h-64 shrink-0 snap-start"
                title-size="text-base sm:text-lg"
                @click="setBookLoading"
            />
        </div>
    </div>
</template>

<script setup>
/* global route */
import BookCoverCard from "@/Components/BookCoverCard.vue";
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

const handleScroll = debounce(
    async () => {
        if (!content.value) return;

        const contentWidth = content.value.offsetWidth;
        const scrollLeft = content.value.scrollLeft;
        const scrollWidth = content.value.scrollWidth;

        // Increase buffer zone for mobile devices
        const scrollBuffer = 100;
        const isNearEnd =
            scrollLeft + contentWidth + scrollBuffer >= scrollWidth;

        if (nextUrl.value && isNearEnd) {
            try {
                const response = await fetchBooks();
                if (response?.data?.books) {
                    books.value = [...books.value, ...response.data.books.data];
                    nextUrl.value = response.data.books.next_page_url;
                }
            } catch (error) {
                console.error("Error fetching more books:", error);
            }
        }
    },
    50,
    { leading: true, trailing: true, maxWait: 100 }
);

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
