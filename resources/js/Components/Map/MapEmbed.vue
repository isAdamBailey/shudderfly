<template>
  <div v-if="latitude != null && longitude != null" class="w-full mt-6 mb-4">
    <h3 class="text-lg font-semibold text-white mb-2">{{ heading }}</h3>
    <div class="w-full px-4">
      <Map
        :latitude="latitude"
        :longitude="longitude"
        :title="title"
        :book-title="bookTitle"
        :show-street-view="effectiveShowStreetView"
        container-class="w-full aspect-video rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { usePage } from "@inertiajs/vue3";
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
  },
  showStreetView: {
    type: Boolean,
    default: false
  }
});

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

const streetViewEnabled = computed(() => {
  const value = usePage().props.settings?.street_view_enabled;
  return value === "1" || value === 1 || value === true;
});

const effectiveShowStreetView = computed(() => {
  return props.showStreetView && streetViewEnabled.value;
});
</script>
