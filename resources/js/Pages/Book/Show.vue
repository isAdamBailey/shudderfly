<template>
    <Head :title="book.title" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <SearchInput route-name="books.index" label="Books" />
            <div
                class="h-96 bg-blue-600 dark:bg-gray-800 christmas:bg-christmas-green p-3 mt-5 rounded-t-lg relative bg-cover bg-center"
                :style="{
                    backgroundImage: book.cover_image?.media_path
                        ? `url(${book.cover_image.media_path})`
                        : '',
                }"
            >
                <Link :href="removePageParam(pages.path)" class="w-full h-full">
                    <div class="flex flex-col justify-between h-full">
                        <div class="flex justify-center text-center mb-3">
                            <h2
                                class="font-heading text-5xl text-blue-600 dark:text-gray-800 christmas:text-christmas-berry leading-tight bg-white/70 backdrop-blur p-2 rounded"
                            >
                                {{ book.title.toUpperCase() }}
                            </h2>
                        </div>
                        <div class="flex justify-center items-center flex-wrap">
                            <div
                                class="bg-white/70 backdrop-blur p-2 rounded christmas:text-christmas-berry"
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
            <div
                class="flex justify-between bg-gray-300 christmas:bg-christmas-holly rounded-b-lg"
            >
                <div
                    v-if="book.excerpt"
                    class="flex-grow text-center my-3 christmas:text-christmas-snow"
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
                        class="ml-2"
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
            class="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-2 pt-3 md:p-3"
        >
            <div
                v-for="page in items"
                :key="page.id"
                class="rounded-lg bg-gray-300 shadow-sm relative flex justify-center flex-wrap overflow-hidden"
            >
                <Link
                    class="w-full min-h-28 max-h-36"
                    :href="route('pages.show', { page })"
                    @click="setPageLoading(page)"
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
        <div ref="infiniteScroll"></div>
        <SimilarBooks
            v-if="similarBooks"
            :books="similarBooks"
            label="You might also like these books"
        />
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
import { useDate } from "@/dateHelpers";
import { Head, Link, router } from "@inertiajs/vue3";
import { onMounted, ref } from "vue";

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

let pageSettingsOpen = ref(false);
let bookSettingsOpen = ref(false);

const items = ref(
    props.pages.data.map((page) => ({ ...page, loading: false }))
);
const infiniteScroll = ref(null);
let observer = null;
const fetchedPages = new Set();

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

function fetchPages() {
    const nextPageUrl = props.pages.next_page_url;
    if (!nextPageUrl || fetchedPages.has(nextPageUrl)) {
        return;
    }
    fetchedPages.add(nextPageUrl);
    router.get(
        nextPageUrl,
        {},
        {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                items.value = [
                    ...items.value,
                    ...page.props.pages.data.map((page) => ({
                        ...page,
                        loading: false,
                    })),
                ];
            },
        }
    );
}

function removePageParam(url) {
    const parsedUrl = new URL(url, window.location.origin);
    parsedUrl.searchParams.delete("page");
    return parsedUrl.toString();
}

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

function setPageLoading(page) {
    page.loading = true;
}

onMounted(() => {
    if (props.pages.total === 0) {
        pageSettingsOpen.value = true;
    }

    items.value = props.pages.data.map((page) => ({ ...page, loading: false }));
    observer = new IntersectionObserver((entries) =>
        entries.forEach((entry) => entry.isIntersecting && fetchPages(), {
            rootMargin: "-150px 0px 0px 0px",
        })
    );
    observer.observe(infiniteScroll.value);
});
</script>
