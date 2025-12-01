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
    <div class="mb-3 text-xs text-gray-500 dark:text-gray-400">
      <p>You can search for an address above and select from the results, or simply click on the map to drop a pin at that location.</p>
    </div>
    <div class="mb-3 relative">
      <div class="flex gap-2">
        <div class="flex-1 relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search for an address..."
            class="w-full rounded-md border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            @keyup.enter="searchLocation"
            @input="handleInput"
            @focus="showSuggestions = true"
            @blur="handleBlur"
          />
          <!-- Autocomplete dropdown -->
          <div
            v-if="showSuggestions && suggestions.length > 0"
            class="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto"
            style="z-index: 9999;"
          >
            <button
              v-for="(suggestion, index) in suggestions"
              :key="index"
              type="button"
              class="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              @mousedown.prevent="selectSuggestion(suggestion)"
            >
              <span v-html="suggestion.displayName || suggestion.name || suggestion.html || suggestion.formatted || suggestion.place_name || 'Location'"></span>
            </button>
          </div>
        </div>
        <button
          type="button"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!searchQuery.trim() || isSearching"
          @click="searchLocation"
        >
          <span v-if="!isSearching">Search</span>
          <span v-else>Searching...</span>
        </button>
      </div>
      <p v-if="searchError" class="mt-1 text-xs text-red-600 dark:text-red-400">
        {{ searchError }}
      </p>
    </div>
    <Map
      ref="mapRef"
      :latitude="latitude"
      :longitude="longitude"
      :interactive="true"
      :hide-geocoder="true"
      container-class="w-full max-w-md aspect-square rounded-lg border border-gray-300 dark:border-gray-600"
      @update:latitude="(val) => $emit('update:latitude', val)"
      @update:longitude="(val) => $emit('update:longitude', val)"
    />
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import Map from "./Map.vue";

const props = defineProps({
  latitude: {
    type: [Number, String],
    default: null
  },
  longitude: {
    type: [Number, String],
    default: null
  }
});

// Convert string props to numbers
const latitude = computed(() => {
  if (props.latitude === null || props.latitude === undefined) return null;
  return typeof props.latitude === 'string' ? parseFloat(props.latitude) : props.latitude;
});

const longitude = computed(() => {
  if (props.longitude === null || props.longitude === undefined) return null;
  return typeof props.longitude === 'string' ? parseFloat(props.longitude) : props.longitude;
});

const emit = defineEmits(["update:latitude", "update:longitude"]);

const mapRef = ref(null);
const searchQuery = ref("");
const isSearching = ref(false);
const searchError = ref("");
const suggestions = ref([]);
const showSuggestions = ref(false);
let searchTimeout = null;

const hasLocation = computed(() => {
  return latitude.value !== null && longitude.value !== null;
});

const recenterMap = () => {
  if (mapRef.value && mapRef.value.recenterOnMarker) {
    mapRef.value.recenterOnMarker();
  }
};

const clearLocation = () => {
  emit("update:latitude", null);
  emit("update:longitude", null);
  searchQuery.value = "";
  searchError.value = "";
};

const handleInput = async () => {
  showSuggestions.value = true;
  searchError.value = "";
  
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Debounce the search
  searchTimeout = setTimeout(async () => {
    if (searchQuery.value.trim().length >= 3) {
      try {
        if (mapRef.value && mapRef.value.getGeocodeSuggestions) {
          const results = await mapRef.value.getGeocodeSuggestions(searchQuery.value);
          console.log("Geocode suggestions received:", results);
          suggestions.value = results || [];
          // Keep suggestions visible if we have results
          if (suggestions.value.length > 0) {
            showSuggestions.value = true;
          }
        } else {
          console.log("Map ref or getGeocodeSuggestions not available");
        }
      } catch (error) {
        console.error("Error getting suggestions:", error);
        suggestions.value = [];
      }
    } else {
      suggestions.value = [];
    }
  }, 300);
};

const handleBlur = () => {
  // Delay hiding suggestions to allow click events (mousedown prevents blur)
  setTimeout(() => {
    showSuggestions.value = false;
  }, 300);
};

const selectSuggestion = async (suggestion) => {
  const suggestionName = suggestion.name || suggestion.html || suggestion.formatted || searchQuery.value;
  searchQuery.value = suggestionName;
  showSuggestions.value = false;
  suggestions.value = [];
  
  // If the suggestion has coordinates, use them directly
  if (suggestion.center && suggestion.center.lat && suggestion.center.lng) {
    emit("update:latitude", suggestion.center.lat);
    emit("update:longitude", suggestion.center.lng);
    searchQuery.value = "";
    return;
  }
  
  // Otherwise, geocode the selected suggestion
  isSearching.value = true;
  searchError.value = "";
  
  try {
    if (mapRef.value && mapRef.value.geocodeAddress) {
      // Use the suggestion's name or the query
      await mapRef.value.geocodeAddress(suggestionName);
      searchQuery.value = "";
    } else {
      throw new Error("Map not ready");
    }
  } catch (error) {
    searchError.value = error.message || "Location not found. Please try a different search term.";
  } finally {
    isSearching.value = false;
  }
};

const searchLocation = async () => {
  if (!searchQuery.value.trim()) return;
  
  showSuggestions.value = false;
  isSearching.value = true;
  searchError.value = "";
  
  try {
    if (mapRef.value && mapRef.value.geocodeAddress) {
      await mapRef.value.geocodeAddress(searchQuery.value);
      searchQuery.value = "";
      suggestions.value = [];
    } else {
      throw new Error("Map not ready");
    }
  } catch (error) {
    searchError.value = error.message || "Location not found. Please try a different search term.";
  } finally {
    isSearching.value = false;
  }
};
</script>

