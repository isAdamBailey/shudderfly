<template>
  <div v-if="latitude != null && longitude != null" class="w-full mt-6 mb-4">
    <h3 class="text-lg font-semibold text-white mb-2">{{ heading }}</h3>
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
import { computed } from "vue";
import Map from "./Map.vue";

const props = defineProps({
  latitude: {
    type: [Number, String],
    default: null
  },
  longitude: {
    type: [Number, String],
    default: null
  },
  title: {
    type: String,
    default: ""
  },
  bookTitle: {
    type: String,
    default: ""
  },
  heading: {
    type: String,
    default: "Location"
  }
});

// Convert string props to numbers
const latitude = computed(() => {
  if (props.latitude === null || props.latitude === undefined) return null;
  return typeof props.latitude === "string"
    ? parseFloat(props.latitude)
    : props.latitude;
});

const longitude = computed(() => {
  if (props.longitude === null || props.longitude === undefined) return null;
  return typeof props.longitude === "string"
    ? parseFloat(props.longitude)
    : props.longitude;
});
</script>
