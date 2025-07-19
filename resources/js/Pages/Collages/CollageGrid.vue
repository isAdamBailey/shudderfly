<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mx-10 my-5">
    <div
      v-for="(collage, index) in collages"
      :key="collage.id"
      class="bg-white shadow p-4 flex flex-col space-y-2"
    >
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-semibold text-gray-800">
          {{ showIndex ? "Collage #" : "ID: "
          }}{{ showIndex ? index + 1 : collage.id }}
        </h3>
        <span class="text-sm text-gray-500"
          >{{ collage.pages.length }}/{{ MAX_COLLAGE_PAGES }} image{{
            collage.pages.length !== 1 ? "s" : ""
          }}</span
        >
      </div>
      <!-- Responsive 8.5x11 aspect ratio container, always looks like a piece of paper and maintains aspect ratio -->
      <div
        class="relative bg-white overflow-hidden mx-auto"
        style="aspect-ratio: 8.5 / 11; width: 100%; max-width: 850px"
      >
        <div
          class="h-full w-full grid"
          :style="getGridStyle(collage.pages.length)"
        >
          <div
            v-for="(page, pageIndex) in collage.pages.slice(
              0,
              MAX_COLLAGE_PAGES
            )"
            :key="page.id"
            class="relative"
          >
            <!-- Use LazyLoader for optimized image loading -->
            <LazyLoader
              :src="page.media_path"
              :alt="`Collage image ${page.id}`"
              :classes="'w-full h-full object-contain bg-white'"
              :fill-container="true"
              :object-fit="'contain'"
              :loading="pageIndex < 4 ? 'eager' : 'lazy'"
              :fetch-priority="pageIndex < 2 ? 'high' : 'low'"
            />
            <slot name="image-actions" :page="page" :collage="collage" />
          </div>
        </div>
      </div>
      <div class="flex justify-center mt-2">
        <slot name="actions" :collage="collage" />
      </div>
    </div>
  </div>
</template>

<script setup>
import LazyLoader from "@/Components/LazyLoader.vue";
import { MAX_COLLAGE_PAGES } from "@/constants/collage";

defineProps({
  collages: { type: Array, required: true },
  showIndex: { type: Boolean, default: true }
});

// Function to calculate optimal grid layout based on number of images
const getGridStyle = (imageCount) => {
  if (imageCount <= 0) return {};

  const gridConfigs = {
    1: { cols: 1, rows: 1 },
    2: { cols: 2, rows: 1 },
    3: { cols: 3, rows: 1 },
    4: { cols: 2, rows: 2 },
    5: { cols: 3, rows: 2 },
    6: { cols: 3, rows: 2 },
    7: { cols: 4, rows: 2 },
    8: { cols: 4, rows: 2 },
    9: { cols: 3, rows: 3 },
    10: { cols: 4, rows: 3 },
    11: { cols: 4, rows: 3 },
    12: { cols: 4, rows: 3 },
    13: { cols: 4, rows: 4 },
    14: { cols: 4, rows: 4 },
    15: { cols: 4, rows: 4 },
    16: { cols: 4, rows: 4 }
  };

  const config = gridConfigs[imageCount] || gridConfigs[16];
  const { cols, rows } = config;
  const gap = 8; // px

  return {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, calc((100% - ${
      (rows - 1) * gap
    }px) / ${rows}))`,
    gap: `${gap}px`
  };
};
</script>
