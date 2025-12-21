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
          'bg-red-700 hover:bg-purple-400 dark:bg-red-700 dark:hover:bg-purple-400 text-white christmas:bg-christmas-berry christmas:hover:bg-christmas-mint halloween:bg-halloween-candy halloween:hover:bg-halloween-spooky':
            isListening,
          'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white christmas:bg-christmas-holly christmas:hover:bg-christmas-green halloween:bg-halloween-witch halloween:hover:bg-halloween-purple':
            hasGoodResult && !isListening,
          'bg-blue-600 hover:bg-blue-700 dark:bg-gray-800 dark:hover:bg-gray-700 text-white christmas:bg-christmas-green christmas:hover:bg-christmas-holly halloween:bg-halloween-midnight halloween:hover:bg-halloween-witch':
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
      <label for="search" class="hidden">{{ t('search.label') }}</label>
      <div class="relative flex-1 min-w-0">
        <input
          id="search"
          :value="displayValue"
          class="h-8 w-full cursor-pointer rounded-full border bg-gray-100 dark:bg-gray-800 px-4 pb-0 pt-px text-gray-700 dark:text-gray-300 outline-none transition focus:border-blue-400 christmas:focus:border-christmas-gold halloween:focus:border-halloween-orange"
          :class="{
            'border-red-700 border-2 dark:border-red-700 christmas:border-christmas-berry halloween:border-halloween-candy':
              isListening,
            'border-green-600 border-2 dark:border-green-600 christmas:border-christmas-holly halloween:border-halloween-witch':
              hasGoodResult && !isListening,
            'border-blue-700 dark:border-gray-800 christmas:border-christmas-holly halloween:border-halloween-purple':
              !isListening && !hasGoodResult,
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

        <!-- Live Voice Feedback Display -->
        <div
          v-if="isListening"
          class="absolute z-50 w-full mt-1 bg-gradient-to-r from-red-700 via-purple-400 to-blue-600 dark:from-red-700 dark:via-purple-400 dark:to-gray-800 christmas:from-christmas-berry christmas:via-christmas-mint christmas:to-christmas-green halloween:from-halloween-candy halloween:via-halloween-spooky halloween:to-halloween-midnight rounded-lg shadow-lg p-3 text-white"
        >
          <div class="flex items-center gap-2 mb-2">
            <div class="flex gap-1">
              <span
                class="w-2 h-2 bg-white rounded-full animate-bounce"
                style="animation-delay: 0ms"
              ></span>
              <span
                class="w-2 h-2 bg-white rounded-full animate-bounce"
                style="animation-delay: 150ms"
              ></span>
              <span
                class="w-2 h-2 bg-white rounded-full animate-bounce"
                style="animation-delay: 300ms"
              ></span>
            </div>
            <span class="text-sm font-medium">{{ t('search.listening') }}</span>
          </div>

          <!-- Show what's being heard in real-time -->
          <div
            v-if="currentTranscript"
            class="bg-white/20 rounded-lg p-2 min-h-[2rem]"
          >
            <p class="text-lg font-bold break-words">
              "{{ currentTranscript }}"
            </p>
          </div>
          <div v-else class="bg-white/20 rounded-lg p-2 min-h-[2rem]">
            <p class="text-sm opacity-75 italic">
              {{ t('search.say_something') }}
            </p>
          </div>

          <!-- Tap to stop hint -->
          <p class="text-xs mt-2 opacity-75 text-center">
            {{ t('search.tap_to_stop') }}
          </p>
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
      :aria-label="t('search.target_aria')"
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
          {{ t('search.books') }}
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
          {{ t('search.all') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
import { router, usePage } from "@inertiajs/vue3";
import { useSpeechRecognition } from "@vueuse/core";
import { debounce } from "lodash";
import { computed, onUnmounted, ref, watch } from "vue";

const { speak } = useSpeechSynthesis();
const { t } = useTranslations();
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
const isVoiceSearch = ref(false);

const isBooksTarget = computed(() => target.value === "books");
const isUploadsTarget = computed(() => target.value === "uploads");

const currentLabel = computed(() => {
  if (props.showTargetToggle) {
    return target.value === "uploads" ? t('search.all') : t('search.books');
  }
  return props.label || (target.value === "uploads" ? t('search.all') : t('search.books'));
});

const searchPlaceholder = computed(() => {
  if (isListening.value) {
    return t('search.listening');
  }
  if (isProcessing.value) {
    return t('search.processing');
  }
  return t('search.placeholder', { target: currentLabel.value });
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
    isVoiceSearch.value = true;
    search.value = processVoiceInput(newResult);
  }
});

const FILLER_WORDS = new Set([
  "um",
  "uh",
  "er",
  "ah",
  "like",
  "you know",
  "basically",
  "actually",
  "literally",
  "so",
  "well",
  "hmm",
  "hm",
  "mm",
  "mmm"
]);

const SPEECH_NORMALIZATIONS = {
  wanna: "want to",
  gonna: "going to",
  gotta: "got to",
  kinda: "kind of",
  sorta: "sort of",
  dunno: "don't know",
  lemme: "let me",
  gimme: "give me",
  coulda: "could have",
  shoulda: "should have",
  woulda: "would have",
  aint: "is not",
  "ain't": "is not",
  cuz: "because",
  "'cause": "because",
  cause: "because",
  ya: "you",
  yea: "yes",
  yeah: "yes",
  yup: "yes",
  yep: "yes",
  nah: "no",
  nope: "no"
};

const processVoiceInput = (text) => {
  if (!text) return "";

  let processed = text.toLowerCase().trim();

  // Remove filler words
  let words = processed.split(/\s+/).filter((word) => !FILLER_WORDS.has(word));
  processed = words.join(" ");

  // Normalize speech patterns
  for (const [pattern, replacement] of Object.entries(SPEECH_NORMALIZATIONS)) {
    processed = processed.replace(
      new RegExp(`\\b${pattern}\\b`, "gi"),
      replacement
    );
  }

  // Deduplicate consecutive repeated words
  words = processed.split(/\s+/);
  const unique = words.filter(
    (word, i) => i === 0 || word.toLowerCase() !== words[i - 1].toLowerCase()
  );

  return unique.join(" ").replace(/\s+/g, " ").trim();
};

let speechTimeout = null;

watch(isListening, (listening) => {
  if (!listening && result.value?.trim()) {
    search.value = processVoiceInput(result.value);
    searchMethod();
  }
});

watch(result, (newResult) => {
  if (newResult?.trim() && isListening.value) {
    if (speechTimeout) clearTimeout(speechTimeout);
    speechTimeout = setTimeout(() => {
      if (isListening.value) stop();
    }, 2000);
  }
});

watch(search, (newSearch) => {
  if (!newSearch) {
    searchMethod();
    suggestions.value = [];
    showSuggestions.value = false;
  } else if (!isListening.value && newSearch.trim().length >= 2) {
    fetchSuggestions(newSearch);
  }
});

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
      params: { q: query.trim(), voice: isVoiceSearch.value ? 1 : 0 }
    });
    suggestions.value = response.data || [];
    showSuggestions.value = suggestions.value.length > 0;
    selectedIndex.value = -1;
  } catch (err) {
    console.error("Error fetching suggestions:", err);
    suggestions.value = [];
    showSuggestions.value = false;
  }
}, 300);

const searchMethod = () => {
  const routeName =
    target.value === "uploads" ? "pictures.index" : "books.index";
  if (search.value)
    speak(`Searching for ${currentLabel.value} with ${search.value}`);
  // eslint-disable-next-line no-undef
  router.get(
    route(routeName),
    { search: search.value || null, filter: filter.value || null },
    { preserveState: true }
  );
  showSuggestions.value = false;
};

function setTarget(newTarget) {
  if (newTarget === target.value) return;
  target.value = newTarget;
  if (search.value) fetchSuggestions(search.value);
}

function getDefaultTarget() {
  if (props.initialTarget === "books" || props.initialTarget === "uploads")
    return props.initialTarget;
  const currentUrl =
    typeof window !== "undefined" ? window.location.pathname : "";
  if (
    currentUrl === "/" ||
    currentUrl.startsWith("/books") ||
    currentUrl.startsWith("/book/")
  )
    return "books";
  return "uploads";
}

const toggleVoiceRecognition = async () => {
  if (!isSupported.value) {
    speak(t('search.voice_not_supported'));
    return;
  }

  try {
    if (isListening.value) {
      stop();
    } else {
      start();
      showSuggestions.value = false;
    }
  } catch (error) {
    console.error("Voice recognition error:", error);
    speak(t('search.voice_failed', { error: error.message }));
  }
};

const clearSearch = () => {
  search.value = null;
  suggestions.value = [];
  showSuggestions.value = false;
};

const handleInput = (event) => {
  search.value = event.target.value;
  selectedIndex.value = -1;
  isVoiceSearch.value = false;

  if (search.value?.trim().length >= 2 && !isListening.value) {
    fetchSuggestions(search.value);
    showSuggestions.value = true;
  } else {
    suggestions.value = [];
    showSuggestions.value = false;
  }
};

const handleFocus = () => {
  if (search.value && suggestions.value.length > 0)
    showSuggestions.value = true;
};

const handleBlur = () => {
  setTimeout(() => {
    showSuggestions.value = false;
  }, 150);
};

const navigateSuggestions = (direction) => {
  if (!showSuggestions.value || suggestions.value.length === 0) return;
  let newIndex = selectedIndex.value + direction;
  if (newIndex < 0) newIndex = suggestions.value.length - 1;
  else if (newIndex >= suggestions.value.length) newIndex = 0;
  selectedIndex.value = newIndex;
};

const selectSuggestion = (suggestion) => {
  showSuggestions.value = false;
  // eslint-disable-next-line no-undef
  if (suggestion.type === "book")
    router.get(route("books.show", suggestion.slug));
  // eslint-disable-next-line no-undef
  else if (suggestion.type === "page")
    router.get(route("pages.show", suggestion.id));
  // eslint-disable-next-line no-undef
  else if (suggestion.type === "song")
    router.get(route("music.show", suggestion.id));
};

const handleEnter = () => {
  if (
    showSuggestions.value &&
    suggestions.value.length > 0 &&
    selectedIndex.value >= 0
  ) {
    selectSuggestion(suggestions.value[selectedIndex.value]);
  } else {
    searchMethod();
  }
};

const truncate = (text, len) =>
  text ? (text.length > len ? text.substring(0, len) + "..." : text) : "";

const getSuggestionTitle = (suggestion) => {
  if (suggestion.type === "book" || suggestion.type === "song")
    return suggestion.title;
  if (suggestion.type === "page")
    return truncate(suggestion.content, 60) || "Page";
  return "";
};

const getSuggestionSubtitle = (suggestion) => {
  if (suggestion.type === "book") return truncate(suggestion.excerpt, 80);
  if (suggestion.type === "page") return suggestion.book_title || "";
  if (suggestion.type === "song") return truncate(suggestion.description, 80);
  return "";
};

onUnmounted(() => {
  if (speechTimeout) clearTimeout(speechTimeout);
});
</script>
