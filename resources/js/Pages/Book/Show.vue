<template>
    <Head :title="book.title" />

    <BreezeAuthenticatedLayout>
        <template #header>
            <div class="relative overflow-hidden">
                <div
                    v-if="book.category"
                    class="absolute left-2 sm:left-4 lg:left-8 top-2 z-30"
                >
                    <Link
                        :href="
                            route('categories.show', {
                                categoryName: book.category?.name,
                            })
                        "
                        class="inline-flex min-h-11 items-center gap-2 px-4 py-2 rounded-full border font-semibold text-xs uppercase tracking-widest transition ease-in-out duration-150 bg-theme-primary text-theme-button border-theme-primary hover:text-theme-button-hover hover:bg-theme-button active:bg-theme-button focus:border-theme-button focus:shadow-theme-button"
                    >
                        <i
                            class="ri-folder-fill text-sm"
                            aria-hidden="true"
                        ></i>
                        <span>{{ book.category.name }}</span>
                    </Link>
                </div>
                <BookCover :book="book" :pages="pages" />
            </div>
        </template>

        <div
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10"
            :class="{ 'pb-48': isBulkMode }"
        >
            <div v-if="book.latitude != null && book.longitude != null">
                <Accordion title="Map" :dark-background="true">
                    <MapEmbed
                        :latitude="book.latitude"
                        :longitude="book.longitude"
                        :title="book.title"
                        :book-title="book.title"
                        heading=""
                        :show-street-view="true"
                    />
                </Accordion>
            </div>

            <div
                id="pages"
                class="flex items-center justify-between gap-3 scroll-mt-16"
            >
                <div class="flex flex-wrap items-center gap-3">
                    <div
                        role="group"
                        :aria-label="t('book.sort_group')"
                        class="flex flex-wrap gap-2"
                    >
                        <Button
                            type="button"
                            :is-active="isNewest"
                            :disabled="sortLoading"
                            class="rounded-full !px-3 !py-3 min-h-11 min-w-11 justify-center"
                            :aria-label="`${t('book.sort_group')}: ${t(
                                'book.sort_newest'
                            )}`"
                            @click="sortPages('newest')"
                        >
                            <i
                                class="ri-time-line text-2xl"
                                aria-hidden="true"
                            ></i>
                        </Button>
                        <Button
                            type="button"
                            :is-active="isOldest"
                            :disabled="sortLoading"
                            class="rounded-full !px-3 !py-3 min-h-11 min-w-11 justify-center"
                            :aria-label="`${t('book.sort_group')}: ${t(
                                'book.sort_oldest'
                            )}`"
                            @click="sortPages('oldest')"
                        >
                            <i
                                class="ri-history-line text-2xl"
                                aria-hidden="true"
                            ></i>
                        </Button>
                        <Button
                            type="button"
                            :is-active="isPopular"
                            :disabled="sortLoading"
                            class="rounded-full !px-3 !py-3 min-h-11 min-w-11 justify-center"
                            :aria-label="`${t('book.sort_group')}: ${t(
                                'book.sort_favorites'
                            )}`"
                            @click="sortPages('popular')"
                        >
                            <i
                                class="ri-star-line text-2xl"
                                aria-hidden="true"
                            ></i>
                        </Button>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                        v-if="isMoviesCategory"
                        :href="route('movie-cast.index', { title: book.title })"
                    >
                        <Button
                            type="button"
                            class="h-11 w-11 flex items-center justify-center"
                            :title="`Search cast for ${book.title}`"
                            :aria-label="`Search cast for ${book.title}`"
                        >
                            <i
                                class="ri-film-line text-xl"
                                aria-hidden="true"
                            ></i>
                        </Button>
                    </Link>

                    <SpeakButton
                        :disabled="speaking"
                        aria-label="Speak book title and excerpt"
                        icon-class="ri-speak-fill text-lg"
                        @click="readTitleAndExcerpt"
                    />
                </div>
            </div>

            <FormModal
                v-if="canEditPages"
                :show="activeTab === 'pages'"
                :title="t('book.add_pages_title')"
                max-width="3xl"
                :closeable="!newPageUploading"
                :submit-ref="newPageFormRef"
                @close="closeAllTabs"
            >
                <BreezeValidationErrors class="mb-4" />
                <NewPageForm
                    ref="newPageFormRef"
                    :book="book"
                    @close-form="closeAllTabs"
                />
            </FormModal>

            <FormModal
                v-if="canEditPages"
                :show="activeTab === 'book'"
                :title="t('book.edit_book_title')"
                :submit-ref="editBookFormRef"
                @close="closeAllTabs"
            >
                <BreezeValidationErrors class="mb-4" />
                <EditBookForm
                    ref="editBookFormRef"
                    :book="book"
                    :authors="authors"
                    :categories="categories"
                    @close-form="closeAllTabs"
                />
            </FormModal>

            <div
                v-if="items.length > 0"
                class="grid gap-3 grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]"
            >
                <div
                    v-for="(page, index) in items"
                    :key="page.id"
                    class="group rounded-lg bg-gray-800 shadow-sm relative overflow-hidden h-80 transition-shadow duration-200"
                    :class="
                        isBulkMode
                            ? [
                                  'cursor-pointer select-none focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400',
                                  isSelected(page.id)
                                      ? 'ring-4 ring-blue-500 shadow-lg shadow-blue-500/30'
                                      : 'ring-1 ring-white/10',
                              ]
                            : 'ring-1 ring-white/10 hover:shadow-md hover:ring-white/20'
                    "
                    :role="isBulkMode ? 'checkbox' : undefined"
                    :aria-checked="isBulkMode ? isSelected(page.id) : undefined"
                    :aria-label="
                        isBulkMode
                            ? t('book.bulk.select_page_aria', {
                                  number: index + 1,
                              })
                            : undefined
                    "
                    :tabindex="isBulkMode ? 0 : undefined"
                    :data-test="isBulkMode ? 'bulk-select-tile' : undefined"
                    @click="isBulkMode ? togglePageSelection(page.id) : null"
                    @keydown.space.prevent="
                        isBulkMode ? togglePageSelection(page.id) : null
                    "
                    @keydown.enter.prevent="
                        isBulkMode ? togglePageSelection(page.id) : null
                    "
                >
                    <!-- Selection chrome sits above the title bar, media and
                         type pills (z-10/z-20) so it is never hidden. -->
                    <template v-if="isBulkMode">
                        <div
                            class="pointer-events-none absolute inset-0 z-30 rounded-lg transition-colors duration-150"
                            :class="
                                isSelected(page.id)
                                    ? 'bg-blue-600/35 ring-4 ring-inset ring-blue-500'
                                    : 'bg-black/10'
                            "
                            aria-hidden="true"
                        ></div>
                        <div
                            class="pointer-events-none absolute bottom-3 right-3 z-30 flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-lg transition-colors duration-150"
                            :class="
                                isSelected(page.id)
                                    ? 'border-white bg-blue-600 text-white'
                                    : 'border-white/90 bg-black/40 text-transparent'
                            "
                            aria-hidden="true"
                        >
                            <i class="ri-check-line text-2xl font-bold"></i>
                        </div>
                    </template>

                    <component
                        :is="isBulkMode ? 'div' : Link"
                        :prefetch="!isBulkMode || undefined"
                        :href="
                            !isBulkMode
                                ? route('pages.show', { page: page?.id })
                                : undefined
                        "
                        as="button"
                        replace
                        class="relative w-full h-full block focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset"
                        @click="!isBulkMode ? setItemLoading(page) : undefined"
                    >
                        <div
                            v-if="page.loading"
                            class="absolute inset-0 flex items-center justify-center bg-black/50 z-20"
                        >
                            <span class="animate-spin text-yellow-200">
                                <i
                                    class="ri-loader-line text-3xl"
                                    aria-hidden="true"
                                ></i>
                            </span>
                        </div>
                        <LazyLoader
                            v-if="mediaPath(page)"
                            :src="mediaPath(page)"
                            :object-fit="'cover'"
                            :fill-container="true"
                        />
                        <VideoWrapper
                            v-if="page.video_link"
                            :url="page.video_link"
                            :controls="false"
                            :fill-container="true"
                        />
                        <div
                            v-if="page.content"
                            class="absolute inset-x-0 top-0 rounded-t-lg w-full truncate bg-black/60 py-2.5 text-left px-2 text-sm leading-4 text-gray-100 backdrop-blur-sm line-clamp-1 z-10"
                            v-html="page.content"
                        ></div>
                    </component>
                </div>
            </div>
            <div
                v-else-if="!(canEditPages && activeTab === 'pages')"
                class="flex flex-col items-center py-8"
            >
                <h2
                    class="mb-8 text-center font-semibold text-2xl text-gray-100 leading-tight text-balance"
                >
                    {{ t("book.no_pages") }}
                </h2>
                <ManEmptyCircle />
            </div>
            <div ref="infiniteScrollRef"></div>

            <Deferred data="similarBooks">
                <template #fallback>
                    <div
                        class="space-y-3"
                        role="status"
                        aria-live="polite"
                        aria-label="Loading similar books"
                    >
                        <div
                            class="h-8 w-72 max-w-full rounded bg-gray-700 animate-pulse"
                        ></div>
                        <div
                            class="horizontal-scroll-strip flex gap-3 overflow-hidden pb-2"
                        >
                            <div
                                v-for="n in 4"
                                :key="n"
                                class="h-64 w-48 shrink-0 rounded-lg bg-gray-700 animate-pulse"
                            ></div>
                        </div>
                    </div>
                </template>
                <SimilarBooks
                    v-if="similarBooks"
                    :books="similarBooks"
                    label="You might also like these books"
                />
            </Deferred>
            <Deferred data="relatedSongs">
                <template #fallback>
                    <div
                        class="space-y-3"
                        role="status"
                        aria-live="polite"
                        aria-label="Loading related songs"
                    >
                        <div
                            class="h-8 w-48 max-w-full rounded bg-gray-700 animate-pulse"
                        ></div>
                        <div
                            class="horizontal-scroll-strip flex gap-3 overflow-hidden pb-2"
                        >
                            <div
                                v-for="n in 4"
                                :key="n"
                                class="h-28 w-48 shrink-0 rounded-lg bg-gray-700 animate-pulse"
                            ></div>
                        </div>
                    </div>
                </template>
                <RelatedSongs v-if="relatedSongs" :songs="relatedSongs" />
            </Deferred>
        </div>
        <!-- In selection mode the action bar owns the bottom of the screen,
             so the floating buttons step aside instead of overlapping it. -->
        <BulkActionsForm
            v-if="isBulkMode"
            :book="book"
            :books="books"
            :selected-pages="selectedPages"
            :page-ids="items.map((page) => page.id)"
            @close-form="closeAllTabs"
            @selection-changed="handleSelectionChanged"
        />
        <ScrollTop v-if="!isBulkMode" />
        <FloatingActionMenu v-if="$page.props.auth.user && !isBulkMode">
            <ShareToChatButton
                kind="book"
                :book-id="book.slug"
                :menu-item="true"
                wrapper-class="w-full"
            />
            <ActionMenuItem
                v-if="canEditPages"
                icon="ri-add-line"
                icon-class="text-emerald-600 dark:text-emerald-400"
                label="Add Pages"
                :active="activeTab === 'pages'"
                @click="setActiveTab('pages')"
            />
            <ActionMenuItem
                v-if="canEditPages"
                icon="ri-edit-line"
                icon-class="text-blue-600 dark:text-blue-400"
                label="Edit Book"
                :active="activeTab === 'book'"
                @click="setActiveTab('book')"
            />
            <ActionMenuItem
                v-if="canEditPages"
                icon="ri-checkbox-multiple-line"
                icon-class="text-amber-600 dark:text-amber-400"
                label="Bulk Actions"
                :active="activeTab === 'bulk'"
                @click="setActiveTab('bulk')"
            />
        </FloatingActionMenu>
    </BreezeAuthenticatedLayout>
</template>

<script setup>
import Accordion from "@/Components/Accordion.vue";
import ActionMenuItem from "@/Components/ActionMenuItem.vue";
import BookCover from "@/Components/BookCover.vue";
import Button from "@/Components/Button.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import FloatingActionMenu from "@/Components/FloatingActionMenu.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import MapEmbed from "@/Components/Map/MapEmbed.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import BreezeValidationErrors from "@/Components/ValidationErrors.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import FormModal from "@/Components/FormModal.vue";
import { usePermissions } from "@/composables/permissions";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BulkActionsForm from "@/Pages/Book/BulkActionsForm.vue";
import EditBookForm from "@/Pages/Book/EditBookForm.vue";
import NewPageForm from "@/Pages/Book/NewPageForm.vue";
import RelatedSongs from "@/Pages/Book/RelatedSongs.vue";
import SimilarBooks from "@/Pages/Book/SimilarBooks.vue";
import { Deferred, Head, Link, router } from "@inertiajs/vue3";
import { computed, onMounted, ref, unref } from "vue";

/* global route */

defineOptions({
    name: "BookShowPage",
});

const { canEditPages } = usePermissions();
const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();

const props = defineProps({
    book: { type: Object, required: true },
    pages: { type: Object, required: true },
    sort: { type: String, default: "newest" },
    authors: { type: Array, required: true },
    categories: { type: Array, default: null },
    similarBooks: { type: Array, default: null },
    relatedSongs: { type: Array, default: null },
    books: { type: Array, default: null },
});

const { items, infiniteScrollRef, setItemLoading } = useInfiniteScroll(
    props.pages.data,
    computed(() => props.pages)
);

const sortLoading = ref(false);

const isNewest = computed(() => props.sort === "newest");
const isOldest = computed(() => props.sort === "oldest");
const isPopular = computed(() => props.sort === "popular");
const isMoviesCategory = computed(() => props.book.category?.name === "movies");

function sortPages(sortValue) {
    sortLoading.value = true;
    const sortKeys = {
        oldest: "book.sort_oldest",
        popular: "book.sort_favorites",
    };
    speak(t(sortKeys[sortValue] || "book.sort_newest"));
    router.get(
        route("books.show", { book: props.book.slug, sort: sortValue }) +
            "#pages",
        {},
        {
            preserveScroll: false,
            onFinish: () => {
                sortLoading.value = false;
            },
        }
    );
}

let activeTab = ref(null);
let selectedPages = ref([]);

const newPageFormRef = ref(null);
const editBookFormRef = ref(null);
const newPageUploading = computed(() => newPageFormRef.value?.isUploading);

const isBulkMode = computed(
    () => unref(canEditPages) && activeTab.value === "bulk"
);

const isSelected = (pageId) => selectedPages.value.includes(pageId);

const setActiveTab = (tab) => {
    if (activeTab.value === tab) {
        activeTab.value = null;
    } else {
        activeTab.value = tab;
    }

    if (activeTab.value !== "bulk") {
        selectedPages.value = [];
    } else {
        // The grid is what you select from, so bring it into view.
        document
            .getElementById("pages")
            ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    }
};

const closeAllTabs = () => {
    activeTab.value = null;
    selectedPages.value = [];
};

const togglePageSelection = (pageId) => {
    const index = selectedPages.value.indexOf(pageId);
    if (index > -1) {
        selectedPages.value.splice(index, 1);
    } else {
        selectedPages.value.push(pageId);
    }
};

const handleSelectionChanged = (newSelection) => {
    selectedPages.value = newSelection;
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
        activeTab.value = "pages";
    }
});
</script>
