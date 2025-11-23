<template>
  <Link
    :href="route('books.show', { book: book.slug })"
    :class="[
      'relative overflow-hidden rounded-lg transition hover:opacity-80 hover:shadow hover:shadow-gray-300/50',
      containerClass,
      { 'pointer-events-none opacity-50 cursor-not-allowed': disabled }
    ]"
    :tabindex="disabled ? -1 : 0"
    :aria-disabled="disabled"
    prefetch
    as="button"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <div
      v-if="book.loading"
      class="absolute inset-0 flex items-center justify-center bg-white/70 z-20"
    >
      <span class="animate-spin text-black">
        <i class="ri-loader-line text-3xl"></i>
      </span>
    </div>
    <div class="w-full h-full">
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

        <!-- Centered title/excerpt -->
        <div
          class="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-3"
        >
          <h2
            :class="[
              'mini-book__title font-heading uppercase text-white font-bold tracking-[0.08em] leading-tight line-clamp-2',
              titleSize
            ]"
          >
            {{ book.title }}
          </h2>
          <p
            v-if="book.excerpt"
            class="mt-1 text-white/90 text-xs italic line-clamp-2"
          >
            {{ book.excerpt }}
          </p>
        </div>

        <!-- Static spine & border -->
        <div class="mini-book__spine"></div>
        <div
          class="mini-book__border absolute inset-0 rounded-lg pointer-events-none"
        ></div>
      </div>
    </div>
  </Link>
</template>

<script setup>
import LazyLoader from "@/Components/LazyLoader.vue";
import { Link } from "@inertiajs/vue3";

const props = defineProps({
  book: {
    type: Object,
    required: true
  },
  containerClass: {
    type: String,
    default: "w-full aspect-[3/4]"
  },
  titleSize: {
    type: String,
    default: "text-base sm:text-lg"
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["click"]);

const handleClick = (event) => {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit("click", props.book);
};

const handleKeydown = (event) => {
  if (props.disabled && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    event.stopPropagation();
  }
};
</script>
