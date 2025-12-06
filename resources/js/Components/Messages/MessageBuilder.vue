<script setup>
/* global route */
import Accordion from "@/Components/Accordion.vue";
import Button from "@/Components/Button.vue";
import VirtualKeyboard from "@/Components/VirtualKeyboard.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useForm } from "@inertiajs/vue3";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

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
  "my feet"
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
  "help me"
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
  "thirsty"
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
  "toy"
];
const quickPhrases = [
  "I love you",
  "thank you",
  "please help",
  "I'm okay",
  "yes",
  "no"
];

const selection = ref([]);
const inputValue = ref("");
// Preview uses inputValue as source of truth, with selection as fallback for compatibility
const preview = computed(() => {
  return inputValue.value.trim() || selection.value.join(" ").trim();
});
const keyboardInputRef = ref(null);

const wordCount = computed(() => {
  if (!preview.value) return 0;
  return preview.value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
});

const hasMinimumCharacters = computed(() => {
  return preview.value && preview.value.trim().length >= 10;
});

const { speak, speaking } = useSpeechSynthesis();

const form = useForm({
  message: "",
  tagged_user_ids: []
});

const props = defineProps({
  users: {
    type: Array,
    default: () => []
  }
});

const FAVORITES_KEY = "message_builder_favorites_v1";
const MAX_FAVORITES = 5;
const favorites = ref([]);
const addFeedback = ref(false);
const justAdded = ref(null);

// User tagging autocomplete
const showUserSuggestions = ref(false);
const userSuggestions = ref([]);
const selectedSuggestionIndex = ref(-1);
const mentionQuery = ref("");
const mentionStartPos = ref(-1);
// Track user IDs for mentions: maps mention text (e.g., "@Colin Lowe") to user ID
const mentionUserIds = ref(new Map());
const isAtMax = computed(() => {
  const len = Array.isArray(favorites.value) ? favorites.value.length : 0;
  return len >= MAX_FAVORITES;
});

const canSaveFavorite = computed(() => {
  const hasPreview =
    typeof preview.value === "string" && preview.value.trim().length > 0;
  const hasInputValue =
    typeof inputValue.value === "string" && inputValue.value.trim().length > 0;
  const hasSelection = Array.isArray(selection.value)
    ? selection.value.length > 0
    : false;
  const len = Array.isArray(favorites.value) ? favorites.value.length : 0;
  return (hasPreview || hasInputValue || hasSelection) && len < MAX_FAVORITES;
});

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) || [];
      const arr = Array.isArray(parsed) ? parsed : Object.values(parsed || {});
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
  // Use inputValue if it has content, otherwise use preview
  // This ensures typed text is saved correctly
  const textToSave = inputValue.value.trim() || preview.value.trim() || "";
  if (!textToSave) return;

  // Normalize the text (remove extra spaces) for comparison
  const normalizedText = textToSave.split(/\s+/).join(" ");
  const alreadyExists = favorites.value.some(
    (fav) => fav.split(/\s+/).join(" ") === normalizedText
  );

  if (!alreadyExists) {
    favorites.value.unshift(normalizedText);
    if (favorites.value.length > MAX_FAVORITES) favorites.value.pop();
    saveFavorites();
    justAdded.value = normalizedText;
    addFeedback.value = true;

    // Clear any existing timeouts
    if (feedbackTimeoutId !== null) {
      clearTimeout(feedbackTimeoutId);
    }
    if (justAddedTimeoutId !== null) {
      clearTimeout(justAddedTimeoutId);
    }

    feedbackTimeoutId = setTimeout(() => {
      addFeedback.value = false;
      feedbackTimeoutId = null;
    }, 2000);

    justAddedTimeoutId = setTimeout(() => {
      justAdded.value = null;
      justAddedTimeoutId = null;
    }, 1500);
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
  inputValue.value = text;
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  selection.value = words;
}

// Auto-grow textarea function
function autoGrowTextarea(textarea) {
  if (!textarea) return;
  // Reset height to auto to get the correct scrollHeight
  textarea.style.height = 'auto';
  // Set height to scrollHeight, but cap at max-height (300px)
  const newHeight = Math.min(textarea.scrollHeight, 300);
  textarea.style.height = `${newHeight}px`;
}

// Sync selection with input value (when typing)
function handleInputChange(event) {
  // Get the current value from the input element (KioskBoard updates it directly)
  const currentValue = event?.target?.value ?? inputValue.value;

  // Always update inputValue to match what's actually in the input
  inputValue.value = currentValue;

  // Check for @ mentions
  checkForMentions(
    currentValue,
    event?.target?.selectionStart ?? currentValue.length
  );

  // Update selection for word count (but keep the full input value for display)
  const words = inputValue.value
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  selection.value = words;
}

// Handle textarea input with auto-grow
function handleTextareaInput(event) {
  handleInputChange(event);
  // Auto-grow the textarea
  autoGrowTextarea(event.target);
}

function checkForMentions(text, cursorPos) {
  if (!text || props.users.length === 0) {
    showUserSuggestions.value = false;
    return;
  }

  // If cursorPos is not available, use end of text
  const effectiveCursorPos =
    cursorPos !== undefined && cursorPos !== null ? cursorPos : text.length;

  // Find the last @ before cursor
  const textBeforeCursor = text.substring(0, effectiveCursorPos);
  const lastAtIndex = textBeforeCursor.lastIndexOf("@");

  if (lastAtIndex === -1) {
    showUserSuggestions.value = false;
    return;
  }

  // Check if there's a space or newline after @ (meaning mention is complete)
  const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
  if (textAfterAt.includes(" ") || textAfterAt.includes("\n")) {
    showUserSuggestions.value = false;
    return;
  }

  // Get the query after @
  mentionQuery.value = textAfterAt.toLowerCase();
  mentionStartPos.value = lastAtIndex;

  // Filter users based on query
  if (mentionQuery.value.length > 0) {
    userSuggestions.value = props.users
      .filter((user) => user.name.toLowerCase().includes(mentionQuery.value))
      .slice(0, 5); // Limit to 5 suggestions
  } else {
    userSuggestions.value = props.users.slice(0, 5);
  }

  showUserSuggestions.value = userSuggestions.value.length > 0;
  selectedSuggestionIndex.value = -1;
}

function insertMention(user) {
  if (!keyboardInputRef.value || !user) {
    return;
  }

  const userId = user.id ?? user.user_id ?? user.ID;
  const userName = user.name ?? user.user_name ?? user.Name;

  if (!userName) {
    return;
  }

  const text = inputValue.value;
  const beforeMention = text.substring(0, mentionStartPos.value);
  const mentionText = `@${userName}`;
  const afterMention = text
    .substring(mentionStartPos.value)
    .replace(/@[\w\s]*/, `${mentionText} `);

  inputValue.value = beforeMention + afterMention;

  if (userId !== undefined && userId !== null) {
    const parsedUserId = parseInt(userId, 10);
    if (!isNaN(parsedUserId)) {
      mentionUserIds.value.set(mentionText, parsedUserId);
    }
  }

  keyboardInputRef.value.value = inputValue.value;
  // Auto-grow textarea after inserting mention
  autoGrowTextarea(keyboardInputRef.value);
  keyboardInputRef.value.dispatchEvent(new Event("input", { bubbles: true }));

  showUserSuggestions.value = false;
  mentionQuery.value = "";
  mentionStartPos.value = -1;

  // Clear any existing cursor timeout
  if (cursorTimeoutId !== null) {
    clearTimeout(cursorTimeoutId);
  }

  cursorTimeoutId = setTimeout(() => {
    if (keyboardInputRef.value) {
      const newCursorPos = beforeMention.length + mentionText.length + 2;
      keyboardInputRef.value.setSelectionRange(newCursorPos, newCursorPos);
      keyboardInputRef.value.focus();
    }
    cursorTimeoutId = null;
  }, 0);
}

function handleKeydown(event) {
  if (!showUserSuggestions.value) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    selectedSuggestionIndex.value = Math.min(
      selectedSuggestionIndex.value + 1,
      userSuggestions.value.length - 1
    );
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    selectedSuggestionIndex.value = Math.max(
      selectedSuggestionIndex.value - 1,
      -1
    );
  } else if (event.key === "Enter" && selectedSuggestionIndex.value >= 0) {
    event.preventDefault();
    insertMention(userSuggestions.value[selectedSuggestionIndex.value]);
  } else if (event.key === "Escape") {
    showUserSuggestions.value = false;
  }
}

// Watch for changes to inputValue and sync with the actual input element
watch(
  () => inputValue.value,
  (newValue) => {
    if (keyboardInputRef.value && keyboardInputRef.value.value !== newValue) {
      keyboardInputRef.value.value = newValue;
      // Auto-grow when value changes programmatically
      autoGrowTextarea(keyboardInputRef.value);
    }
  }
);

let inputHandlers = null;
let mountTimeoutId = null;
let cursorTimeoutId = null;
let feedbackTimeoutId = null;
let justAddedTimeoutId = null;

onMounted(() => {
  loadFavorites();

  // Set up event listeners for input changes (including from KioskBoard)
  mountTimeoutId = setTimeout(() => {
    if (keyboardInputRef.value && typeof document !== "undefined") {
      // Initialize textarea height
      autoGrowTextarea(keyboardInputRef.value);
      
      // Add event listeners to catch all input changes (including from KioskBoard)
      const inputEl = keyboardInputRef.value;

      // Listen for input events (from typing or KioskBoard)
      const handleInput = (e) => {
        const value = e.target.value;
        if (value !== inputValue.value) {
          inputValue.value = value;
          // Check for mentions when input changes
          const cursorPos = e.target.selectionStart ?? value.length;
          checkForMentions(value, cursorPos);
          // Auto-grow textarea
          autoGrowTextarea(e.target);
        }
      };

      // Listen for change events
      const handleChange = (e) => {
        const value = e.target.value;
        if (value !== inputValue.value) {
          inputValue.value = value;
        }
      };

      // Close suggestions when clicking outside
      const handleClickOutside = (e) => {
        if (
          !e.target.closest(".user-suggestions-container") &&
          !e.target.closest(".virtual-keyboard-input")
        ) {
          showUserSuggestions.value = false;
        }
      };

      inputEl.addEventListener("input", handleInput);
      inputEl.addEventListener("change", handleChange);
      document.addEventListener("click", handleClickOutside);

      // Store handlers for cleanup
      inputHandlers = {
        element: inputEl,
        input: handleInput,
        change: handleChange,
        clickOutside: handleClickOutside
      };
    }
  }, 200);
});

onUnmounted(() => {
  // Clear any pending timeouts
  if (mountTimeoutId !== null) {
    clearTimeout(mountTimeoutId);
    mountTimeoutId = null;
  }
  if (cursorTimeoutId !== null) {
    clearTimeout(cursorTimeoutId);
    cursorTimeoutId = null;
  }
  if (feedbackTimeoutId !== null) {
    clearTimeout(feedbackTimeoutId);
    feedbackTimeoutId = null;
  }
  if (justAddedTimeoutId !== null) {
    clearTimeout(justAddedTimeoutId);
    justAddedTimeoutId = null;
  }

  // Clean up event listeners
  if (inputHandlers) {
    inputHandlers.element.removeEventListener("input", inputHandlers.input);
    inputHandlers.element.removeEventListener("change", inputHandlers.change);
    if (inputHandlers.clickOutside && typeof document !== "undefined") {
      document.removeEventListener("click", inputHandlers.clickOutside);
    }
    inputHandlers = null;
  }
});

function addWord(word) {
  // Get the actual current value from the input element to ensure we have the latest
  const inputElement = keyboardInputRef.value;
  const currentValue = inputElement?.value ?? inputValue.value;

  // Special handling for @ symbol - don't add space before it
  if (word === "@") {
    const newValue = currentValue + "@";
    inputValue.value = newValue;
    if (inputElement) {
      inputElement.value = newValue;
      inputElement.dispatchEvent(new Event("input", { bubbles: true }));
      // Trigger mention check after @ is added
      setTimeout(() => {
        checkForMentions(newValue, newValue.length);
        inputElement.focus();
      }, 50);
    }
    return;
  }

  // Prevent adding the same word twice in a row
  const words = currentValue
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const lastWord = words[words.length - 1];

  if (lastWord === word) {
    return;
  }

  // Append word to the current input value (including any partial words being typed)
  // Add a space before the new word if the current value doesn't end with a space
  let newValue;
  if (currentValue.trim() && !currentValue.endsWith(" ")) {
    newValue = currentValue + " " + word;
  } else {
    newValue = currentValue + word;
  }

  // Update both the reactive value and the actual input element
  inputValue.value = newValue;
  if (inputElement) {
    inputElement.value = newValue;
    // Trigger input event so KioskBoard knows about the change
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Update selection to reflect the new words
  const newWords = newValue
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  selection.value = newWords;
}

function addPhrase(phrase) {
  // Get the actual current value from the input element to ensure we have the latest
  const inputElement = keyboardInputRef.value;
  const currentValue = inputElement?.value ?? inputValue.value;

  // Append phrase to the current input value
  // Add a space before the new phrase if the current value doesn't end with a space
  let newValue;
  if (currentValue.trim() && !currentValue.endsWith(" ")) {
    newValue = currentValue + " " + phrase;
  } else {
    newValue = currentValue + phrase;
  }

  // Update both the reactive value and the actual input element
  inputValue.value = newValue;
  if (inputElement) {
    inputElement.value = newValue;
    // Trigger input event so KioskBoard knows about the change
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Update selection to reflect the new words
  const newWords = newValue
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  selection.value = newWords;
}

function removeLast() {
  // Remove last word from input value
  const currentText = inputValue.value.trim();
  const words = currentText.split(/\s+/).filter((w) => w.length > 0);

  if (words.length > 0) {
    words.pop();
    inputValue.value = words.join(" ");
    selection.value = words;
  } else {
    inputValue.value = "";
    selection.value = [];
  }
}

function reset() {
  inputValue.value = "";
  selection.value = [];
  showUserSuggestions.value = false;
  mentionQuery.value = "";
  mentionStartPos.value = -1;
  mentionUserIds.value.clear();
}

function suggestRandom() {
  // Random selection from different categories for variety
  const allWords = [
    ...people,
    ...bodyParts,
    ...actions,
    ...feelings,
    ...descriptors,
    ...things
  ];
  const randomCount = 3 + Math.floor(Math.random() * 2); // 3-4 words
  const selected = [];
  for (let i = 0; i < randomCount; i++) {
    const word = allWords[Math.floor(Math.random() * allWords.length)];
    if (!selected.includes(word)) {
      selected.push(word);
    }
  }
  inputValue.value = selected.join(" ");
  selection.value = selected;
}

function sayIt() {
  // Always get the actual current value from the input element
  // This ensures we speak what's actually in the input, including keyboard-typed text
  const inputElement = keyboardInputRef.value;
  const currentText = inputElement?.value?.trim() || inputValue.value.trim();

  if (!currentText) {
    return;
  }

  // Update inputValue to keep it in sync with the actual input
  if (inputElement && inputElement.value !== inputValue.value) {
    inputValue.value = inputElement.value;
  }

  speak(currentText);
}

function postMessage() {
  if (!preview.value?.trim() || form.processing || !hasMinimumCharacters.value) return;
  speak(`Posting message: ${preview.value}`);

  const taggedUserIds = [];
  const messageText = preview.value;

  for (const [mentionText, userId] of mentionUserIds.value.entries()) {
    if (messageText.includes(mentionText)) {
      const id = parseInt(userId, 10);
      if (!isNaN(id)) {
        taggedUserIds.push(id);
      }
    } else {
      const mentionWithoutAt = mentionText.startsWith("@")
        ? mentionText.substring(1)
        : mentionText;
      const escapedMention = mentionWithoutAt.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const mentionPattern = new RegExp(
        `@${escapedMention}(?=\\s|$|[^\\w\\s])`,
        "i"
      );

      if (mentionPattern.test(messageText)) {
        const id = parseInt(userId, 10);
        if (!isNaN(id)) {
          taggedUserIds.push(id);
        }
      }
    }
  }

  // Update the existing form instance with the data
  form.message = messageText;
  form.tagged_user_ids = taggedUserIds;

  form.post(route("messages.store"), {
    preserveScroll: true,
    onSuccess: () => {
      // Clear input after successful post
      inputValue.value = "";
      selection.value = [];
      mentionUserIds.value.clear();
      form.reset();
    },
    onError: () => {}
  });
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
          'min-h-[56px] flex items-start px-4 py-3 rounded-md bg-gray-50 dark:bg-slate-700 text-lg font-medium',
          { 'ring-2 ring-green-400 animate-pulse': speaking }
        ]"
      >
        <div class="flex items-center justify-between w-full relative">
          <textarea
            ref="keyboardInputRef"
            v-model="inputValue"
            class="virtual-keyboard-input flex-1 text-gray-700 dark:text-gray-100 break-words text-2xl md:text-3xl font-bold leading-tight bg-transparent border-none outline-none focus:outline-none resize-none overflow-hidden min-h-[40px] max-h-[300px]"
            placeholder="Type your message here... (use @ to tag users)"
            rows="1"
            @input="handleTextareaInput"
            @change="handleInputChange"
            @keydown="handleKeydown"
          />

          <!-- User Suggestions Dropdown -->
          <div
            v-if="showUserSuggestions"
            class="user-suggestions-container absolute top-full left-0 mt-1 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-[100] max-h-60 overflow-y-auto"
          >
            <div
              v-for="(user, index) in userSuggestions"
              :key="user.id"
              :class="[
                'px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700',
                selectedSuggestionIndex === index
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : ''
              ]"
              @click="insertMention(user)"
            >
              <div class="font-semibold text-gray-900 dark:text-gray-100">
                @{{ user.name }}
              </div>
            </div>
          </div>
          <button
            type="button"
            class="ml-4 px-4 py-3 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-md self-start mt-1"
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
          class="px-4 py-3 rounded-md bg-blue-600 dark:bg-blue-500 text-white shadow-md hover:bg-blue-700 dark:hover:bg-blue-600 font-bold text-2xl"
          type="button"
          title="Tag a user (@)"
          aria-label="Tag a user"
          @click="addWord('@')"
        >
          @
        </button>
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
            canSaveFavorite ? 'Save favorite' : 'Save favorite (disabled)'
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

    <Accordion title="Prebuilt Messages">
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
              @click="addPhrase(w)"
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
            <i class="ri-emotion-happy-fill text-yellow-600 text-2xl"></i>
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
    </Accordion>

    <div v-if="favorites.length" class="mt-6">
      <div class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
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

    <!-- Post to Timeline button: bottom action -->
    <div class="mt-6">
      <Button
        class="py-4 text-lg"
        :disabled="form.processing || !hasMinimumCharacters"
        @click="postMessage"
      >
        <i class="ri-send-plane-fill text-2xl mr-2"></i>
        Post to Timeline
      </Button>
    </div>

    <!-- Virtual Keyboard Component -->
    <VirtualKeyboard
      input-selector=".virtual-keyboard-input"
      :auto-focus="false"
    />
  </div>
</template>
