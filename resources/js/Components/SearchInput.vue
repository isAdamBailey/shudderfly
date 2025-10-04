<template>
    <div class="w-full bg-transparent flex pl-2 md:pl-8 mt-5 pr-3 md:pr-8 mb-2">
        <div
            class="self-center mr-2"
            role="radiogroup"
            aria-label="Search target"
        >
            <div
                class="relative inline-flex items-center rounded-full bg-gray-200 dark:bg-gray-800 p-1 h-8"
            >
                <button
                    role="radio"
                    :aria-checked="isBooksTarget.toString()"
                    :tabindex="isBooksTarget ? 0 : -1"
                    class="px-3 h-6 rounded-full text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    :class="
                        isBooksTarget
                            ? 'bg-blue-600 text-white dark:bg-white dark:text-gray-900 shadow'
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
                    class="px-3 h-6 rounded-full text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    :class="
                        isUploadsTarget
                            ? 'bg-blue-600 text-white dark:bg-white dark:text-gray-900 shadow'
                            : 'text-gray-700 dark:text-gray-300'
                    "
                    @click="setTarget('uploads')"
                    @keydown.enter.prevent="setTarget('uploads')"
                    @keydown.space.prevent="setTarget('uploads')"
                >
                    Uploads
                </button>
                <button
                    role="radio"
                    :aria-checked="isMusicTarget.toString()"
                    :tabindex="isMusicTarget ? 0 : -1"
                    class="px-3 h-6 rounded-full text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    :class="
                        isMusicTarget
                            ? 'bg-blue-600 text-white dark:bg-white dark:text-gray-900 shadow'
                            : 'text-gray-700 dark:text-gray-300'
                    "
                    @click="setTarget('music')"
                    @keydown.enter.prevent="setTarget('music')"
                    @keydown.space.prevent="setTarget('music')"
                >
                    Music
                </button>
            </div>
        </div>
        <label for="search" class="hidden">Search</label>
        <div class="relative w-full">
            <input
                id="search"
                :value="displayValue"
                class="h-10 w-full cursor-pointer rounded-full border bg-gray-100 px-4 pb-0 pt-px text-gray-700 outline-none transition focus:border-blue-400"
                :class="{
                    'border-red-500 border-2': isListening,
                    'border-green-500 border-2': hasGoodResult && !isListening,
                    'pr-5': isSupported, // Add right padding when voice is supported
                }"
                autocomplete="off"
                name="search"
                :placeholder="searchPlaceholder"
                type="search"
                @input="search = $event.target.value"
                @keyup.esc="clearSearch"
                @keyup.enter="searchMethod"
            />

            <!-- Error Indicator inside the input -->
            <div
                v-if="isSupported && lastError"
                class="absolute right-2 top-1/2 transform -translate-y-1/2"
            >
                <div
                    class="bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center"
                    :title="lastError"
                >
                    !
                </div>
            </div>
        </div>

        <!-- Voice Recognition Button -->
        <button
            v-if="isSupported"
            class="self-center ml-2 w-14 h-10 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-center"
            :class="{
                'bg-red-500 hover:bg-red-600 text-white': isListening,
                'bg-green-500 hover:bg-green-600 text-white':
                    hasGoodResult && !isListening,
                'bg-blue-600 hover:bg-blue-700 text-white':
                    !isListening && !hasGoodResult,
            }"
            :disabled="isProcessing"
            @click="toggleVoiceRecognition"
        >
            <i
                :class="{
                    'ri-mic-line': !isListening,
                    'ri-mic-fill animate-pulse': isListening,
                    'ri-check-line': hasGoodResult && !isListening,
                }"
                class="text-lg"
            ></i>
        </button>
    </div>
</template>

<script setup>
import { useSpeechRecognition } from "@vueuse/core";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router, usePage } from "@inertiajs/vue3";
import { computed, ref, watch, onUnmounted } from "vue";

const { speak } = useSpeechSynthesis();
const props = defineProps({
    label: {
        type: String,
        default: null,
    },
    initialTarget: {
        type: String,
        default: null, // 'books' | 'uploads' | 'music'
    },
});

const { isSupported, isListening, isFinal, result, error, start, stop } =
    useSpeechRecognition({
        continuous: false,
        interimResults: true,
        lang: "en-US",
        maxAlternatives: 1,
    });

// Extract values from VueUse result
const finalTranscript = computed(() => result.value || "");
const lastError = computed(() => error.value);
const hasGoodResult = computed(() => finalTranscript.value && isFinal.value);
const currentTranscript = computed(() => finalTranscript.value);
const isProcessing = computed(() => isListening.value);

let search = ref(usePage().props?.search || null);
let filter = ref(usePage().props?.filter || null);
let target = ref(getDefaultTarget());

const isBooksTarget = computed(() => target.value === "books");
const isUploadsTarget = computed(() => target.value === "uploads");
const isMusicTarget = computed(() => target.value === "music");

const currentLabel = computed(() => {
    if (props.showTargetToggle) {
        if (target.value === "music") return "Music";
        return target.value === "uploads" ? "Uploads" : "Books";
    }
    if (target.value === "music") return "Music";
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

watch(search, () => {
    if (!search.value) {
        searchMethod();
    }
});

const searchMethod = () => {
    let routeName;
    if (target.value === "uploads") {
        routeName = "pictures.index";
    } else if (target.value === "music") {
        routeName = "music.index";
    } else {
        routeName = "books.index";
    }

    if (search.value) {
        speak(`Searching for ${currentLabel.value} with ${search.value}`);
    }
    router.get(
        route(routeName),
        { search: search.value || null, filter: filter.value || null },
        { preserveState: true }
    );
};

function setTarget(newTarget) {
    if (newTarget === target.value) return;
    target.value = newTarget;
}

function getDefaultTarget() {
    if (
        props.initialTarget === "books" ||
        props.initialTarget === "uploads" ||
        props.initialTarget === "music"
    ) {
        return props.initialTarget;
    }
    // Infer based on page props (URL or server-provided context) if available
    const currentUrl =
        typeof window !== "undefined" ? window.location.pathname : "";
    // Check for music pages
    if (currentUrl.startsWith("/music")) {
        return "music";
    }
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
        }
    } catch (error) {
        console.error("Voice recognition error:", error);
        speak(`Failed to start voice recognition: ${error.message}`);
    }
};

const clearSearch = () => {
    search.value = null;
};

// Cleanup timeout on unmount
onUnmounted(() => {
    if (speechTimeout) {
        clearTimeout(speechTimeout);
    }
});
</script>
