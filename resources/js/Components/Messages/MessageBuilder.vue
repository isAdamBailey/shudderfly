<script setup>
/* global route */
import Accordion from "@/Components/Accordion.vue";
import Button from "@/Components/Button.vue";
import { useMessageBuilder } from "@/composables/useMessageBuilder";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";
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
const commonStarters = [
  "I want",
  "I need",
  "I feel",
  "I am",
  "I like",
  "I love",
  "I have",
  "I want to",
  "I need to"
];
const things = [
  "a hug",
  "a snack",
  "a copy",
  "a drink",
  "a break",
  "a toy",
  "a blanket",
  "some food",
  "some water",
  "some medicine",
  "some rest",
  "some help",
  "food",
  "water",
  "medicine",
  "rest",
  "help",
  "the bathroom",
  "my bed"
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
const actionsAccordionOpen = ref(false);

const hasMinimumCharacters = computed(() => {
  return preview.value && preview.value.trim().length >= 10;
});

const { speak, speaking } = useSpeechSynthesis();
const { t } = useTranslations();

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
  textarea.style.height = "auto";
  // Set height to scrollHeight, but cap at max-height (200px)
  const newHeight = Math.min(textarea.scrollHeight, 200);
  textarea.style.height = `${newHeight}px`;
}

// Sync selection with input value (when typing)
function handleInputChange(event) {
  // Get the current value from the input element
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
  // Set message input as active by default
  setActiveMessageInput();

  // Set up event listeners for input changes
  mountTimeoutId = setTimeout(() => {
    if (keyboardInputRef.value && typeof document !== "undefined") {
      // Initialize textarea height
      autoGrowTextarea(keyboardInputRef.value);

      // Add event listeners to catch all input changes
      const inputEl = keyboardInputRef.value;

      // Listen for input events
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
          !e.target.closest(".message-input")
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
    // Trigger input event
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
    // Trigger input event
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Update selection to reflect the new words
  const newWords = newValue
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  selection.value = newWords;
}

// Register functions with composable for MessageBuilderFlyout to use
const { setAddWord, setAddPhrase, setGetPreview, setActiveMessageInput } = useMessageBuilder();
setAddWord(addWord);
setAddPhrase(addPhrase);
setGetPreview(() => preview.value);

// Set message input as active when focused
const handleMessageInputFocus = () => {
  setActiveMessageInput();
};

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
    ...things,
    ...commonStarters,
    ...quickPhrases
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
  if (!preview.value?.trim() || form.processing || !hasMinimumCharacters.value)
    return;
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
    preserveScroll: false,
    onSuccess: () => {
      // Clear input after successful post
      inputValue.value = "";
      selection.value = [];
      mentionUserIds.value.clear();
      form.reset();

      // Close actions accordion and scroll to top
      actionsAccordionOpen.value = false;
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      }, 100);
    },
    onError: () => {}
  });
}
</script>

<template>
  <div
    class="p-4 rounded-md bg-white dark:bg-slate-800 border shadow-sm w-full"
  >
    <!-- Message Input -->
    <div class="mb-3">
      <div
        :class="[
          'min-h-[44px] flex items-start px-3 py-2 rounded-md bg-gray-50 dark:bg-slate-700 text-sm font-medium',
          { 'ring-2 ring-green-400 animate-pulse': speaking }
        ]"
      >
        <div class="flex items-center justify-between w-full relative">
          <textarea
            ref="keyboardInputRef"
            v-model="inputValue"
            class="message-input flex-1 text-gray-700 dark:text-gray-100 break-words text-lg md:text-xl font-bold leading-tight bg-transparent border-none outline-none focus:outline-none resize-none overflow-hidden min-h-[32px] max-h-[200px]"
            :placeholder="t('builder.placeholder')"
            rows="1"
            @input="handleTextareaInput"
            @change="handleInputChange"
            @keydown="handleKeydown"
            @focus="handleMessageInputFocus"
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
            class="ml-3 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-md self-start"
            :aria-label="t('builder.say_message_aria')"
            :title="t('builder.say_message')"
            :disabled="speaking"
            @click="sayIt"
          >
            <i class="ri-speak-fill text-lg"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Actions Accordion -->
    <Accordion
      ref="actionsAccordionRef"
      v-model="actionsAccordionOpen"
      :title="t('builder.actions')"
      :default-open="false"
      :compact="true"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <button
          class="px-4 py-3 rounded-md bg-blue-600 dark:bg-blue-500 text-white shadow-md hover:bg-blue-700 dark:hover:bg-blue-600 font-bold text-2xl"
          type="button"
          :title="t('builder.tag_user')"
          :aria-label="t('builder.tag_user_aria')"
          @click="addWord('@')"
        >
          @
        </button>
        <button
          class="p-3 rounded-md bg-slate-700 dark:bg-slate-600 text-white shadow-md"
          type="button"
          :title="t('builder.remove_last_word')"
          :aria-label="t('builder.remove_last_word_aria')"
          @click="removeLast"
        >
          <i class="ri-delete-back-2-line text-2xl"></i>
        </button>

        <button
          class="px-4 py-3 rounded-md bg-red-600 hover:bg-red-700 text-white shadow-md font-semibold flex items-center gap-2"
          type="button"
          :title="t('builder.clear_all')"
          :aria-label="t('builder.clear_all_aria')"
          @click="reset"
        >
          <i class="ri-delete-bin-line text-2xl"></i>
        </button>

        <button
          class="p-3 rounded-md bg-slate-700 dark:bg-slate-600 text-white shadow-md"
          type="button"
          :title="t('builder.surprise')"
          :aria-label="t('builder.surprise_aria')"
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
              ? t('builder.save_favorite')
              : isAtMax
              ? t('builder.max_favorites', { count: MAX_FAVORITES })
              : t('builder.build_to_save')
          "
          :aria-label="
            canSaveFavorite ? t('builder.save_favorite') : t('builder.save_favorite_disabled')
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
          <span class="text-sm">{{ t('builder.saved') }}</span>
        </div>
      </div>

      <!-- Saved Favorites -->
      <div
        v-if="favorites.length"
        class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
        <div class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          {{ t('builder.saved_favorites') }}
        </div>
        <div class="flex gap-2 flex-wrap">
          <div
            v-for="(f, i) in favorites"
            :key="`fav-${i}`"
            class="flex items-center bg-yellow-500 rounded overflow-hidden"
            :class="{ 'ring-2 ring-green-400': justAdded === f }"
          >
            <button
              type="button"
              class="flex items-center gap-2 px-3 py-2 text-white text-sm"
              :title="f"
              :aria-label="t('builder.apply_favorite', { favorite: f })"
              @click="applyFavorite(f)"
            >
              <i class="ri-heart-fill text-lg"></i>
              <span class="sr-only">Apply favorite</span>
            </button>
            <button
              type="button"
              class="px-2 py-2 text-white bg-yellow-600 hover:bg-yellow-700"
              :title="t('builder.remove_favorite', { favorite: f })"
              :aria-label="t('builder.remove_favorite', { favorite: f })"
              @click="removeFavorite(i)"
            >
              <i class="ri-close-line"></i>
            </button>
          </div>
        </div>
      </div>
    </Accordion>

    <!-- Post to Timeline button: bottom action -->
    <div class="mt-6">
      <Button
        class="py-4 text-lg w-full"
        :disabled="form.processing || !hasMinimumCharacters"
        @click="postMessage"
      >
        <i class="ri-send-plane-fill text-2xl mr-2"></i>
        {{ t('builder.post_to_timeline') }}
      </Button>
    </div>
  </div>
</template>
