<template>
  <Head :title="book.title" />

  <BreezeAuthenticatedLayout>
    <template #header>
      <div class="relative">
        <div
          v-if="book.category"
          class="absolute left-2 sm:left-4 lg:left-8 top-2 z-30"
        >
          <Link
            :href="route('categories.show', { categoryName: book.category?.name })"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full border font-semibold text-xs uppercase tracking-widest transition ease-in-out duration-150 bg-theme-primary text-theme-button border-theme-primary hover:text-theme-button-hover hover:bg-theme-button active:bg-theme-button focus:border-theme-button focus:shadow-theme-button"
          >
            <i class="ri-folder-fill text-sm"></i>
            <span>{{ book.category.name }}</span>
          </Link>
        </div>
        <BookCover :book="book" :pages="pages" />
      </div>
    </template>

    <!-- Book Location Map -->
    <div
      v-if="book.latitude != null && book.longitude != null"
      class="mt-3 md:mt-0 mx-auto max-w-7xl md:p-4"
    >
      <div class="bg-gray-800 rounded-lg overflow-hidden">
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
    </div>

    <!-- Actions row -->
    <div id="pages" class="p-2 flex justify-between items-center gap-3 max-w-7xl mx-auto">
      <!-- Sort Buttons -->
      <div class="flex flex-wrap gap-2">
        <Button
          type="button"
          :is-active="isNewest"
          :disabled="sortLoading"
          class="rounded-full"
          @click="sortPages('newest')"
        >
          <i class="ri-time-line text-2xl"></i>
        </Button>
        <Button
          type="button"
          :is-active="isOldest"
          :disabled="sortLoading"
          class="rounded-full"
          @click="sortPages('oldest')"
        >
          <i class="ri-history-line text-2xl"></i>
        </Button>
        <Button
          type="button"
          :is-active="isPopular"
          :disabled="sortLoading"
          class="rounded-full"
          @click="sortPages('popular')"
        >
          <i class="ri-star-line text-2xl"></i>
        </Button>
      </div>

      <!-- Right side actions -->
      <div class="flex gap-2 items-center">
        <Button
          type="button"
          class="text-gray-100"
          :disabled="speaking"
          @click="readTitleAndExcerpt"
        >
          <i class="ri-speak-fill text-lg"></i>
        </Button>

        <!-- Admin dropdown menu -->
        <Dropdown v-if="canEditPages" align="right" width="48">
          <template #trigger>
            <Button type="button" class="text-gray-100">
              <i class="ri-more-2-fill text-lg"></i>
            </Button>
          </template>

          <template #content>
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              :class="{ 'bg-blue-600 text-white hover:bg-blue-700': activeTab === 'pages' }"
              @click="setActiveTab('pages')"
            >
              <i class="ri-add-line mr-2"></i>
              Add Pages
            </button>
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              :class="{ 'bg-blue-600 text-white hover:bg-blue-700': activeTab === 'book' }"
              @click="setActiveTab('book')"
            >
              <i class="ri-edit-line mr-2"></i>
              Edit Book
            </button>
            <button
              type="button"
              class="block w-full px-4 py-2 text-left text-sm leading-5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              :class="{ 'bg-blue-600 text-white hover:bg-blue-700': activeTab === 'bulk' }"
              @click="setActiveTab('bulk')"
            >
              <i class="ri-checkbox-multiple-line mr-2"></i>
              Bulk Actions
            </button>
          </template>
        </Dropdown>
      </div>
    </div>

    <!-- Tab Content -->
    <div v-if="canEditPages && activeTab" class="w-full mt-4 md:ml-2">
      <div class="flex justify-end px-4 mb-2">
        <Button
          type="button"
          class="font-bold px-6 py-2 bg-red-600 hover:bg-red-700 text-white"
          @click="closeAllTabs"
        >
          <i class="ri-close-line mr-1"></i>
          Close
        </Button>
      </div>
      <div>
        <BreezeValidationErrors class="mb-4" />
      </div>
      <div class="flex flex-col md:flex-row justify-around">
        <!-- Add Pages Tab -->
        <div v-if="activeTab === 'pages'" class="w-full md:w-1/2 mx-auto">
          <NewPageForm :book="book" @close-form="closeAllTabs" />
        </div>

        <!-- Edit Book Tab -->
        <div v-if="activeTab === 'book'" class="w-full md:w-1/2 mx-auto">
          <EditBookForm
            :book="book"
            :authors="authors"
            :categories="categories"
            @close-form="closeAllTabs"
          />
        </div>

        <!-- Bulk Actions Tab -->
        <div v-if="activeTab === 'bulk'" class="w-full md:w-1/2 mx-auto">
          <BulkActionsForm
            :book="book"
            :books="books"
            :selected-pages="selectedPages"
            @close-form="closeAllTabs"
            @selection-changed="handleSelectionChanged"
          />
        </div>
      </div>
    </div>

    <div
      class="mt-3 md:mt-0 mx-auto grid max-w-7xl gap-2 md:p-4 grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))]"
    >
      <div
        v-for="page in items"
        :key="page.id"
        class="rounded-lg bg-gray-300 shadow-sm relative overflow-hidden h-80"
        :class="{
          'ring-2 ring-blue-500': selectedPages.includes(page.id),
          'cursor-pointer': activeTab === 'bulk'
        }"
        @click="activeTab === 'bulk' ? togglePageSelection(page.id) : null"
      >
        <!-- Bulk selection checkbox -->
        <div v-if="activeTab === 'bulk'" class="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            :checked="selectedPages.includes(page.id)"
            class="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 pointer-events-none"
            readonly
          />
        </div>

        <Link
          v-if="activeTab !== 'bulk'"
          prefetch
          class="relative w-full h-full block"
          :href="route('pages.show', { page: page?.id })"
          as="button"
          replace
          @click="setItemLoading(page)"
        >
          <div
            v-if="page.loading"
            class="absolute inset-0 flex items-center justify-center bg-white/70 z-20"
          >
            <span class="animate-spin text-black"
              ><i class="ri-loader-line text-3xl"></i
            ></span>
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
            class="absolute inset-x-0 top-0 rounded-t-lg w-full truncate bg-white/70 py-2.5 text-left px-2 text-sm leading-4 text-black backdrop-blur-sm line-clamp-1 z-10"
            v-html="page.content"
          ></div>
        </Link>

        <!-- Content display when in bulk actions mode -->
        <div v-else class="relative w-full h-full block">
          <div
            v-if="page.loading"
            class="absolute inset-0 flex items-center justify-center bg-white/70 z-20"
          >
            <span class="animate-spin text-black"
              ><i class="ri-loader-line text-3xl"></i
            ></span>
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
            class="absolute inset-x-0 top-0 rounded-t-lg w-full truncate bg-white/70 py-2.5 text-left px-2 text-sm leading-4 text-black backdrop-blur-sm line-clamp-1 z-10"
            v-html="page.content"
          ></div>
        </div>
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
import Accordion from "@/Components/Accordion.vue";
import BookCover from "@/Components/BookCover.vue";
import Button from "@/Components/Button.vue";
import Dropdown from "@/Components/Dropdown.vue";
import LazyLoader from "@/Components/LazyLoader.vue";
import MapEmbed from "@/Components/Map/MapEmbed.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import BreezeValidationErrors from "@/Components/ValidationErrors.vue";
import VideoWrapper from "@/Components/VideoWrapper.vue";
import { usePermissions } from "@/composables/permissions";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import BulkActionsForm from "@/Pages/Book/BulkActionsForm.vue";
import EditBookForm from "@/Pages/Book/EditBookForm.vue";
import NewPageForm from "@/Pages/Book/NewPageForm.vue";
import SimilarBooks from "@/Pages/Book/SimilarBooks.vue";
import { Deferred, Head, Link, router } from "@inertiajs/vue3";
import { computed, onMounted, ref } from "vue";

/* global route */

// Component name for linting
defineOptions({
  name: "BookShowPage"
});

const { canEditPages } = usePermissions();
const { speak, speaking } = useSpeechSynthesis();

const props = defineProps({
  book: { type: Object, required: true },
  pages: { type: Object, required: true },
  sort: { type: String, default: "newest" },
  authors: { type: Array, required: true },
  categories: { type: Array, default: null },
  similarBooks: { type: Array, default: null },
  books: { type: Array, default: null }
});

const { items, infiniteScrollRef, setItemLoading } = useInfiniteScroll(
  props.pages.data,
  computed(() => props.pages)
);

const sortLoading = ref(false);

const isNewest = computed(() => props.sort === "newest");
const isOldest = computed(() => props.sort === "oldest");
const isPopular = computed(() => props.sort === "popular");

function sortPages(sortValue) {
  sortLoading.value = true;
  let phrase = "newest";
  switch (sortValue) {
    case "oldest":
      phrase = "oldest";
      break;
    case "popular":
      phrase = "favorites";
      break;
  }
  speak(phrase);
  router.get(
    route("books.show", { book: props.book.slug, sort: sortValue }) + "#pages",
    {},
    { preserveScroll: false }
  );
}

let activeTab = ref(null);
let selectedPages = ref([]);

const setActiveTab = (tab) => {
  if (activeTab.value === tab) {
    activeTab.value = null;
  } else {
    activeTab.value = tab;
  }

  // Clear selections when switching away from bulk actions
  if (activeTab.value !== "bulk") {
    selectedPages.value = [];
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
