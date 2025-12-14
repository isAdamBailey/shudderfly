<template>
  <!-- Only render if on messages page -->
  <div v-if="isMessagesPage">
    <!-- Backdrop -->
    <div
      v-if="isFlyoutOpen"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
      @click="closeFlyout"
    ></div>

    <!-- Message Builder Indicator Button (always visible, moves with flyout) -->
    <div
      class="fixed left-0 top-1/2 -translate-y-1/2 z-50 transition-transform duration-300 ease-in-out"
      :class="{
        'translate-x-0': !isFlyoutOpen,
        'translate-x-96 sm:translate-x-96': isFlyoutOpen
      }"
      style="margin-top: -60px"
    >
      <button
        type="button"
        class="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white dark:text-white shadow-lg dark:shadow-gray-900 flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-r-lg px-2 py-3 relative w-8 h-16"
        aria-label="Toggle prebuilt messages"
        @click="toggleFlyout"
      >
        <i class="ri-message-3-line text-lg"></i>
      </button>
    </div>

    <!-- Flyout Panel -->
    <div
      class="fixed left-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto"
      :class="{
        'translate-x-0': isFlyoutOpen,
        '-translate-x-full': !isFlyoutOpen
      }"
    >

      <div class="flex flex-col h-full">
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10"
        >
          <h2
            class="text-2xl font-heading font-semibold text-indigo-600 dark:text-gray-100"
          >
            Prebuilt Messages
          </h2>
          <button
            class="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center transition-all duration-200"
            @click="closeFlyout"
          >
            <i class="ri-close-line text-xl"></i>
          </button>
        </div>

        <!-- Flyout Content -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
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
                @click="handleAddPhrase(w)"
              >
                {{ w }}
              </button>
            </div>
          </div>

          <!-- Common Starters -->
          <div>
            <div
              class="text-base font-bold mb-2 text-teal-600 dark:text-teal-400 flex items-center gap-2"
            >
              <i class="ri-play-circle-fill text-3xl"></i>
              Common Starters
              <button
                type="button"
                class="ml-auto p-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                title="Say 'Common Starters'"
                aria-label="Say category name"
                @click="speak('Common Starters')"
              >
                <i class="ri-speak-fill text-lg"></i>
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(starter, i) in commonStarters"
                :key="`cs-${i}`"
                type="button"
                class="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-xl font-semibold shadow-md hover:bg-teal-700 transition-colors"
                @click="handleAddPhrase(starter)"
              >
                {{ starter }}
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
                @click="handleAddPhrase(w)"
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
                @click="handleAddWord(w)"
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
                @click="handleAddWord(w)"
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
                @click="handleAddWord(w)"
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
                @click="handleAddWord(w)"
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
                @click="handleAddWord(w)"
              >
                {{ w }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMessageBuilder } from "@/composables/useMessageBuilder";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

const {
  isFlyoutOpen,
  toggleFlyout,
  closeFlyout,
  addWord: addWordFn,
  addPhrase: addPhraseFn,
  getPreview: getPreviewFn
} = useMessageBuilder();
const { speak } = useSpeechSynthesis();
const page = usePage();

// Check if we're on the messages page
const isMessagesPage = computed(() => {
  return page.url.startsWith("/messages");
});

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

function handleAddWord(word) {
  if (addWordFn.value) {
    addWordFn.value(word);
  }
}

function handleAddPhrase(phrase) {
  // Add it to the message builder first
  if (addPhraseFn.value) {
    addPhraseFn.value(phrase);
    // Then speak the complete message after a short delay to ensure it's updated
    setTimeout(() => {
      if (getPreviewFn.value) {
        const fullMessage = getPreviewFn.value();
        if (fullMessage) {
          speak(fullMessage);
        }
      }
    }, 50);
  }
}
</script>

