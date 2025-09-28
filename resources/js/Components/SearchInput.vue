<template>
    <div class="w-full bg-transparent flex pl-2 sm:pl-6 lg:pl-8 mt-5 pr-8 mb-2">
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
        <input
            id="search"
            :value="voiceActive && !search ? transcript : search"
            class="h-8 w-full cursor-pointer rounded-full border bg-gray-100 px-4 pb-0 pt-px text-gray-700 outline-none transition focus:border-blue-400"
            :class="{ 'border-red-500 border-2': voiceActive }"
            autocomplete="off"
            name="search"
            :placeholder="searchPlaceholder"
            type="search"
            @input="search = $event.target.value"
            @keyup.esc="search = null"
            @keyup.enter="searchMethod"
        />
        <button
            v-if="isVoiceSupported"
            class="self-center flex items-center ml-2 w-6 h-6"
            @click="startVoiceRecognition"
        >
            <i
                :class="{
                    'bg-red-500 border-red-500': voiceActive,
                }"
                class="border-2 px-1 bg-blue-600 dark:bg-white dark:text-gray-900 text-white rounded-full ri-mic-line text-3xl"
            ></i>
        </button>
    </div>
</template>

<script setup>
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router, usePage } from "@inertiajs/vue3";
import { computed, ref, watch } from "vue";

const { speak } = useSpeechSynthesis();
const props = defineProps({
    label: {
        type: String,
        default: null,
    },
    initialTarget: {
        type: String,
        default: null, // 'books' | 'uploads'
    },
});

let search = ref(usePage().props?.search || null);
let filter = ref(usePage().props?.filter || null);
let voiceActive = ref(false);
let voiceHeard = ref(false);
let transcript = ref("");
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

const isVoiceSupported = computed(() => {
    if (typeof window === "undefined") {
        return false;
    }
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
});

const searchPlaceholder = computed(() => {
    if (voiceActive.value && !voiceHeard.value) {
        return "Listening...";
    }
    return `Search ${currentLabel.value}!`;
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

const startVoiceRecognition = () => {
    // Check if SpeechRecognition is supported
    if (!isVoiceSupported.value) {
        speak("Voice recognition is not supported in this browser.");
        return;
    }

    const recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.lang = "en-US";

    recognition.addEventListener("result", (event) => {
        let currentTranscript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join("");

        // Set voiceHeard to true when we get any result
        voiceHeard.value = true;

        // Update the transcript in real-time
        transcript.value = currentTranscript;

        if (event.results[0].isFinal) {
            // Split the transcript into words, remove duplicates, and join back together
            currentTranscript = [...new Set(currentTranscript.split(" "))].join(
                " "
            );
            search.value = currentTranscript;
            transcript.value = "";
            searchMethod();
        }
    });

    // keep the voice active state in sync with the recognition state
    recognition.addEventListener("start", () => {
        voiceActive.value = true;
        voiceHeard.value = false;
        search.value = null;
        transcript.value = "";
    });

    recognition.addEventListener("end", () => {
        voiceActive.value = false;
        voiceHeard.value = false;
        transcript.value = "";
    });

    recognition.addEventListener("error", (event) => {
        voiceActive.value = false;
        voiceHeard.value = false;
        transcript.value = "";

        let errorMessage = "Voice recognition error occurred.";
        switch (event.error) {
            case "not-allowed":
                errorMessage =
                    "Please allow microphone access for voice search.";
                break;
            case "no-speech":
                errorMessage = "No speech detected. Please try again.";
                break;
            case "network":
                errorMessage = "Network error. Please check your connection.";
                break;
            case "service-not-allowed":
                errorMessage = "Voice recognition service not available.";
                break;
        }
        speak(errorMessage);
    });

    recognition.start();
};
</script>
