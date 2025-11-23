<template>
  <div v-if="latitude != null && longitude != null" class="w-full mt-6 mb-4">
    <h3 class="text-lg font-semibold text-white mb-2">Location</h3>
    <div class="max-w-md mx-auto px-4">
      <Map
        :latitude="latitude"
        :longitude="longitude"
        :title="title"
        :book-title="bookTitle"
        container-class="w-full aspect-square rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg"
      />
    </div>
  </div>
</template>

<script setup>
import Map from "./Map.vue";

defineProps({
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  title: {
    type: String,
    default: ""
  },
  bookTitle: {
    type: String,
    default: ""
  }
});
</script>

