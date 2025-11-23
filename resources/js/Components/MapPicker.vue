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
    <div
      ref="mapContainer"
      class="w-full h-64 rounded-lg border border-gray-300 dark:border-gray-600"
    ></div>
    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
      Click on the map to set the location for this page
    </p>
  </div>
</template>

<script setup>
import L from "leaflet";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

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

const mapContainer = ref(null);
let map = null;
let marker = null;

const hasLocation = computed(() => {
  return props.latitude !== null && props.longitude !== null;
});

// Fix for default marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

onMounted(() => {
  if (!mapContainer.value) return;

  // Default center (Vancouver, Washington)
  const defaultLat = props.latitude ?? 45.6387;
  const defaultLng = props.longitude ?? -122.6615;

  map = L.map(mapContainer.value).setView([defaultLat, defaultLng], 13);

  // Add marker if location exists
  if (hasLocation.value) {
    marker = L.marker([props.latitude, props.longitude]).addTo(map);
    map.setView([props.latitude, props.longitude], 13);
  }

  // Handle map click to set location
  map.on("click", (e) => {
    const { lat, lng } = e.latlng;

    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng]).addTo(map);
    }

    emit("update:latitude", lat);
    emit("update:longitude", lng);
  });
});

watch(
  () => [props.latitude, props.longitude],
  ([newLat, newLng]) => {
    if (map && newLat !== null && newLng !== null) {
      if (marker) {
        marker.setLatLng([newLat, newLng]);
      } else {
        marker = L.marker([newLat, newLng]).addTo(map);
      }
      map.setView([newLat, newLng], 13);
    }
  }
);

const clearLocation = () => {
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  emit("update:latitude", null);
  emit("update:longitude", null);
};

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});
</script>
