<template>
  <div class="w-full">
    <div class="mb-2 flex items-center justify-between">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Location (optional)
      </label>
      <button
        v-if="hasLocation"
        type="button"
        class="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-600"
        @click="clearLocation"
      >
        Clear location
      </button>
    </div>
    <Map
      :latitude="latitude"
      :longitude="longitude"
      :interactive="true"
      container-class="w-full max-w-md aspect-square rounded-lg border border-gray-300 dark:border-gray-600"
      @update:latitude="(val) => $emit('update:latitude', val)"
      @update:longitude="(val) => $emit('update:longitude', val)"
    />
    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      Click on the map to set the location for this page
    </p>
  </div>
</template>

<script setup>
import { computed } from "vue";
import Map from "./Map.vue";

const props = defineProps({
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  }
});

const emit = defineEmits(["update:latitude", "update:longitude"]);

const hasLocation = computed(() => {
  return props.latitude !== null && props.longitude !== null;
});

const clearLocation = () => {
  emit("update:latitude", null);
  emit("update:longitude", null);
};
</script>

