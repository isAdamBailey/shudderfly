<template>
  <div v-if="workingBooks.length > 0" class="md:pl-3 mt-10">
    <h3 class="pt-2 text-2xl text-yellow-200 dark:text-gray-100 font-heading">
      {{ label }}
    </h3>
    <div
      class="flex snap-x space-x-1 overflow-y-hidden pb-2 scrollbar scrollbar-thumb-gray-500 scrollbar-thumb-rounded"
    >
      <Link
        v-for="book in workingBooks"
        :key="book.id"
        prefetch
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
            class="mini-book mini-book__texture relative w-full h-full rounded-lg overflow-hidden shadow-xl"
          >
            <!-- Image -->
            <LazyLoader
              :src="book.cover_image?.media_path"
              :alt="`${book.title} cover image`"
              :is-cover="true"
              :object-fit="'cover'"
              :fill-container="true"
            />

            <!-- Dark overlay for text readability -->
            <div class="absolute inset-0 bg-black/25"></div>

            <!-- Centered title/excerpt like BookCover (smaller) -->
            <div class="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-3">
              <h2 class="mini-book__title font-heading uppercase text-white font-bold tracking-[0.08em] leading-tight text-lg sm:text-xl line-clamp-2">
                {{ book.title }}
              </h2>
              <p v-if="book.excerpt" class="mt-1 text-white/90 text-xs italic line-clamp-2">
                {{ book.excerpt }}
              </p>
            </div>

            <!-- Static spine & border -->
            <div class="mini-book__spine"></div>
            <div class="mini-book__border absolute inset-0 rounded-lg pointer-events-none"></div>
          </div>
        </div>
      </Link>
    </div>
  </div>
</template>

<script setup>
import LazyLoader from "@/Components/LazyLoader.vue";
import { Link } from "@inertiajs/vue3";
import { computed, reactive } from "vue";

const props = defineProps({
  books: {
    type: Array,
    required: true
  },
  label: {
    type: String,
    default: null
  }
});

const workingBooks = computed(() => {
  return (
    props.books?.map((book) => reactive({ ...book, loading: false })) || []
  );
});

function setBookLoading(book) {
  book.loading = true;
}
</script>

