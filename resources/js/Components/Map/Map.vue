<template>
  <div ref="mapContainer" :class="containerClass"></div>
</template>

<script setup>
import L from "leaflet";
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
  // Single location mode
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  // Multiple locations mode
  locations: {
    type: Array,
    default: () => []
  },
  // Popup content for single location
  title: {
    type: String,
    default: ""
  },
  bookTitle: {
    type: String,
    default: ""
  },
  // Interactive mode (for picker)
  interactive: {
    type: Boolean,
    default: false
  },
  // Default center when no location
  defaultLat: {
    type: Number,
    default: 45.6387 // Vancouver, WA
  },
  defaultLng: {
    type: Number,
    default: -122.6615
  },
  // Container class
  containerClass: {
    type: String,
    default:
      "w-full aspect-square rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shadow-lg"
  }
});

const emit = defineEmits([
  "update:latitude",
  "update:longitude",
  "location-selected"
]);

const mapContainer = ref(null);
let map = null;
let markers = [];
let isInitialized = false;

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

const initializeMap = () => {
  if (!mapContainer.value) return;

  // Determine if we're in multiple locations mode
  const isMultipleMode = props.locations && props.locations.length > 0;
  const isSingleMode = props.latitude != null && props.longitude != null;

  // If map already exists, remove it first
  if (map) {
    markers.forEach((marker) => {
      map.removeLayer(marker);
    });
    markers = [];
    map.remove();
    map = null;
  }

  let centerLat, centerLng, zoom;

  if (isMultipleMode) {
    // Multiple locations mode
    const bounds = [];
    props.locations.forEach((location) => {
      if (location.latitude != null && location.longitude != null) {
        bounds.push([location.latitude, location.longitude]);
      }
    });

    if (bounds.length === 0) return;

    const firstLocation = props.locations.find(
      (loc) => loc.latitude != null && loc.longitude != null
    );
    centerLat = firstLocation?.latitude ?? props.defaultLat;
    centerLng = firstLocation?.longitude ?? props.defaultLng;
    zoom = 13;
  } else if (isSingleMode) {
    // Single location mode
    centerLat = props.latitude;
    centerLng = props.longitude;
    zoom = 17;
  } else {
    // Default/Interactive mode
    centerLat = props.defaultLat;
    centerLng = props.defaultLng;
    zoom = 15;
  }

  map = L.map(mapContainer.value).setView([centerLat, centerLng], zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  // Add markers based on mode
  if (isMultipleMode) {
    // Multiple markers
    const bounds = [];
    props.locations.forEach((location) => {
      if (location.latitude != null && location.longitude != null) {
        bounds.push([location.latitude, location.longitude]);
        // Use book link if book_slug exists, otherwise use page link
        const url = location.book_slug
          ? route("books.show", location.book_slug)
          : location.id
          ? route("pages.show", location.id)
          : "#";
        const popupContent = location.page_title
          ? `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline"><strong>${
              location.page_title
            }</strong></a>${
              location.book_title ? `<br><em>${location.book_title}</em>` : ""
            }`
          : location.book_title
          ? `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline"><strong>${location.book_title}</strong></a>`
          : `<a href="${url}" class="text-blue-600 hover:text-blue-800 underline">Location</a>`;

        const marker = L.marker([location.latitude, location.longitude])
          .addTo(map)
          .bindPopup(popupContent);

        markers.push(marker);
      }
    });

    // Fit bounds if multiple markers
    if (bounds.length > 1) {
      const latLngBounds = L.latLngBounds(bounds);
      map.fitBounds(latLngBounds, { padding: [20, 20], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 17);
    }
  } else if (isSingleMode || (props.interactive && isSingleMode)) {
    // Single marker
    const popupContent = props.title
      ? `<strong>${props.title}</strong>${
          props.bookTitle ? `<br><em>${props.bookTitle}</em>` : ""
        }`
      : props.bookTitle
      ? `<strong>${props.bookTitle}</strong>`
      : "Location";

    const marker = L.marker([props.latitude, props.longitude]).addTo(map);

    if (!props.interactive) {
      marker.bindPopup(popupContent);
    }

    markers.push(marker);
  }

  // Add click handler for interactive mode
  if (props.interactive) {
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;

      // Remove existing marker
      markers.forEach((marker) => {
        map.removeLayer(marker);
      });
      markers = [];

      // Add new marker
      const marker = L.marker([lat, lng]).addTo(map);
      markers.push(marker);

      emit("update:latitude", lat);
      emit("update:longitude", lng);
      emit("location-selected", { lat, lng });
    });
  }

  // Invalidate size to ensure map renders correctly
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 100);

  isInitialized = true;
};

onMounted(() => {
  nextTick(() => {
    initializeMap();
  });
});

// Watch for changes in single location mode
watch(
  () => [props.latitude, props.longitude],
  ([newLat, newLng]) => {
    if (map && !props.locations?.length) {
      // Remove existing markers
      markers.forEach((marker) => {
        map.removeLayer(marker);
      });
      markers = [];

      if (newLat != null && newLng != null) {
        // Add new marker
        const popupContent = props.title
          ? `<strong>${props.title}</strong>${
              props.bookTitle ? `<br><em>${props.bookTitle}</em>` : ""
            }`
          : props.bookTitle
          ? `<strong>${props.bookTitle}</strong>`
          : "Location";

        const marker = L.marker([newLat, newLng])
          .addTo(map)
          .bindPopup(popupContent);

        markers.push(marker);

        if (!props.interactive) {
          map.setView([newLat, newLng], 17);
        } else {
          map.setView([newLat, newLng], 15);
        }
      }
    }
  }
);

// Watch for changes in multiple locations mode
watch(
  () => props.locations,
  () => {
    if (!isInitialized) return;
    nextTick(() => {
      initializeMap();
    });
  },
  { deep: true }
);

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});
</script>
