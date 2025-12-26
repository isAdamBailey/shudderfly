<template>
  <Modal :show="show" max-width="2xl" @close="$emit('close')">
    <div class="flex flex-col" style="max-height: 85vh;">
      <!-- Sticky Header -->
      <div class="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {{ t("message.create_message") }}
        </h2>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          @click="$emit('close')"
        >
          <i class="ri-close-line text-2xl"></i>
        </button>
      </div>
      
      <!-- Sticky Message Builder Input -->
      <div class="p-6 pb-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <MessageBuilder
          v-if="show"
          :users="users"
          @message-posted="$emit('message-posted')"
        />
      </div>

      <!-- Scrollable Prebuilt Messages Accordion -->
      <div class="flex-1 overflow-y-auto p-6 pt-4 min-h-0">
        <Accordion
          :title="t('flyout.prebuilt_messages')"
          :default-open="false"
          :compact="true"
        >
          <!-- Quick Phrases -->
          <div class="mb-4">
            <div
              class="text-base font-bold mb-2 text-blue-600 dark:text-blue-400 flex items-center gap-2"
            >
              <i class="ri-chat-quote-fill text-3xl"></i>
              {{ t("flyout.quick_messages") }}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(phrase, i) in quickPhrases"
                :key="`qp-${i}`"
                type="button"
                class="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xl font-semibold shadow-md hover:bg-blue-700 transition-colors"
                @click="handleAddPhrase(phrase)"
              >
                {{ phrase }}
              </button>
            </div>
          </div>

          <!-- Common Starters -->
          <div class="mb-4">
            <div
              class="text-base font-bold mb-2 text-teal-600 dark:text-teal-400 flex items-center gap-2"
            >
              <i class="ri-play-circle-fill text-3xl"></i>
              {{ t("flyout.common_starters") }}
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
          <div class="mb-4">
            <div class="text-sm font-semibold mb-2 flex items-center gap-2">
              <i class="ri-gift-fill text-orange-600 text-2xl"></i>
              {{ t("flyout.things_i_need") }}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(thing, i) in things"
                :key="`t-${i}`"
                type="button"
                class="px-4 py-1.5 rounded-full bg-orange-600 text-white text-xl font-semibold shadow-md hover:bg-orange-700 transition-colors"
                @click="handleAddPhrase(thing)"
              >
                {{ thing }}
              </button>
            </div>
          </div>

          <!-- People -->
          <div class="mb-4">
            <div class="text-sm font-semibold mb-2 flex items-center gap-2">
              <i class="ri-user-fill text-purple-600 text-2xl"></i>
              {{ t("flyout.people") }}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(person, i) in people"
                :key="`p-${i}`"
                type="button"
                class="px-4 py-1.5 rounded-full bg-purple-600 text-white text-xl font-semibold shadow-md hover:bg-purple-700 transition-colors"
                @click="handleAddWord(person)"
              >
                {{ person }}
              </button>
            </div>
          </div>

          <!-- Body Parts -->
          <div class="mb-4">
            <div class="text-sm font-semibold mb-2 flex items-center gap-2">
              <i class="ri-body-scan-fill text-red-600 text-2xl"></i>
              {{ t("flyout.body_parts") }}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(part, i) in bodyParts"
                :key="`bp-${i}`"
                type="button"
                class="px-4 py-1.5 rounded-full bg-red-600 text-white text-xl font-semibold shadow-md hover:bg-red-700 transition-colors"
                @click="handleAddPhrase(part)"
              >
                {{ part }}
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="mb-4">
            <div class="text-sm font-semibold mb-2 flex items-center gap-2">
              <i class="ri-run-fill text-green-600 text-2xl"></i>
              {{ t("flyout.actions") }}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(action, i) in actions"
                :key="`a-${i}`"
                type="button"
                class="px-4 py-1.5 rounded-full bg-green-600 text-white text-xl font-semibold shadow-md hover:bg-green-700 transition-colors"
                @click="handleAddWord(action)"
              >
                {{ action }}
              </button>
            </div>
          </div>

          <!-- Feelings -->
          <div class="mb-4">
            <div class="text-sm font-semibold mb-2 flex items-center gap-2">
              <i class="ri-emotion-happy-fill text-yellow-600 text-2xl"></i>
              {{ t("flyout.feelings") }}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(feeling, i) in feelings"
                :key="`f-${i}`"
                type="button"
                class="px-4 py-1.5 rounded-full bg-yellow-600 text-white text-xl font-semibold shadow-md hover:bg-yellow-700 transition-colors"
                @click="handleAddWord(feeling)"
              >
                {{ feeling }}
              </button>
            </div>
          </div>

          <!-- Descriptors -->
          <div class="mb-4">
            <div class="text-sm font-semibold mb-2 flex items-center gap-2">
              <i class="ri-contrast-fill text-indigo-600 text-2xl"></i>
              {{ t("flyout.how_much") }}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(desc, i) in descriptors"
                :key="`d-${i}`"
                type="button"
                class="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xl font-semibold shadow-md hover:bg-indigo-700 transition-colors"
                @click="handleAddWord(desc)"
              >
                {{ desc }}
              </button>
            </div>
          </div>
        </Accordion>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import Accordion from "@/Components/Accordion.vue";
import MessageBuilder from "@/Components/Messages/MessageBuilder.vue";
import Modal from "@/Components/Modal.vue";
import { useMessageBuilder } from "@/composables/useMessageBuilder";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { useTranslations } from "@/composables/useTranslations";

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  users: {
    type: Array,
    default: () => []
  }
});

defineEmits(["close", "message-posted"]);

const { t } = useTranslations();
const { speak } = useSpeechSynthesis();
const { getActiveAddWord, getActiveAddPhrase, getActiveGetPreview } =
  useMessageBuilder();

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
  const addWordFn = getActiveAddWord();
  if (addWordFn) {
    addWordFn(word);
  }
}

function handleAddPhrase(phrase) {
  const addPhraseFn = getActiveAddPhrase();
  if (addPhraseFn) {
    addPhraseFn(phrase);
    setTimeout(() => {
      const getPreviewFn = getActiveGetPreview();
      if (getPreviewFn) {
        const fullMessage = getPreviewFn();
        if (fullMessage) {
          speak(fullMessage);
        }
      }
    }, 50);
  }
}
</script>

