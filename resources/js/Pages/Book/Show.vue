<template>
    <Head :title="book.title" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <SearchInput route-name="books.index" label="Books" />
            <div
                class="bg-theme-primary p-3 mt-5 rounded-t-lg relative bg-cover bg-center"
                :style="{
                    backgroundImage: book.cover_image?.media_path
                        ? `url(${book.cover_image.media_path})`
                        : '',
                }"
            >
                <Link :href="route('books.show', book)" class="w-full h-full">
                    <div class="flex flex-col justify-between h-full">
                        <div class="flex justify-center text-center mb-3">
                            <h1
                                class="font-heading text-5xl text-theme-book-title leading-tight bg-white/70 backdrop-blur p-2 rounded"
                            >
                                {{ book.title.toUpperCase() }}
                            </h1>
                        </div>
                        <div class="flex justify-center items-center flex-wrap">
                            <div
                                class="bg-white/70 backdrop-blur p-2 rounded dark:text-gray-700 christmas:text-christmas-berry"
                            >
                                <p v-if="book.author" class="mr-3 font-bold">
                                    by: {{ book.author }}
                                </p>
                                <p>
                                    {{ short(book.created_at) }}
                                </p>
                                <p>{{ pages.total }} pages</p>
                                <p>
                                    Read
                                    {{
                                        Math.round(
                                            book.read_count
                                        ).toLocaleString()
                                    }}
                                    times
                                </p>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
            <div class="flex justify-between bg-theme-secondary rounded-b-lg">
                <div
                    v-if="book.excerpt"
                    class="flex-grow text-center my-3 text-theme-secondary"
                >
                    <p class="italic leading-tight">
                        {{ book.excerpt }}
                    </p>
                </div>
            </div>
            <div class="p-2 flex justify-end flex-nowrap align-middle">
                <div class="flex max-h-10">
                    <Button
                        v-if="canEditPages"
                        type="button"
                        :class="pageSettingsOpen ? '!bg-red-700' : ''"
                        class="ml-2 font-bold px-12"
                        @click="togglePageSettings"
                    >
                        <span v-if="pageSettingsOpen">Close</span>
                        <span v-else>Add Page</span>
                    </Button>
                    <Button
                        v-if="canEditPages"
                        type="button"
                        :class="bookSettingsOpen ? '!bg-red-700' : ''"
                        class="ml-2 font-bold px-12"
                        @click="toggleBookSettings"
                    >
                        <span v-if="bookSettingsOpen">Close</span>
                        <span v-else>Edit Book</span>
                    </Button>
                    <Button
                        type="button"
                        class="ml-2 text-gray-100"
                        :disabled="speaking"
                        @click="readTitleAndExcerpt"
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </Button>
                </div>
            </div>
        </template>
        <div
            v-if="canEditPages && pageSettingsOpen"
            class="w-full mt-4 md:ml-2"
        >
            <div>
                <BreezeValidationErrors class="mb-4" />
            </div>
            <div class="flex flex-col md:flex-row justify-around">
                <NewPageForm
                    :book="book"
                    @close-form="pageSettingsOpen = false"
                />
            </div>
        </div>

        <div
            v-if="canEditPages && bookSettingsOpen"
            class="w-full mt-4 md:ml-2"
        >
            <div>
                <BreezeValidationErrors class="mb-4" />
            </div>
            <div class="flex flex-col md:flex-row justify-around">
                <EditBookForm
                    :book="book"
                    :authors="authors"
                    :categories="categories"
                    @close-form="bookSettingsOpen = false"
                />
            </div>
        </div>

        <div
            class="mt-3 md:mt-0 mx-auto grid max-w-7xl gap-2 md:p-4 grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]"
        >
            <div
                v-for="page in items"
                :key="page.id"
                class="rounded-lg bg-gray-300 shadow-sm relative flex justify-center flex-wrap overflow-hidden"
            >
                <Link
                    prefetch
                    class="w-full max-h-80"
                    :href="route('pages.show', page)"
                    as="button"
                    replace
                    @click="setItemLoading(page)"
                >
                    <div
                        v-if="page.loading"
                        class="absolute inset-0 flex items-center justify-center bg-white/70"
                    >
                        <span class="animate-spin text-black"
                            ><i class="ri-loader-line text-3xl"></i
                        ></span>
                    </div>
                    <LazyLoader
                        v-if="mediaPath(page)"
                        :src="mediaPath(page)"
                        class="h-full w-full object-cover"
                    />
                    <VideoWrapper
                        v-if="page.video_link"
                        :url="page.video_link"
                        :controls="false"
                    />
                    <div
                        v-if="page.content"
                        class="absolute inset-x-0 top-0 rounded-t-lg w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                        v-html="page.content"
                    ></div>
                </Link>
            </div>
        </div>
        <div ref="infiniteScrollRef"></div>
        <Deferred data="similarBooks">
            <template #fallback>
                <div class="text-gray-900 dark:text-gray-100">Loading...</div>
            </template>
            <SimilarBooks
                v-if="similarBooks"
                :books="similarBooks"
                label="You might also like these books"
            />
        </Deferred>
        <ScrollTop />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import Button from "@/Components/Button.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import SearchInput from "@/Components/SearchInput.vue";
import BreezeValidationErrors from "@/Components/ValidationErrors.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import EditBookForm from "@/Pages/Book/EditBookForm.vue";
import NewPageForm from "@/Pages/Book/NewPageForm.vue";
import SimilarBooks from "@/Pages/Book/SimilarBooks.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useDate } from "@/dateHelpers";
import { Head, Link } from "@inertiajs/vue3";
import { onMounted, ref, computed } from "vue";

const { canEditPages } = usePermissions();
const { short } = useDate();
const { speak, speaking } = useSpeechSynthesis();

const props = defineProps({
    book: { type: Object, required: true },
    pages: { type: Object, required: true },
    authors: { type: Array, required: true },
    categories: { type: Array, default: null },
    similarBooks: { type: Array, default: null },
});

const { items, infiniteScrollRef, setItemLoading } = useInfiniteScroll(
    props.pages.data,
    computed(() => props.pages)
);

let pageSettingsOpen = ref(false);
let bookSettingsOpen = ref(false);

const togglePageSettings = () => {
    pageSettingsOpen.value = !pageSettingsOpen.value;
    if (bookSettingsOpen.value) {
        bookSettingsOpen.value = false;
    }
};

const toggleBookSettings = () => {
    bookSettingsOpen.value = !bookSettingsOpen.value;
    if (pageSettingsOpen.value) {
        pageSettingsOpen.value = false;
    }
};

const stripHtml = (html) => {
    if (!html) {
        return "";
    }
    return html.replace(/<\/?[^>]+(>|$)/g, "");
};

const readTitleAndExcerpt = () => {
    speak(stripHtml(props.book.title));
    if (props.book.excerpt) {
        speak(stripHtml(props.book.excerpt));
    }
};

function mediaPath(page) {
    if (page.media_poster) {
        return page.media_poster;
    }
    return page.media_path;
}

onMounted(() => {
    if (props.pages.total === 0) {
        pageSettingsOpen.value = true;
    }
});
</script>
