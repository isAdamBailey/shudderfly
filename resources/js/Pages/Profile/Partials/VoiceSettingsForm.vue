<script setup>
import Button from "@/Components/Button.vue";
import { usePermissions } from "@/composables/permissions";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { debounce } from "lodash";
import { computed, ref, watch } from "vue";

const {
  voices,
  selectedVoice,
  setVoice,
  speechRate,
  speechPitch,
  speechVolume,
  selectedEffect,
  setSpeechRate,
  setSpeechPitch,
  setSpeechVolume,
  setSpeechRateSilent,
  setSpeechPitchSilent,
  setSpeechVolumeSilent,
  setSelectedEffect,
  pauseSpeech,
  resumeSpeech,
  stopSpeech,
  isPaused,
  speaking,
  speak
} = useSpeechSynthesis();
const { canEditPages } = usePermissions();

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

// Local slider values that are separate from the speech synthesis values
const localSpeechRate = ref(speechRate.value);
const localSpeechPitch = ref(speechPitch.value);
const localSpeechVolume = ref(speechVolume.value);

// Debounced functions for slider inputs using lodash
const debouncedSpeechRateUpdate = debounce((value) => {
  setSpeechRateSilent(value);
  speak(`Speech rate set to ${value}x`);
}, 500);

const debouncedSpeechPitchUpdate = debounce((value) => {
  setSpeechPitchSilent(value);
  speak(`Pitch set to ${value}`);
}, 500);

const debouncedSpeechVolumeUpdate = debounce((value) => {
  setSpeechVolumeSilent(value);
  speak(`Volume set to ${Math.round(value * 100)}%`);
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

// Watch for changes in selectedEffect and speak the effect name
watch(selectedEffect, (newEffect) => {
  if (newEffect) {
    // Speak the effect name with the current voice settings
    const effectName = newEffect.charAt(0).toUpperCase() + newEffect.slice(1);
    speak(`Effect set to ${effectName}`);
  }
});

// Sync local values with speech synthesis values
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

function resetToDefaults() {
  setSpeechRate(1);
  setSpeechPitch(1);
  setSpeechVolume(1);

  setSelectedEffect("");

  if (voices.value.length > 0) {
    setVoice(voices.value[0]);
  }
}
</script>

<template>
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
      Voice Settings
    </h3>
    <div class="flex gap-2">
      <Button v-if="canEditPages" @click="alertVoices">All Voices</Button>
      <Button @click="resetToDefaults">Reset</Button>
    </div>
  </div>

  <div class="mb-6">
    <div v-if="voices.length" class="flex">
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

  <!-- Speech Controls -->
  <div class="space-y-6 mb-8">
    <!-- Speech Rate Control -->
    <div>
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Speech Rate: {{ localSpeechRate }}x
      </label>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-500">0.5x</span>
        <input
          v-model="localSpeechRate"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          @input="handleSpeechRateChange($event.target.value)"
        />
        <span class="text-xs text-gray-500">2x</span>
      </div>
    </div>

    <!-- Pitch Control -->
    <div>
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Pitch: {{ localSpeechPitch }}
      </label>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-500">0.5</span>
        <input
          v-model="localSpeechPitch"
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          @input="handleSpeechPitchChange($event.target.value)"
        />
        <span class="text-xs text-gray-500">1.5</span>
      </div>
    </div>

    <!-- Volume Control -->
    <div>
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Volume: {{ Math.round(localSpeechVolume * 100) }}%
      </label>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-500">0%</span>
        <input
          v-model="localSpeechVolume"
          type="range"
          min="0"
          max="1"
          step="0.1"
          class="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          @input="handleSpeechVolumeChange($event.target.value)"
        />
        <span class="text-xs text-gray-500">100%</span>
      </div>
    </div>

    <!-- Voice Effects -->
    <div>
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
      >
        Voice Effects
      </label>
      <div class="space-y-2">
        <label class="flex items-center">
          <input
            v-model="selectedEffect"
            type="radio"
            value=""
            class="mr-3"
            @change="setSelectedEffect('')"
          />
          <span class="text-gray-700 dark:text-gray-300">No Effect</span>
        </label>
        <label class="flex items-center">
          <input
            v-model="selectedEffect"
            type="radio"
            value="echo"
            class="mr-3"
            @change="setSelectedEffect('echo')"
          />
          <span class="text-gray-700 dark:text-gray-300">Echo</span>
        </label>
        <label class="flex items-center">
          <input
            v-model="selectedEffect"
            type="radio"
            value="robot"
            class="mr-3"
            @change="setSelectedEffect('robot')"
          />
          <span class="text-gray-700 dark:text-gray-300">Robot</span>
        </label>
        <label class="flex items-center">
          <input
            v-model="selectedEffect"
            type="radio"
            value="whisper"
            class="mr-3"
            @change="setSelectedEffect('whisper')"
          />
          <span class="text-gray-700 dark:text-gray-300">Whisper</span>
        </label>
      </div>
    </div>

    <!-- Playback Controls -->
    <div v-if="speaking || isPaused">
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Playback Controls
      </label>
      <div class="flex gap-2">
        <Button v-if="!isPaused" @click="pauseSpeech"> ⏸️ Pause </Button>
        <Button v-else @click="resumeSpeech"> ▶️ Resume </Button>
        <Button @click="stopSpeech"> ⏹️ Stop </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom range slider styles */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-track {
  background: #e5e7eb;
  height: 8px;
  border-radius: 4px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  background: #3b82f6;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

input[type="range"]::-webkit-slider-thumb:hover {
  background: #2563eb;
  transform: scale(1.1);
}

/* Dark mode support */
.dark input[type="range"]::-webkit-slider-track {
  background: #374151;
}

.dark input[type="range"]::-webkit-slider-thumb {
  background: #60a5fa;
  border-color: #1f2937;
}

.dark input[type="range"]::-webkit-slider-thumb:hover {
  background: #3b82f6;
}

/* Firefox support */
input[type="range"]::-moz-range-track {
  background: #e5e7eb;
  height: 8px;
  border-radius: 4px;
  border: none;
}

input[type="range"]::-moz-range-thumb {
  background: #3b82f6;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dark input[type="range"]::-moz-range-track {
  background: #374151;
}

.dark input[type="range"]::-moz-range-thumb {
  background: #60a5fa;
  border-color: #1f2937;
}
</style>
