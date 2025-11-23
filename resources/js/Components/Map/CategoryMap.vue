<template>
  <div v-if="locations.length > 0" class="w-full mt-6 mb-4">
    <h3 class="text-lg font-semibold text-white mb-2">
      Locations ({{ locations.length }})
    </h3>
    <div class="max-w-md mx-auto px-4">
      <Map
        :locations="locations"
        container-class="w-full aspect-square rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg"
      />
    </div>
  </div>
</template>

<script setup>
import Map from "./Map.vue";

defineProps({
  locations: {
    type: Array,
    default: () => []
  }
});
</script>

