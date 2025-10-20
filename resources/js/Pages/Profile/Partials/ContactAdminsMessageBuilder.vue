<script setup>
/* global route */
import Button from "@/Components/Button.vue";
import { useButtonState } from "@/composables/useDisableButtonState";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { router } from "@inertiajs/vue3";
import { ref, computed, onMounted } from "vue";

defineProps({
    adminUsers: { type: Array, default: () => [] },
});

const subjects = ["I", "We", "Mom", "Dad", "My tummy", "My legs"];
const verbs = ["feel", "need", "love", "am", "are"];
const adjectives = [
    "happy",
    "sad",
    "silly",
    "excited",
    "sore",
    "hungry",
    "good",
];
const objects = ["please", "now", "a hug", "help", "food", "rest"];

const selection = ref([]);
const preview = computed(() => selection.value.join(" ").trim());

const { buttonsDisabled, setTimestamp } = useButtonState();
const { speak, speaking } = useSpeechSynthesis();

// Favorites (persisted to localStorage)
const FAVORITES_KEY = "contact_builder_favorites_v1";
const favorites = ref([]);
const addFeedback = ref(false);
const justAdded = ref(null);

function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        if (raw) favorites.value = JSON.parse(raw) || [];
    } catch (e) {
        favorites.value = [];
    }
}

function saveFavorites() {
    try {
        localStorage.setItem(
            FAVORITES_KEY,
            JSON.stringify(favorites.value || [])
        );
    } catch (e) {
        // ignore
    }
}

function addFavorite() {
    if (!preview.value) return;
    if (!favorites.value.includes(preview.value)) {
        favorites.value.unshift(preview.value);
        if (favorites.value.length > 8) favorites.value.pop();
        saveFavorites();
        // visual feedback
        justAdded.value = preview.value;
        addFeedback.value = true;
        setTimeout(() => (addFeedback.value = false), 2000);
        setTimeout(() => (justAdded.value = null), 1500);
    }
}

function removeFavorite(index) {
    // confirmation before deletion
    const text = favorites.value[index] || "this favorite";
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
    selection.value.push(word);
}

function removeLast() {
    selection.value.pop();
}

function reset() {
    selection.value = [];
}

function suggestRandom() {
    // Pick a random, child-friendly sentence
    const s = subjects[Math.floor(Math.random() * subjects.length)];
    const v = verbs[Math.floor(Math.random() * verbs.length)];
    const a = adjectives[Math.floor(Math.random() * adjectives.length)];
    const o = objects[Math.floor(Math.random() * objects.length)];
    selection.value = [s, v, a, o].filter(Boolean);
}

// Undo toast after send
const showUndo = ref(false);
const lastSentMessage = ref("");
let undoTimer = null;

function sayIt() {
    if (!preview.value) return;
    speak(preview.value);
}

function sendEmail() {
    if (!preview.value) return;
    // speak a small confirmation and send
    speak(`Sending message: ${preview.value}`);
    const messageToSend = preview.value;
    router.post(
        route("profile.contact-admins-email", { message: messageToSend })
    );
    setTimestamp();

    // show undo toast for a short window
    lastSentMessage.value = messageToSend;
    showUndo.value = true;
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => {
        showUndo.value = false;
        lastSentMessage.value = "";
        undoTimer = null;
    }, 6000);
}

function undoSend() {
    // Previously this sent a follow-up email asking admins to disregard the previous message.
    // Remove that network call so Undo only clears the UI state locally.
    const prev = lastSentMessage.value;
    if (!prev) return;
    // Do not send a follow-up email; just clear the undo state locally.
    showUndo.value = false;
    lastSentMessage.value = "";
    clearTimeout(undoTimer);
    undoTimer = null;
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

        <div class="mb-4">
            <div
                :class="[
                    'min-h-[56px] flex items-center px-4 py-3 rounded-md bg-gray-50 dark:bg-slate-700 text-lg font-medium',
                    { 'ring-2 ring-green-400 animate-pulse': speaking },
                ]"
            >
                <div class="flex items-center justify-between w-full">
                    <span
                        class="text-gray-700 dark:text-gray-100 break-words"
                        >{{
                            preview || "Tap words to start a message..."
                        }}</span
                    >
                    <button
                        type="button"
                        class="ml-4 p-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                        aria-label="Say message"
                        title="Say message"
                        :disabled="speaking || !preview"
                        @click="sayIt"
                    >
                        <i class="ri-speak-fill text-2xl"></i>
                    </button>
                </div>
            </div>

            <!-- Email button removed from here and placed below the controls -->

            <div class="flex items-center gap-2 mt-3">
                <!-- Icon-only secondary controls with ARIA/tooltips and larger touch targets -->
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

                <!-- Save favorite quick-access -->
                <button
                    class="ml-2 p-3 rounded-md bg-red-500 text-white shadow-md flex items-center"
                    type="button"
                    title="Save current message as favorite"
                    aria-label="Save favorite"
                    @click="addFavorite"
                >
                    <i class="ri-heart-add-fill text-2xl mr-2"></i>
                    <span class="sr-only">Save favorite</span>
                </button>

                <!-- visual feedback when saving -->
                <div
                    v-if="addFeedback"
                    class="ml-3 inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded"
                >
                    <i class="ri-check-line"></i>
                    <span class="text-sm">Saved</span>
                </div>

                <!-- Undo toast (appears here) -->
                <div
                    v-if="showUndo"
                    class="ml-4 bg-gray-100 dark:bg-slate-700 px-3 py-2 rounded flex items-center gap-3"
                >
                    <div class="text-sm">Message sent</div>
                    <button
                        class="px-3 py-1 rounded bg-white dark:bg-slate-600 text-sm"
                        aria-label="Undo send"
                        title="Undo send (notify admins to disregard)"
                        @click="undoSend"
                    >
                        Undo
                    </button>
                </div>
            </div>
        </div>

        <!-- Moved Email button under controls to make it more obvious after actions -->
        <div class="flex gap-2 mt-4">
            <Button
                class="w-full py-4 text-lg"
                :disabled="buttonsDisabled || !preview"
                @click="sendEmail"
            >
                <i class="ri-mail-fill text-2xl mr-2"></i>
                Email it
            </Button>
        </div>

        <div class="space-y-3">
            <div>
                <div class="text-sm font-semibold mb-2">Who / What</div>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(w, i) in subjects"
                        :key="`s-${i}`"
                        type="button"
                        class="px-4 py-3 rounded bg-purple-900 text-white text-base shadow-md"
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
                        class="px-4 py-3 rounded bg-purple-900 text-white text-base shadow-md"
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
                        class="px-4 py-3 rounded bg-purple-900 text-white text-base shadow-md"
                        @click="addWord(w)"
                    >
                        {{ w }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Favorites moved to bottom -->
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
    </div>
</template>
