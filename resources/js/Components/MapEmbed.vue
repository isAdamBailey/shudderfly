<template>
  <div v-if="latitude && longitude" class="w-full mt-6 mb-4">
    <h3 class="text-lg font-semibold text-white mb-2">Location</h3>
    <div class="max-w-4xl mx-auto px-4">
      <div
        ref="mapContainer"
        class="w-full h-64 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg"
      ></div>
    </div>
  </div>
</template>

<script setup>
import L from "leaflet";
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
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

const mapContainer = ref(null);
let map = null;

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
  if (!mapContainer.value || !props.latitude || !props.longitude) return;

  map = L.map(mapContainer.value).setView(
    [props.latitude, props.longitude],
    15
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19
  }).addTo(map);

  const popupContent = props.title
    ? `<strong>${props.title}</strong>${
        props.bookTitle ? `<br><em>${props.bookTitle}</em>` : ""
      }`
    : props.bookTitle
    ? `<strong>${props.bookTitle}</strong>`
    : "Location";

  marker = L.marker([props.latitude, props.longitude])
    .addTo(map)
    .bindPopup(popupContent);
});

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});
</script>
