<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import { useButtonState } from "@/composables/useDisableButtonState";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router } from "@inertiajs/vue3";
import { ref, computed, onMounted } from "vue";

// Organized by semantic/functional categories for AAC
const people = ["I", "you", "and", "me", "Mom", "Dad", "we", "friend"];
const bodyParts = [
    "my tummy",
    "my head",
    "my legs",
    "my back",
    "my throat",
    "my ear",
    "my head",
    "my feet",
];
const actions = [
    "am",
    "hurt",
    "hurts",
    "need",
    "want",
    "love",
    "like",
    "feel",
    "is",
    "help me",
];
const feelings = [
    "happy",
    "sad",
    "tired",
    "scared",
    "sick",
    "good",
    "bad",
    "excited",
    "hungry",
    "thirsty",
];
const descriptors = ["very", "really", "a little", "so much", "not"];
const things = [
    "farts",
    "food",
    "water",
    "hug",
    "rest",
    "medicine",
    "bathroom",
    "bed",
    "blanket",
    "toy",
];
const quickPhrases = [
    "I love you",
    "thank you",
    "please help",
    "I'm okay",
    "yes",
    "no",
];

const selection = ref([]);
const preview = computed(() => selection.value.join(" ").trim());

const { buttonsDisabled, setTimestamp } = useButtonState();
const { speak, speaking } = useSpeechSynthesis();

const FAVORITES_KEY = "contact_builder_favorites_v1";
const MAX_FAVORITES = 5;
const favorites = ref([]);
const addFeedback = ref(false);
const justAdded = ref(null);
const isAtMax = computed(() => {
    const len = Array.isArray(favorites.value) ? favorites.value.length : 0;
    return len >= MAX_FAVORITES;
});

const canSaveFavorite = computed(() => {
    const hasPreview =
        typeof preview.value === "string" && preview.value.trim().length > 0;
    const hasSelection = Array.isArray(selection.value)
        ? selection.value.length > 0
        : false;
    const len = Array.isArray(favorites.value) ? favorites.value.length : 0;
    return (hasPreview || hasSelection) && len < MAX_FAVORITES;
});

function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) || [];
            const arr = Array.isArray(parsed)
                ? parsed
                : Object.values(parsed || {});
            favorites.value = arr.slice(0, MAX_FAVORITES);
        } else {
            favorites.value = [];
        }
    } catch (e) {
        favorites.value = [];
    }
}

function saveFavorites() {
    try {
        const arr = Array.isArray(favorites.value)
            ? favorites.value.slice(0, MAX_FAVORITES)
            : [];
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr));
    } catch (e) {
        //
    }
}

function addFavorite() {
    if (!canSaveFavorite.value) return;
    if (!favorites.value.includes(preview.value)) {
        favorites.value.unshift(preview.value);
        if (favorites.value.length > MAX_FAVORITES) favorites.value.pop();
        saveFavorites();
        justAdded.value = preview.value;
        addFeedback.value = true;
        setTimeout(() => (addFeedback.value = false), 2000);
        setTimeout(() => (justAdded.value = null), 1500);
    }
}

function removeFavorite(index) {
    const text = favorites.value[index] || "this favorite";
    speak(`Are you sure you want to delete ${text}?`);
    const confirmed = window.confirm(`Remove favorite: "${text}"?`);
    if (!confirmed) return;
    favorites.value.splice(index, 1);
    saveFavorites();
}

function applyFavorite(text) {
    selection.value = text.split(" ");
}

onMounted(loadFavorites);

function addWord(word) {
    // Prevent adding the same word twice in a row
    const lastWord = selection.value[selection.value.length - 1];
    if (lastWord === word) {
        return;
    }
    selection.value.push(word);
}

function removeLast() {
    selection.value.pop();
}

function reset() {
    selection.value = [];
}

function suggestRandom() {
    // Random selection from different categories for variety
    const allWords = [
        ...people,
        ...bodyParts,
        ...actions,
        ...feelings,
        ...descriptors,
        ...things,
    ];
    const randomCount = 3 + Math.floor(Math.random() * 2); // 3-4 words
    const selected = [];
    for (let i = 0; i < randomCount; i++) {
        const word = allWords[Math.floor(Math.random() * allWords.length)];
        if (!selected.includes(word)) {
            selected.push(word);
        }
    }
    selection.value = selected;
}

function sayIt() {
    if (!preview.value || !preview.value.trim()) return;
    speak(preview.value);
}

function sendEmail() {
    if (!preview.value) return;
    speak(`Sending message: ${preview.value}`);
    const messageToSend = preview.value;
    router.post(
        route("profile.contact-admins-email", { message: messageToSend })
    );
    setTimestamp();
}
</script>

<template>
    <div
        class="p-4 rounded-md bg-white dark:bg-slate-800 border shadow-sm w-full"
    >
        <div
            class="sticky top-0 z-10 bg-white dark:bg-slate-800 pb-4 mb-4 -mx-4 px-4 pt-4 -mt-4 shadow-md"
        >
            <div
                :class="[
                    'min-h-[56px] flex items-center px-4 py-3 rounded-md bg-gray-50 dark:bg-slate-700 text-lg font-medium',
                    { 'ring-2 ring-green-400 animate-pulse': speaking },
                ]"
            >
                <div class="flex items-center justify-between w-full">
                    <span
                        class="text-gray-700 dark:text-gray-100 break-words text-2xl md:text-3xl font-bold leading-tight"
                        >{{ preview }}</span
                    >
                    <button
                        type="button"
                        class="ml-4 px-4 py-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                        aria-label="Say message"
                        title="Say message"
                        :disabled="speaking"
                        @click="sayIt"
                    >
                        <i class="ri-speak-fill text-2xl"></i>
                    </button>
                </div>
            </div>

            <div class="flex items-center gap-2 mt-3">
                <button
                    class="p-3 rounded-md bg-slate-700 dark:bg-slate-600 text-white shadow-md"
                    type="button"
                    title="Remove last word"
                    aria-label="Remove last word"
                    @click="removeLast"
                >
                    <i class="ri-delete-back-2-line text-2xl"></i>
                </button>

                <button
                    class="px-4 py-3 rounded-md bg-red-600 hover:bg-red-700 text-white shadow-md font-semibold flex items-center gap-2"
                    type="button"
                    title="Clear all words"
                    aria-label="Clear all words"
                    @click="reset"
                >
                    <i class="ri-delete-bin-line text-2xl"></i>
                </button>

                <button
                    class="p-3 rounded-md bg-slate-700 dark:bg-slate-600 text-white shadow-md"
                    type="button"
                    title="Surprise: build a random sentence"
                    aria-label="Surprise sentence"
                    @click="suggestRandom"
                >
                    <i class="ri-shuffle-line text-2xl"></i>
                </button>

                <button
                    class="ml-2 p-3 rounded-md shadow-md flex items-center"
                    :class="
                        canSaveFavorite
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-400 text-white opacity-60 cursor-not-allowed'
                    "
                    type="button"
                    :title="
                        canSaveFavorite
                            ? 'Save current message as favorite'
                            : isAtMax
                            ? `Max favorites (${MAX_FAVORITES}) reached`
                            : 'Build a message to save'
                    "
                    :aria-label="
                        canSaveFavorite
                            ? 'Save favorite'
                            : 'Save favorite (disabled)'
                    "
                    :aria-disabled="!canSaveFavorite"
                    :disabled="!canSaveFavorite"
                    @click="addFavorite"
                >
                    <i class="ri-heart-add-fill text-2xl mr-2"></i>
                    <span class="sr-only">Save favorite</span>
                </button>

                <div
                    v-if="addFeedback"
                    class="ml-3 inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded"
                >
                    <i class="ri-check-line"></i>
                    <span class="text-sm">Saved</span>
                </div>
            </div>
        </div>

        <div class="space-y-4">
            <!-- Quick Phrases - Most Important -->
            <div>
                <div
                    class="text-base font-bold mb-2 text-blue-600 dark:text-blue-400 flex items-center gap-2"
                >
                    <i class="ri-chat-quote-fill text-3xl"></i>
                    Quick Messages
                    <button
                        type="button"
                        class="ml-auto p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        title="Say 'Quick Messages'"
                        aria-label="Say category name"
                        @click="speak('Quick Messages')"
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in quickPhrases"
                        :key="`qp-${i}`"
                        type="button"
                        class="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xl font-semibold shadow-md hover:bg-blue-700 transition-colors"
                        @click="selection = w.split(' ')"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>

            <!-- People -->
            <div>
                <div class="text-sm font-semibold mb-2 flex items-center gap-2">
                    <i class="ri-user-fill text-purple-600 text-2xl"></i>
                    People
                    <button
                        type="button"
                        class="ml-auto p-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                        title="Say 'People'"
                        aria-label="Say category name"
                        @click="speak('People')"
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in people"
                        :key="`p-${i}`"
                        type="button"
                        class="px-4 py-1.5 rounded-full bg-purple-600 text-white text-xl font-semibold shadow-md hover:bg-purple-700 transition-colors"
                        @click="addWord(w)"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>

            <!-- Body Parts -->
            <div>
                <div class="text-sm font-semibold mb-2 flex items-center gap-2">
                    <i class="ri-body-scan-fill text-red-600 text-2xl"></i>
                    Body Parts
                    <button
                        type="button"
                        class="ml-auto p-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white shadow-sm"
                        title="Say 'Body Parts'"
                        aria-label="Say category name"
                        @click="speak('Body Parts')"
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in bodyParts"
                        :key="`bp-${i}`"
                        type="button"
                        class="px-4 py-1.5 rounded-full bg-red-600 text-white text-xl font-semibold shadow-md hover:bg-red-700 transition-colors"
                        @click="addWord(w)"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>

            <!-- Actions -->
            <div>
                <div class="text-sm font-semibold mb-2 flex items-center gap-2">
                    <i class="ri-run-fill text-green-600 text-2xl"></i>
                    Actions
                    <button
                        type="button"
                        class="ml-auto p-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        title="Say 'Actions'"
                        aria-label="Say category name"
                        @click="speak('Actions')"
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in actions"
                        :key="`a-${i}`"
                        type="button"
                        class="px-4 py-1.5 rounded-full bg-green-600 text-white text-xl font-semibold shadow-md hover:bg-green-700 transition-colors"
                        @click="addWord(w)"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>

            <!-- Feelings -->
            <div>
                <div class="text-sm font-semibold mb-2 flex items-center gap-2">
                    <i
                        class="ri-emotion-happy-fill text-yellow-600 text-2xl"
                    ></i>
                    Feelings
                    <button
                        type="button"
                        class="ml-auto p-1.5 rounded-md bg-yellow-600 hover:bg-yellow-700 text-white shadow-sm"
                        title="Say 'Feelings'"
                        aria-label="Say category name"
                        @click="speak('Feelings')"
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in feelings"
                        :key="`f-${i}`"
                        type="button"
                        class="px-4 py-1.5 rounded-full bg-yellow-600 text-white text-xl font-semibold shadow-md hover:bg-yellow-700 transition-colors"
                        @click="addWord(w)"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>

            <!-- Descriptors -->
            <div>
                <div class="text-sm font-semibold mb-2 flex items-center gap-2">
                    <i class="ri-contrast-fill text-indigo-600 text-2xl"></i>
                    How Much
                    <button
                        type="button"
                        class="ml-auto p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        title="Say 'How Much'"
                        aria-label="Say category name"
                        @click="speak('How Much')"
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in descriptors"
                        :key="`d-${i}`"
                        type="button"
                        class="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xl font-semibold shadow-md hover:bg-indigo-700 transition-colors"
                        @click="addWord(w)"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>

            <!-- Things -->
            <div>
                <div class="text-sm font-semibold mb-2 flex items-center gap-2">
                    <i class="ri-gift-fill text-orange-600 text-2xl"></i>
                    Things I Need
                    <button
                        type="button"
                        class="ml-auto p-1.5 rounded-md bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                        title="Say 'Things I Need'"
                        aria-label="Say category name"
                        @click="speak('Things I Need')"
                    >
                        <i class="ri-speak-fill text-lg"></i>
                    </button>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in things"
                        :key="`t-${i}`"
                        type="button"
                        class="px-4 py-1.5 rounded-full bg-orange-600 text-white text-xl font-semibold shadow-md hover:bg-orange-700 transition-colors"
                        @click="addWord(w)"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="favorites.length" class="mt-6">
            <div
                class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2"
            >
                Saved favorites
            </div>
            <div class="flex gap-2 flex-wrap">
                <div
                    v-for="(f, i) in favorites"
                    :key="`fav-bottom-${i}`"
                    class="flex items-center bg-yellow-500 rounded overflow-hidden"
                    :class="{ 'ring-2 ring-green-400': justAdded === f }"
                >
                    <button
                        type="button"
                        class="flex items-center gap-2 px-3 py-2 text-white text-sm"
                        :title="f"
                        :aria-label="`Apply favorite: ${f}`"
                        @click="applyFavorite(f)"
                    >
                        <i class="ri-heart-fill text-lg"></i>
                        <span class="sr-only">Apply favorite</span>
                    </button>
                    <button
                        type="button"
                        class="px-2 py-2 text-white bg-yellow-600 hover:bg-yellow-700"
                        :title="`Remove favorite: ${f}`"
                        :aria-label="`Remove favorite: ${f}`"
                        @click="removeFavorite(i)"
                    >
                        <i class="ri-close-line"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Moved Email button: bottom action -->
        <div class="mt-6">
            <Button
                class="py-4 text-lg"
                :disabled="buttonsDisabled || !preview"
                @click="sendEmail"
            >
                <i class="ri-mail-fill text-2xl mr-2"></i>
                Email it
            </Button>
        </div>
    </div>
</template>
