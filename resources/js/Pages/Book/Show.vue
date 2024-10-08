<template>
    <Head :title="book.title" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <SearchInput route-name="books.search" label="Books" />
            <div class="bg-gray-200 p-3 my-5 rounded-lg">
                <Link :href="removePageParam(pages.path)" class="w-full">
                    <div class="flex justify-center text-center mb-3">
                        <h2
                            class="font-heading text-5xl text-gray-900 leading-tight"
                        >
                            {{ book.title.toUpperCase() }}
                        </h2>
                    </div>
                    <div class="flex justify-center items-center flex-wrap">
                        <img
                            v-if="book.cover_image?.media_path"
                            class="object-cover max-h-80 rounded-lg mr-2"
                            :src="book.cover_image.media_path"
                            alt="cover image"
                        />
                        <div>
                            <p v-if="book.author" class="mr-3 font-bold">
                                by: {{ book.author }}
                            </p>
                            <p>
                                {{ short(book.created_at) }}
                            </p>
                            <p>{{ pages.total }} pages</p>
                        </div>
                    </div>
                </Link>
                <div class="flex justify-between">
                    <div v-if="book.excerpt" class="flex-grow text-center mt-3">
                        <h2 class="italic leading-tight">
                            {{ book.excerpt }}
                        </h2>
                    </div>
                    <Button
                        type="button"
                        class="max-h-12"
                        :disabled="speaking"
                        @click="readTitleAndExcerpt"
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </Button>
                </div>
            </div>
            <div class="p-2 flex justify-end flex-nowrap align-middle">
                <div class="flex max-h-10">
                    <Button
                        v-if="canEditPages"
                        type="button"
                        :class="pageSettingsOpen ? '!bg-red-700' : ''"
                        class="ml-2 rounded-none font-bold px-12"
                        @click="togglePageSettings"
                    >
                        <span v-if="pageSettingsOpen">Close</span>
                        <span v-else>Add Page</span>
                    </Button>
                    <Button
                        v-if="canEditPages"
                        type="button"
                        :class="bookSettingsOpen ? '!bg-red-700' : ''"
                        class="ml-2 rounded-none font-bold px-12"
                        @click="toggleBookSettings"
                    >
                        <span v-if="bookSettingsOpen">Close</span>
                        <span v-else>Edit Book</span>
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
                class="relative flex justify-center flex-wrap"
            >
                <Link
                    class="w-full"
                    :href="route('pages.show', { page, increment: true })"
                >
                    <LazyLoader v-if="mediaPath(page)" :src="mediaPath(page)" />
                    <div class="pointer-events-auto">
                        <VideoWrapper
                            v-if="page.video_link"
                            class="pointer-events-none"
                            :url="embedUrl(page.video_link)"
                            :controls="false"
                        />
                    </div>
                    <div
                        v-if="page.content"
                        class="absolute inset-x-0 top-0 rounded-t-lg w-full truncate bg-white/70 py-2.5 text-center text-sm leading-4 text-black backdrop-blur-sm line-clamp-1"
                        v-html="page.content"
                    ></div>
                </Link>
            </div>
        </div>
        <div ref="infiniteScroll"></div>
        <ScrollTop />
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BreezeValidationErrors from "@/Components/ValidationErrors.vue";
import { Head, Link, router } from "@inertiajs/vue3";
import Button from "@/Components/Button.vue";
import { onMounted, ref } from "vue";
import NewPageForm from "@/Pages/Book/NewPageForm.vue";
import EditBookForm from "@/Pages/Book/EditBookForm.vue";
import { usePermissions } from "@/composables/permissions";
import { useDate } from "@/dateHelpers";
import SearchInput from "@/Components/SearchInput.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import LazyLoader from "@/Components/LazyLoader.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import useGetYouTubeVideo from "@/composables/useGetYouTubeVideo";
import ScrollTop from "@/Components/ScrollTop.vue";

const { canEditPages } = usePermissions();
const { short } = useDate();
const { speak, speaking } = useSpeechSynthesis();

const props = defineProps({
    book: { type: Object, required: true },
    pages: { type: Object, required: true },
    authors: { type: Array, required: true },
});

let pageSettingsOpen = ref(false);
let bookSettingsOpen = ref(false);

const items = ref(props.pages.data);
const infiniteScroll = ref(null);
let observer = null;

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
    router.get(
        props.pages.next_page_url,
        {},
        {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                items.value = [...items.value, ...page.props.pages.data];
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

function embedUrl(link) {
    const { embedUrl } = useGetYouTubeVideo(link, { noControls: true });
    return embedUrl;
}

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

    items.value = props.pages.data;
    observer = new IntersectionObserver((entries) =>
        entries.forEach((entry) => entry.isIntersecting && fetchPages(), {
            rootMargin: "-150px 0px 0px 0px",
        })
    );
    observer.observe(infiniteScroll.value);
});
</script>
