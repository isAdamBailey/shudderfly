<template>
    <Head :title="book.title" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <SearchInput route-name="books.search" label="Books" class="mb-2" />
            <Link :href="pages.first_page_url" class="w-full">
                <div class="flex justify-between flex-wrap">
                    <div class="flex items-center">
                        <img
                            v-if="book.cover_image?.media_path"
                            class="object-cover max-h-12 rounded mr-2"
                            :src="book.cover_image.media_path"
                            alt="cover image"
                        />
                        <h2
                            class="font-bold text-2xl text-gray-900 leading-tight"
                        >
                            {{ book.title.toUpperCase() }}
                        </h2>
                    </div>
                    <div>
                        <p
                            v-if="book.author"
                            class="mr-3 font-bold text-gray-100"
                        >
                            by: {{ book.author }}
                        </p>
                        <p class="text-xs text-gray-100">
                            {{ short(book.created_at) }}
                        </p>
                        <p class="text-xs text-gray-100">
                            {{ pages.total }} pages
                        </p>
                    </div>
                </div>
            </Link>
        </template>

        <div
            :class="!book.excerpt ? 'justify-end' : 'justify-between'"
            class="p-2 flex flex-nowrap align-middle bg-yellow-200 dark:bg-gray-800"
        >
            <div v-if="book.excerpt">
                <h2
                    class="italic text-sm text-gray-900 dark:text-gray-100 leading-tight"
                >
                    {{ book.excerpt }}
                </h2>
            </div>
            <Button
                v-if="!canEditPages"
                type="button"
                :disabled="speaking"
                @click="readTitleAndExcerpt"
            >
                <i class="ri-speak-fill text-xl"></i>
            </Button>
            <div v-if="canEditPages" class="flex max-h-10">
                <Button
                    type="button"
                    class="md:mb-0 ml-4 rounded-none font-bold px-12 bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                    @click="togglePageSettings"
                >
                    <span v-if="pageSettingsOpen">Close</span>
                    <span v-else>Add Page</span>
                </Button>
                <Button
                    type="button"
                    class="md:ml-4 rounded-none font-bold px-12 bg-red-700 dark:bg-red-700 hover:bg-pink-400 dark:hover:bg-pink-400"
                    @click="toggleBookSettings"
                >
                    <span v-if="bookSettingsOpen">Close</span>
                    <span v-else>Edit Book</span>
                </Button>
            </div>
        </div>
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
            <div v-for="page in items" :key="page.id" class="overflow-hidden">
                <div class="relative flex justify-center flex-wrap">
                    <Link class="w-full h-28" href="">
                        <LazyLoader
                            v-if="page.media_path"
                            :src="page.media_path"
                            :is-cover="true"
                        />
                        <div v-if="page.video_link">
                            <VideoWrapper
                                :id="videoId(page.video_link)"
                                :controls="false"
                            />
                        </div>
                    </Link>
                </div>
            </div>
        </div>
        <div ref="infiniteScroll"></div>
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

function videoId(link) {
    const { videoId } = useGetYouTubeVideo(link);
    return videoId.value;
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
