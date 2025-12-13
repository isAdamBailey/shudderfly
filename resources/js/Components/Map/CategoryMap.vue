<template>
  <div v-if="locations.length > 0" class="w-full mt-6 mb-4">
    <h3 class="text-lg font-semibold text-white mb-2">
      Locations ({{ locations.length }})
    </h3>
    <div class="w-full px-4 md:px-20">
      <Map
        :key="`map-${locations.length}-${JSON.stringify(locations[0] || {})}`"
        :locations="locations"
        container-class="w-full h-[300px] rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg"
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

