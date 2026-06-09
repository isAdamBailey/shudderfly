<script setup>
/* global route */
import { computed, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  selectedCities: { type: Array, default: () => [] },
  maxCities: { type: Number, default: 6 },
  labels: { type: Object, default: () => ({}) },
  canRelabel: { type: Boolean, default: false }
});

const emit = defineEmits(["add", "remove", "relabel"]);

const onRelabelInput = (city, event) => {
  emit("relabel", city.timezone, event.target.value.trim());
};

const query = ref("");
const results = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
let debounceTimer = null;
// Sequence token so an out-of-order (stale) response can't clobber a newer one.
let searchSeq = 0;

const atLimit = computed(() => props.selectedCities.length >= props.maxCities);

const isSelected = (city) =>
  props.selectedCities.some(
    (c) => c.timezone === city.timezone && c.name === city.name
  );

const runSearch = async (term) => {
  const seq = (searchSeq += 1);
  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await window.axios.get(
      route("world-clock.cities.search"),
      { params: { q: term } }
    );
    if (seq !== searchSeq) return;
    results.value = Array.isArray(response.data) ? response.data : [];
  } catch {
    if (seq !== searchSeq) return;
    results.value = [];
    errorMessage.value = "Unable to search cities right now.";
  } finally {
    if (seq === searchSeq) isLoading.value = false;
  }
};

watch(query, (value) => {
  clearTimeout(debounceTimer);
  const term = value.trim();
  if (term.length < 2) {
    results.value = [];
    isLoading.value = false;
    return;
  }
  debounceTimer = setTimeout(() => runSearch(term), 300);
});

onBeforeUnmount(() => clearTimeout(debounceTimer));

const onAdd = (city) => {
  if (atLimit.value || isSelected(city)) return;
  emit("add", city);
};
</script>

<template>
  <div class="rounded-lg bg-gray-800 p-4">
    <h3 class="font-heading text-lg text-gray-100">Cities</h3>
    <p class="mt-1 text-xs text-gray-400">
      {{ selectedCities.length }} / {{ maxCities }} selected
    </p>

    <div class="mt-3">
      <input
        v-model="query"
        type="search"
        placeholder="Search a city or country…"
        class="w-full rounded-md border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500"
      />
    </div>

    <p v-if="atLimit" class="mt-2 text-xs text-amber-400">
      Maximum of {{ maxCities }} clocks reached. Remove one to add another.
    </p>
    <p v-if="errorMessage" class="mt-2 text-xs text-red-400">
      {{ errorMessage }}
    </p>

    <ul v-if="isLoading" class="mt-3 text-sm text-gray-400">
      <li>Searching…</li>
    </ul>
    <ul v-else-if="results.length" class="mt-3 space-y-1">
      <li v-for="city in results" :key="`${city.timezone}-${city.name}`">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-gray-100 transition-colors hover:bg-gray-700 disabled:opacity-40"
          :disabled="atLimit || isSelected(city)"
          @click="onAdd(city)"
        >
          <span>
            {{ city.name }}
            <span v-if="city.country" class="text-gray-400">· {{ city.country }}</span>
          </span>
          <i
            v-if="isSelected(city)"
            class="ri-check-line text-green-400"
            aria-hidden="true"
          ></i>
          <i v-else class="ri-add-line text-gray-400" aria-hidden="true"></i>
        </button>
      </li>
    </ul>

    <ul v-if="selectedCities.length" class="mt-4 space-y-2">
      <li
        v-for="city in selectedCities"
        :key="`chip-${city.timezone}-${city.name}`"
        class="flex items-center gap-2 rounded-md bg-gray-700 px-3 py-2"
      >
        <span class="shrink-0 text-sm text-gray-100">{{ city.name }}</span>
        <input
          v-if="canRelabel"
          type="text"
          :value="labels[city.timezone] || ''"
          placeholder="Custom label (optional)"
          class="min-w-0 flex-1 rounded-md border-gray-600 bg-gray-900 px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:ring-indigo-500"
          :aria-label="`Custom label for ${city.name}`"
          @change="onRelabelInput(city, $event)"
        />
        <button
          type="button"
          class="shrink-0 text-gray-400 hover:text-red-400"
          :aria-label="`Remove ${city.name}`"
          @click="emit('remove', city)"
        >
          <i class="ri-close-line" aria-hidden="true"></i>
        </button>
      </li>
    </ul>
  </div>
</template>
