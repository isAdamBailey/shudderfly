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
      <!-- 8.5 x 11 aspect ratio container -->
      <div class="relative w-full" style="padding-bottom: 129.4%">
        <!-- 11/8.5 = 1.294 -->
        <div class="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-1">
          <div
            v-for="page in collage.pages.slice(0, MAX_COLLAGE_PAGES)"
            :key="page.id"
            class="relative"
          >
            <img
              :src="page.media_path"
              class="w-full h-full object-cover"
              :alt="`Collage image ${page.id}`"
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
import { MAX_COLLAGE_PAGES } from "@/constants/collage";

defineProps({
  collages: { type: Array, required: true },
  showIndex: { type: Boolean, default: true }
});
</script>
