<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import { useButtonState } from "@/composables/useDisableButtonState";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router } from "@inertiajs/vue3";
import { ref, computed, onMounted } from "vue";

const subjects = ["I", "We", "Mom", "Dad", "My tummy", "My legs"];
const verbs = ["feel", "need", "love", "am", "are", "want"];
const adjectives = [
    "happy",
    "sad",
    "silly",
    "excited",
    "sore",
    "hungry",
    "good",
    "farting",
];
const objects = ["please", "now", "a hug", "help", "food", "rest"];

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
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const v = verbs[Math.floor(Math.random() * verbs.length)];
    const a = adjectives[Math.floor(Math.random() * adjectives.length)];
    const o = objects[Math.floor(Math.random() * objects.length)];
    selection.value = [s, v, a, o].filter(Boolean);
}

function sayIt() {
    const placeholder = "Tap words to start a message...";
    const text =
        preview.value && preview.value.length ? preview.value : placeholder;
    speak(text);
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
        <div class="flex items-center mb-3">
            <i class="ri-gamepad-fill text-4xl text-red-500 mr-3"></i>
            <div>
                <div class="text-xl font-semibold">Build a message</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                    Tap words to make a sentence, then say it or email it.
                </div>
            </div>
        </div>

        <!-- Sticky preview and controls -->
        <div class="sticky top-0 z-10 bg-white dark:bg-slate-800 pb-4 mb-4 -mx-4 px-4 pt-4 -mt-4 shadow-md">
            <div
                :class="[
                    'min-h-[56px] flex items-center px-4 py-3 rounded-md bg-gray-50 dark:bg-slate-700 text-lg font-medium',
                    { 'ring-2 ring-green-400 animate-pulse': speaking },
                ]"
            >
                <div class="flex items-center justify-between w-full">
                    <span
                        class="text-gray-700 dark:text-gray-100 break-words text-2xl md:text-3xl font-bold leading-tight"
                        >{{
                            preview || "Tap words to start a message..."
                        }}</span
                    >
                    <button
                        type="button"
                        class="ml-4 p-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
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
                    class="p-3 rounded-md bg-slate-700 dark:bg-slate-600 text-white shadow-md"
                    type="button"
                    title="Reset message"
                    aria-label="Reset message"
                    @click="reset"
                >
                    <i class="ri-refresh-line text-2xl"></i>
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

        <div class="space-y-3">
            <div>
                <div class="text-sm font-semibold mb-2">Who / What</div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in subjects"
                        :key="`s-${i}`"
                        type="button"
                        class="px-4 py-3 rounded bg-purple-900 text-white text-lg font-semibold shadow-md"
                        @click="addWord(w)"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>

            <div>
                <div class="text-sm font-semibold mb-2">Action</div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in verbs"
                        :key="`v-${i}`"
                        type="button"
                        class="px-4 py-3 rounded bg-purple-900 text-white text-lg font-semibold shadow-md"
                        @click="addWord(w)"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>

            <div>
                <div class="text-sm font-semibold mb-2">Feeling / Object</div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in [...adjectives, ...objects]"
                        :key="`o-${i}`"
                        type="button"
                        class="px-4 py-3 rounded bg-purple-900 text-white text-lg font-semibold shadow-md"
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
