<script setup>
import Button from "@/Components/Button.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { debounce } from "lodash";
import { computed, onUnmounted, ref, watch } from "vue";

const VOICE_LOADING_TIMEOUT = 3000;

// Slider configuration constants
const SPEECH_RATE_MIN = 0;
const SPEECH_RATE_MAX = 1.5;
const SPEECH_PITCH_MIN = 0;
const SPEECH_PITCH_MAX = 2;
const SPEECH_VOLUME_MIN = 0.1;
const SPEECH_VOLUME_MAX = 1;

// Helper functions to convert numeric values to descriptive words
function getSpeechRateDescription(value) {
  const range = SPEECH_RATE_MAX - SPEECH_RATE_MIN;
  const third = range / 3;

  if (value <= SPEECH_RATE_MIN + third) return "slow";
  if (value <= SPEECH_RATE_MIN + 2 * third) return "normal";
  return "fast";
}

function getSpeechPitchDescription(value) {
  const range = SPEECH_PITCH_MAX - SPEECH_PITCH_MIN;
  const third = range / 3;

  if (value <= SPEECH_PITCH_MIN + third) return "low";
  if (value <= SPEECH_PITCH_MIN + 2 * third) return "normal";
  return "high";
}

function getSpeechVolumeDescription(value) {
  const range = SPEECH_VOLUME_MAX - SPEECH_VOLUME_MIN;
  const third = range / 3;

  if (value <= SPEECH_VOLUME_MIN + third) return "quiet";
  if (value <= SPEECH_VOLUME_MIN + 2 * third) return "normal";
  return "loud";
}

const {
  voices,
  selectedVoice,
  setVoice,
  speechRate,
  speechPitch,
  speechVolume,
  selectedEmotion,
  speaking,
  setSpeechRateSilent,
  setSpeechPitchSilent,
  setSpeechVolumeSilent,
  setSelectedEmotion,
  speak
} = useSpeechSynthesis();
const { canEditPages } = usePermissions();

const voicesLoading = ref(true);
let voiceLoadingTimeoutId = null;

const filteredVoices = computed(() =>
  voices.value.filter(
    (voice) => voice.lang === "en-US" || voice.lang === "en_US"
  )
);
const halfLength = computed(() => Math.ceil(filteredVoices.value.length / 2));
const firstHalf = computed(() =>
  filteredVoices.value.slice(0, halfLength.value)
);
const secondHalf = computed(() => filteredVoices.value.slice(halfLength.value));

watch(
  voices,
  (newVoices) => {
    if (newVoices.length > 0) {
      voicesLoading.value = false;
    }
  },
  { immediate: true }
);

watch(
  () => voices.value.length,
  (newLength) => {
    if (newLength === 0) {
      voiceLoadingTimeoutId = setTimeout(() => {
        if (voicesLoading.value) {
          voicesLoading.value = false;
        }
      }, VOICE_LOADING_TIMEOUT);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (voiceLoadingTimeoutId) {
    clearTimeout(voiceLoadingTimeoutId);
  }
});

const localSpeechRate = ref(speechRate.value);
const localSpeechPitch = ref(speechPitch.value);
const localSpeechVolume = ref(speechVolume.value);

const debouncedSpeechRateUpdate = debounce((value) => {
  setSpeechRateSilent(value);
  speak(`Speech rate set to ${getSpeechRateDescription(value)}`);
}, 500);

const debouncedSpeechPitchUpdate = debounce((value) => {
  setSpeechPitchSilent(value);
  speak(`Pitch set to ${getSpeechPitchDescription(value)}`);
}, 500);

const debouncedSpeechVolumeUpdate = debounce((value) => {
  setSpeechVolumeSilent(value);
  speak(`Volume set to ${getSpeechVolumeDescription(value)}`);
}, 500);

function handleSpeechRateChange(value) {
  const floatValue = parseFloat(value);
  localSpeechRate.value = floatValue;
  debouncedSpeechRateUpdate(floatValue);
}

function handleSpeechPitchChange(value) {
  const floatValue = parseFloat(value);
  localSpeechPitch.value = floatValue;
  debouncedSpeechPitchUpdate(floatValue);
}

function handleSpeechVolumeChange(value) {
  const floatValue = parseFloat(value);
  localSpeechVolume.value = floatValue;
  debouncedSpeechVolumeUpdate(floatValue);
}

watch(speechRate, (newRate) => {
  localSpeechRate.value = newRate;
});

watch(speechPitch, (newPitch) => {
  localSpeechPitch.value = newPitch;
});

watch(speechVolume, (newVolume) => {
  localSpeechVolume.value = newVolume;
});

function alertVoices() {
  const filteredVoiceNames = new Set(
    filteredVoices.value.map((voice) => voice.name)
  );
  const voiceDetails = voices.value
    .filter((voice) => !filteredVoiceNames.has(voice.name))
    .map(({ name, lang }) => `Name: ${name}, Language: ${lang}`)
    .join("\n");
  alert("Here are more available voices in your browser:\n\n" + voiceDetails);
}
</script>

<template>
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
      Voice Settings
    </h3>
    <div class="flex gap-2">
      <Button v-if="canEditPages" @click="alertVoices">All Voices</Button>
    </div>
  </div>

  <div class="mb-6">
    <div v-if="voicesLoading" class="text-center py-4">
      <p class="text-gray-600 dark:text-gray-400">
        Loading available voices...
      </p>
    </div>
    <div v-else-if="voices.length > 0" class="flex">
      <ul class="w-1/2">
        <li v-for="voice in firstHalf" :key="voice.name" class="mb-3">
          <input
            :id="voice.name"
            v-model="selectedVoice"
            type="radio"
            :value="voice"
            @input="setVoice(voice)"
          />
          <label
            :for="voice.name"
            class="dark:text-white ml-3 font-bold text-lg"
            >{{ voice.name }}</label
          >
        </li>
      </ul>
      <ul class="w-1/2">
        <li v-for="voice in secondHalf" :key="voice.name" class="mb-3">
          <input
            :id="voice.name"
            v-model="selectedVoice"
            type="radio"
            :value="voice"
            @input="setVoice(voice)"
          />
          <label
            :for="voice.name"
            class="dark:text-white ml-3 font-bold text-lg"
            >{{ voice.name }}</label
          >
        </li>
      </ul>
    </div>
    <div v-else>
      <p class="text-red-700 dark:text-red-300">
        Voices from speech synthesis are not available in your browser. Your
        browser's default will be used.
      </p>
    </div>
  </div>

  <div class="space-y-8 mb-8">
    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      <label
        class="block text-lg font-semibold text-gray-900 dark:text-white mb-4"
      >
        Emotional Effects
      </label>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Button
          :class="
            selectedEmotion === 'excited'
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-gray-600 hover:bg-gray-700'
          "
          :disabled="speaking"
          class="flex flex-col items-center justify-center py-1.5 px-1.5 min-h-[45px]"
          @click="setSelectedEmotion('excited')"
        >
          <i class="ri-flashlight-line text-2xl mb-1"></i>
          <span class="text-sm font-medium">Excited</span>
        </Button>
        <Button
          :class="
            selectedEmotion === 'calm'
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-600 hover:bg-gray-700'
          "
          :disabled="speaking"
          class="flex flex-col items-center justify-center py-1.5 px-1.5 min-h-[45px]"
          @click="setSelectedEmotion('calm')"
        >
          <i class="ri-heart-line text-2xl mb-1"></i>
          <span class="text-sm font-medium">Calm</span>
        </Button>
        <Button
          :class="
            selectedEmotion === 'mysterious'
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-gray-600 hover:bg-gray-700'
          "
          :disabled="speaking"
          class="flex flex-col items-center justify-center py-1.5 px-1.5 min-h-[45px]"
          @click="setSelectedEmotion('mysterious')"
        >
          <i class="ri-question-line text-2xl mb-1"></i>
          <span class="text-sm font-medium">Mysterious</span>
        </Button>
        <Button
          :class="
            selectedEmotion === 'hyper'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-gray-600 hover:bg-gray-700'
          "
          :disabled="speaking"
          class="flex flex-col items-center justify-center py-1.5 px-1.5 min-h-[45px]"
          @click="setSelectedEmotion('hyper')"
        >
          <i class="ri-fire-line text-2xl mb-1"></i>
          <span class="text-sm font-medium">Hyper</span>
        </Button>
        <Button
          :class="
            selectedEmotion === ''
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-600 hover:bg-gray-700'
          "
          :disabled="speaking"
          class="flex flex-col items-center justify-center py-1.5 px-1.5 min-h-[45px]"
          @click="setSelectedEmotion('')"
        >
          <i class="ri-check-line text-2xl mb-1"></i>
          <span class="text-sm font-medium">Normal</span>
        </Button>
      </div>
    </div>

    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center justify-between mb-4">
        <label class="text-lg font-semibold text-gray-900 dark:text-white">
          Speech Rate
        </label>
        <span
          class="text-2xl font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600"
        >
          {{ localSpeechRate }}x
        </span>
      </div>
      <div class="space-y-3">
        <div class="flex items-center gap-4">
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
            >Slow</span
          >
          <div class="flex-1 relative">
            <input
              v-model="localSpeechRate"
              type="range"
              :min="SPEECH_RATE_MIN"
              :max="SPEECH_RATE_MAX"
              step="0.1"
              data-slider="rate"
              class="w-full h-3 bg-gradient-to-r from-blue-200 to-blue-400 dark:from-blue-600 dark:to-blue-800 rounded-lg appearance-none cursor-pointer slider-custom relative z-20"
              @input="handleSpeechRateChange($event.target.value)"
            />
            <div class="absolute inset-0 pointer-events-none z-10">
              <div
                class="h-3 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-lg transition-all duration-200"
                :style="{
                  width: `${
                    ((localSpeechRate - SPEECH_RATE_MIN) /
                      (SPEECH_RATE_MAX - SPEECH_RATE_MIN)) *
                    100
                  }%`
                }"
              ></div>
            </div>
          </div>
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
            >Fast</span
          >
        </div>
        <div
          class="flex justify-between text-xs text-gray-500 dark:text-gray-400"
        >
          <span>Very Slow</span>
          <span>Normal</span>
          <span>Very Fast</span>
        </div>
      </div>
    </div>

    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center justify-between mb-4">
        <label class="text-lg font-semibold text-gray-900 dark:text-white">
          Pitch
        </label>
        <span
          class="text-2xl font-bold text-green-600 dark:text-green-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600"
        >
          {{ localSpeechPitch }}
        </span>
      </div>
      <div class="space-y-3">
        <div class="flex items-center gap-4">
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
            >Low</span
          >
          <div class="flex-1 relative">
            <input
              v-model="localSpeechPitch"
              type="range"
              :min="SPEECH_PITCH_MIN"
              :max="SPEECH_PITCH_MAX"
              step="0.1"
              data-slider="pitch"
              class="w-full h-3 bg-gradient-to-r from-green-200 to-green-400 dark:from-green-600 dark:to-green-800 rounded-lg appearance-none cursor-pointer slider-custom relative z-20"
              @input="handleSpeechPitchChange($event.target.value)"
            />
            <div class="absolute inset-0 pointer-events-none z-10">
              <div
                class="h-3 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-lg transition-all duration-200"
                :style="{
                  width: `${
                    ((localSpeechPitch - SPEECH_PITCH_MIN) /
                      (SPEECH_PITCH_MAX - SPEECH_PITCH_MIN)) *
                    100
                  }%`
                }"
              ></div>
            </div>
          </div>
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
            >High</span
          >
        </div>
        <div
          class="flex justify-between text-xs text-gray-500 dark:text-gray-400"
        >
          <span>Very Low</span>
          <span>Normal</span>
          <span>Very High</span>
        </div>
      </div>
    </div>

    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center justify-between mb-4">
        <label class="text-lg font-semibold text-gray-900 dark:text-white">
          Volume
        </label>
        <span
          class="text-2xl font-bold text-purple-600 dark:text-purple-400 bg-white dark:bg-gray-700 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-600"
        >
          {{ Math.round(localSpeechVolume * 100) }}%
        </span>
      </div>
      <div class="space-y-3">
        <div class="flex items-center gap-4">
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
            >10%</span
          >
          <div class="flex-1 relative">
            <input
              v-model="localSpeechVolume"
              type="range"
              :min="SPEECH_VOLUME_MIN"
              :max="SPEECH_VOLUME_MAX"
              step="0.1"
              data-slider="volume"
              class="w-full h-3 bg-gradient-to-r from-purple-200 to-purple-400 dark:from-purple-600 dark:to-purple-800 rounded-lg appearance-none cursor-pointer slider-custom relative z-20"
              @input="handleSpeechVolumeChange($event.target.value)"
            />
            <div class="absolute inset-0 pointer-events-none z-10">
              <div
                class="h-3 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 rounded-lg transition-all duration-200"
                :style="{
                  width: `${
                    ((localSpeechVolume - SPEECH_VOLUME_MIN) /
                      (SPEECH_VOLUME_MAX - SPEECH_VOLUME_MIN)) *
                    100
                  }%`
                }"
              ></div>
            </div>
          </div>
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
            >100%</span
          >
        </div>
        <div
          class="flex justify-between text-xs text-gray-500 dark:text-gray-400"
        >
          <span>Quiet</span>
          <span>Normal</span>
          <span>Maximum</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slider-custom {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  position: relative;
  z-index: 20;
}

.slider-custom::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 24px;
  width: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.slider-custom::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.slider-custom[data-slider="rate"]::-webkit-slider-thumb {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.slider-custom[data-slider="pitch"]::-webkit-slider-thumb {
  background: linear-gradient(135deg, #10b981, #059669);
}

.slider-custom[data-slider="volume"]::-webkit-slider-thumb {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.slider-custom::-moz-range-thumb {
  height: 24px;
  width: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.slider-custom::-moz-range-thumb:hover {
  transform: scale(1.1);
}

.slider-custom[data-slider="rate"]::-moz-range-thumb {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.slider-custom[data-slider="pitch"]::-moz-range-thumb {
  background: linear-gradient(135deg, #10b981, #059669);
}

.slider-custom[data-slider="volume"]::-moz-range-thumb {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.bg-gradient-to-r {
  transition: width 0.2s ease;
}
</style>
