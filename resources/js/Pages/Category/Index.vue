<template>
  <Head :title="categoryTitle" />

  <BreezeAuthenticatedLayout>
    <template #header>
      <div class="flex justify-between items-center mb-10">
        <Link class="w-1/2" :href="route('books.index')">
          <div class="flex items-center gap-3">
            <ApplicationLogo
              v-if="props.categoryName === 'themed'"
              class="w-12 h-12 flex-shrink-0"
            />
            <h2 class="font-heading text-3xl text-theme-title leading-tight">
              {{ categoryTitle }}
            </h2>
          </div>
        </Link>
      </div>
    </template>

    <div v-if="locations && locations.length > 0" class="px-4 mb-6">
      <CategoryMap :locations="locations" />
    </div>

    <div v-if="items.length > 0" class="mb-10">
      <div
        class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 px-4"
      >
        <BookCoverCard
          v-for="book in items"
          :key="book.id"
          :book="book"
          @click="setItemLoading"
        />
      </div>
    </div>

    <div v-else class="flex flex-col items-center mt-10">
      <h2 class="mb-8 font-semibold text-2xl text-gray-100 leading-tight">
        No books found in this category
      </h2>
      <ManEmptyCircle />
    </div>

    <div ref="infiniteScrollRef"></div>
    <ScrollTop />
  </BreezeAuthenticatedLayout>
</template>

<script setup>
import ApplicationLogo from "@/Components/ApplicationLogo.vue";
import BookCoverCard from "@/Components/BookCoverCard.vue";
import CategoryMap from "@/Components/Map/CategoryMap.vue";
import ScrollTop from "@/Components/ScrollTop.vue";
import ManEmptyCircle from "@/Components/svg/ManEmptyCircle.vue";
import BreezeAuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { useInfiniteScroll } from "@/composables/useInfiniteScroll";
import { Head, Link, usePage } from "@inertiajs/vue3";
import { computed } from "vue";

const props = defineProps({
  categoryName: {
    type: String,
    required: true
  },
  books: {
    type: Object,
    required: true
  },
  locations: {
    type: Array,
    default: () => []
  }
});

const { items, infiniteScrollRef, setItemLoading } = useInfiniteScroll(
  props.books.data,
  computed(() => props.books)
);

const categoryTitle = computed(() => {
  // Handle special themed category
  if (props.categoryName === "themed") {
    const page = usePage();
    const theme = page.props.theme || "";
    if (theme === "halloween") return "Halloween Books";
    if (theme === "fireworks") return "4th of July Books";
    if (theme === "christmas") return "Christmas Books";
    return "Themed Books";
  }

  // Default: capitalize the category name
  return (
    props.categoryName.charAt(0).toUpperCase() + props.categoryName.slice(1)
  );
});
</script>
