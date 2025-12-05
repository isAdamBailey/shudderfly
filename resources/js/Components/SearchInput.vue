<template>
  <div
    class="w-full bg-transparent flex flex-nowrap pl-2 md:pl-8 mt-5 pr-3 md:pr-8 mb-2 gap-2"
  >
    <!-- Microphone + Search Input Container (stays together) -->
    <div class="flex gap-2 flex-1">
      <!-- Voice Recognition Button - LEFT -->
      <button
        v-if="isSupported"
        class="self-center w-8 h-8 flex-shrink-0 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 christmas:focus:ring-christmas-gold halloween:focus:ring-halloween-orange flex items-center justify-center"
        :class="{
          'bg-red-500 hover:bg-red-600 text-white christmas:bg-christmas-berry christmas:hover:bg-christmas-red halloween:bg-halloween-candy halloween:hover:bg-halloween-pumpkin':
            isListening,
          'bg-green-500 hover:bg-green-600 text-white christmas:bg-christmas-holly christmas:hover:bg-christmas-green halloween:bg-halloween-witch halloween:hover:bg-halloween-purple':
            hasGoodResult && !isListening,
          'bg-blue-600 hover:bg-blue-700 text-white christmas:bg-christmas-red christmas:hover:bg-christmas-gold halloween:bg-halloween-orange halloween:hover:bg-halloween-purple':
            !isListening && !hasGoodResult
        }"
        :disabled="isProcessing"
        @click="toggleVoiceRecognition"
      >
        <i
          :class="{
            'ri-mic-line': !isListening,
            'ri-mic-fill animate-pulse': isListening,
            'ri-check-line': hasGoodResult && !isListening
          }"
          class="text-lg"
        ></i>
      </button>

      <!-- Search Input - MIDDLE -->
      <label for="search" class="hidden">Search</label>
      <div class="relative flex-1 min-w-0">
        <input
          id="search"
          :value="displayValue"
          class="h-8 w-full cursor-pointer rounded-full border bg-gray-100 dark:bg-gray-800 px-4 pb-0 pt-px text-gray-700 dark:text-gray-300 outline-none transition focus:border-blue-400 christmas:focus:border-christmas-gold halloween:focus:border-halloween-orange"
          :class="{
            'border-red-500 border-2 christmas:border-christmas-berry halloween:border-halloween-candy':
              isListening,
            'border-green-500 border-2 christmas:border-christmas-holly halloween:border-halloween-witch':
              hasGoodResult && !isListening,
            'pr-5': isSupported // Add right padding when voice is supported
          }"
          autocomplete="off"
          name="search"
          :placeholder="searchPlaceholder"
          type="search"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keyup.esc="clearSearch"
          @keyup.enter="handleEnter"
          @keydown.down.prevent="navigateSuggestions(1)"
          @keydown.up.prevent="navigateSuggestions(-1)"
        />

        <!-- Error Indicator inside the input -->
        <div
          v-if="isSupported && lastError"
          class="absolute right-2 top-1/2 transform -translate-y-1/2"
        >
          <div
            class="bg-red-600 text-white christmas:bg-christmas-berry halloween:bg-halloween-candy text-xs rounded-full w-4 h-4 flex items-center justify-center"
            :title="lastError"
          >
            !
          </div>
        </div>

        <!-- Suggestions Dropdown -->
        <div
          v-if="
            showSuggestions && suggestions.length > 0 && search && !isListening
          "
          class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          <div
            v-for="(suggestion, index) in suggestions"
            :key="`${suggestion.type}-${suggestion.id}`"
            class="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            :class="{
              'bg-blue-100 dark:bg-blue-700': index === selectedIndex
            }"
            @mousedown.prevent="selectSuggestion(suggestion)"
          >
            <div class="font-semibold text-gray-900 dark:text-white">
              {{ getSuggestionTitle(suggestion) }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ getSuggestionSubtitle(suggestion) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toggle Group - RIGHT -->
    <div
      class="self-center w-[180px] flex-shrink-0"
      role="radiogroup"
      aria-label="Search target"
    >
      <div
        class="relative inline-flex items-center rounded-full bg-gray-200 dark:bg-gray-800 p-1 h-8 w-full"
      >
        <button
          role="radio"
          :aria-checked="isBooksTarget.toString()"
          :tabindex="isBooksTarget ? 0 : -1"
          class="flex-1 px-3 h-6 rounded-full text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 christmas:focus-visible:ring-christmas-gold halloween:focus-visible:ring-halloween-orange"
          :class="
            isBooksTarget
              ? 'bg-blue-600 text-white dark:bg-white dark:text-gray-900 christmas:bg-christmas-red christmas:text-white halloween:bg-halloween-orange halloween:text-white shadow'
              : 'text-gray-700 dark:text-gray-300'
          "
          @click="setTarget('books')"
          @keydown.enter.prevent="setTarget('books')"
          @keydown.space.prevent="setTarget('books')"
        >
          Books
        </button>
        <button
          role="radio"
          :aria-checked="isUploadsTarget.toString()"
          :tabindex="isUploadsTarget ? 0 : -1"
          class="flex-1 px-3 h-6 rounded-full text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 christmas:focus-visible:ring-christmas-gold halloween:focus-visible:ring-halloween-orange"
          :class="
            isUploadsTarget
              ? 'bg-blue-600 text-white dark:bg-white dark:text-gray-900 christmas:bg-christmas-red christmas:text-white halloween:bg-halloween-orange halloween:text-white shadow'
              : 'text-gray-700 dark:text-gray-300'
          "
          @click="setTarget('uploads')"
          @keydown.enter.prevent="setTarget('uploads')"
          @keydown.space.prevent="setTarget('uploads')"
        >
          Uploads
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router, usePage } from "@inertiajs/vue3";
import { useSpeechRecognition } from "@vueuse/core";
import { debounce } from "lodash";
import { computed, onUnmounted, ref, watch } from "vue";

const { speak } = useSpeechSynthesis();
const props = defineProps({
  label: {
    type: String,
    default: null
  },
  initialTarget: {
    type: String,
    default: null // 'books' | 'uploads'
  },
  showTargetToggle: {
    type: Boolean,
    default: false
  }
});

const { isSupported, isListening, isFinal, result, error, start, stop } =
  useSpeechRecognition({
    continuous: false,
    interimResults: true,
    lang: "en-US",
    maxAlternatives: 1
  });

const finalTranscript = computed(() => result.value || "");
const lastError = computed(() => error.value);
const hasGoodResult = computed(() => finalTranscript.value && isFinal.value);
const currentTranscript = computed(() => finalTranscript.value);
const isProcessing = computed(() => isListening.value);

let search = ref(usePage().props?.search || null);
let filter = ref(usePage().props?.filter || null);
let target = ref(getDefaultTarget());

const suggestions = ref([]);
const showSuggestions = ref(false);
const selectedIndex = ref(-1);

const isBooksTarget = computed(() => target.value === "books");
const isUploadsTarget = computed(() => target.value === "uploads");

const currentLabel = computed(() => {
  if (props.showTargetToggle) {
    return target.value === "uploads" ? "Uploads" : "Books";
  }
  return props.label || (target.value === "uploads" ? "Uploads" : "Books");
});

const searchPlaceholder = computed(() => {
  if (isListening.value) {
    return `Listening...`;
  }
  if (isProcessing.value) {
    return "Processing speech...";
  }
  return `Search ${currentLabel.value}!`;
});

const displayValue = computed(() => {
  if (isListening.value && currentTranscript.value) {
    return currentTranscript.value;
  }
  // Show selected suggestion in input if navigating with arrows
  if (selectedIndex.value !== -1 && showSuggestions.value) {
    const selected = suggestions.value[selectedIndex.value];
    return getSuggestionTitle(selected);
  }
  if (finalTranscript.value && !search.value) {
    return finalTranscript.value;
  }
  return search.value || "";
});

watch(result, (newResult) => {
  if (newResult && newResult.trim()) {
    search.value = deduplicateWords(newResult);
  }
});

// Function to deduplicate repeated words
const deduplicateWords = (text) => {
  const words = text.trim().split(/\s+/);
  const uniqueWords = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Only add if it's different from the previous word
    if (i === 0 || word !== words[i - 1]) {
      uniqueWords.push(word);
    }
  }

  return uniqueWords.join(" ");
};

// Watch for when recognition stops to trigger search
watch(isListening, (listening) => {
  if (!listening && result.value && result.value.trim()) {
    search.value = deduplicateWords(result.value);
    searchMethod();
  }
});

// Auto-stop recognition after a pause in speech
let speechTimeout = null;
watch(result, (newResult) => {
  if (newResult && newResult.trim() && isListening.value) {
    // Clear existing timeout
    if (speechTimeout) {
      clearTimeout(speechTimeout);
    }

    // Set new timeout to stop recognition after 2 seconds of silence
    speechTimeout = setTimeout(() => {
      if (isListening.value) {
        stop();
      }
    }, 2000);
  }
});

watch(search, (newSearch) => {
  if (!newSearch) {
    searchMethod();
    suggestions.value = [];
    showSuggestions.value = false;
  } else if (!isListening.value && newSearch && newSearch.trim().length >= 2) {
    // Fetch suggestions when search is set from voice recognition or other sources
    // (handleInput calls fetchSuggestions directly to avoid timing issues)
    fetchSuggestions(newSearch);
  }
});

// Debounced function to fetch suggestions
const fetchSuggestions = debounce(async (query) => {
  if (!query || query.trim().length < 2) {
    suggestions.value = [];
    showSuggestions.value = false;
    return;
  }

  try {
    const endpoint =
      target.value === "uploads" ? "/api/search/uploads" : "/api/search/books";
    const response = await window.axios.get(endpoint, {
      params: { q: query.trim() }
    });
    suggestions.value = response.data || [];
    showSuggestions.value = suggestions.value.length > 0;
    selectedIndex.value = -1; // Reset selected index
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    suggestions.value = [];
    showSuggestions.value = false;
  }
}, 300); // 300ms debounce

const searchMethod = () => {
  let routeName;
  if (target.value === "uploads") {
    routeName = "pictures.index";
  } else {
    routeName = "books.index";
  }

  if (search.value) {
    speak(`Searching for ${currentLabel.value} with ${search.value}`);
  }
  // eslint-disable-next-line no-undef
  router.get(
    // eslint-disable-next-line no-undef
    route(routeName),
    { search: search.value || null, filter: filter.value || null },
    { preserveState: true }
  );
  showSuggestions.value = false; // Hide suggestions after full search
};

function setTarget(newTarget) {
  if (newTarget === target.value) return;
  target.value = newTarget;
  // Refetch suggestions when target changes
  if (search.value) {
    fetchSuggestions(search.value);
  }
}

function getDefaultTarget() {
  if (props.initialTarget === "books" || props.initialTarget === "uploads") {
    return props.initialTarget;
  }
  // Infer based on page props (URL or server-provided context) if available
  const currentUrl =
    typeof window !== "undefined" ? window.location.pathname : "";
  // Check for books pages
  if (currentUrl.startsWith("/books") || currentUrl.startsWith("/book/")) {
    return "books";
  }
  // Default to uploads
  return "uploads";
}

const toggleVoiceRecognition = async () => {
  if (!isSupported.value) {
    speak("Voice recognition is not supported in this browser.");
    return;
  }

  try {
    if (isListening.value) {
      stop();
    } else {
      start();
      showSuggestions.value = false; // Hide suggestions when listening
    }
  } catch (error) {
    console.error("Voice recognition error:", error);
    speak(`Failed to start voice recognition: ${error.message}`);
  }
};

const clearSearch = () => {
  search.value = null;
  suggestions.value = [];
  showSuggestions.value = false;
};

// Handle input event to update search value and fetch suggestions
const handleInput = (event) => {
  search.value = event.target.value;
  selectedIndex.value = -1; // Reset selected index on input

  if (search.value && search.value.trim().length >= 2 && !isListening.value) {
    fetchSuggestions(search.value);
    showSuggestions.value = true; // Show suggestions as soon as user types
  } else {
    suggestions.value = [];
    showSuggestions.value = false;
  }
};

// Handle focus event to show suggestions if there's a search query
const handleFocus = () => {
  if (search.value && suggestions.value.length > 0) {
    showSuggestions.value = true;
  }
};

// Handle blur event to hide suggestions after a short delay
const handleBlur = () => {
  // Use a timeout to allow click events on suggestions to register
  setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
};

// Navigate suggestions with arrow keys
const navigateSuggestions = (direction) => {
  if (!showSuggestions.value || suggestions.value.length === 0) {
    return;
  }

  let newIndex = selectedIndex.value + direction;

  if (newIndex < 0) {
    newIndex = suggestions.value.length - 1; // Wrap around to last item
  } else if (newIndex >= suggestions.value.length) {
    newIndex = 0; // Wrap around to first item
  }
  selectedIndex.value = newIndex;
};

// Select a suggestion (either by click or Enter key)
const selectSuggestion = (suggestion) => {
  showSuggestions.value = false;
  // Don't update search.value here as it triggers unnecessary API calls before navigation
  if (suggestion.type === "book") {
    // eslint-disable-next-line no-undef
    router.get(route("books.show", suggestion.slug));
  } else if (suggestion.type === "page") {
    // eslint-disable-next-line no-undef
    router.get(route("pages.show", suggestion.id));
  } else if (suggestion.type === "song") {
    // eslint-disable-next-line no-undef
    router.get(route("music.show", suggestion.id));
  }
};

const handleEnter = () => {
  if (
    showSuggestions.value &&
    suggestions.value.length > 0 &&
    selectedIndex.value >= 0
  ) {
    selectSuggestion(suggestions.value[selectedIndex.value]);
  } else {
    searchMethod(); // Perform full search if no suggestion is selected or shown
  }
};

const getSuggestionTitle = (suggestion) => {
  if (suggestion.type === "book") {
    return suggestion.title;
  } else if (suggestion.type === "page") {
    return suggestion.content
      ? suggestion.content.substring(0, 60) +
          (suggestion.content.length > 60 ? "..." : "")
      : "Page";
  } else if (suggestion.type === "song") {
    return suggestion.title;
  }
  return "";
};

const getSuggestionSubtitle = (suggestion) => {
  if (suggestion.type === "book") {
    return suggestion.excerpt
      ? suggestion.excerpt.substring(0, 80) +
          (suggestion.excerpt.length > 80 ? "..." : "")
      : "";
  } else if (suggestion.type === "page") {
    return suggestion.book_title || "";
  } else if (suggestion.type === "song") {
    return suggestion.description
      ? suggestion.description.substring(0, 80) +
          (suggestion.description.length > 80 ? "..." : "")
      : "";
  }
  return "";
};

// Cleanup timeout on unmount
onUnmounted(() => {
  if (speechTimeout) {
    clearTimeout(speechTimeout);
  }
});
</script>
