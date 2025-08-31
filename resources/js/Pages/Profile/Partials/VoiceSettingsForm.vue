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

const voicesLoading = ref(true);

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

setTimeout(() => {
  if (voicesLoading.value) {
    voicesLoading.value = false;
  }
}, 3000);

const localSpeechRate = ref(speechRate.value);
const localSpeechPitch = ref(speechPitch.value);
const localSpeechVolume = ref(speechVolume.value);

function speakWithoutEffect(text, currentEffect) {
  selectedEffect.value = "";
  speak(text);
  setTimeout(() => {
    selectedEffect.value = currentEffect;
  }, 100);
}

const debouncedSpeechRateUpdate = debounce((value) => {
  setSpeechRateSilent(value);
  speakWithoutEffect(`Speech rate set to ${value}x`, selectedEffect.value);
}, 500);

const debouncedSpeechPitchUpdate = debounce((value) => {
  setSpeechPitchSilent(value);
  speakWithoutEffect(`Pitch set to ${value}`, selectedEffect.value);
}, 500);

const debouncedSpeechVolumeUpdate = debounce((value) => {
  setSpeechVolumeSilent(value);
  speakWithoutEffect(
    `Volume set to ${Math.round(value * 100)}%`,
    selectedEffect.value
  );
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

watch(selectedEffect, (newEffect) => {
  if (newEffect) {
    const effectName = newEffect.charAt(0).toUpperCase() + newEffect.slice(1);
    speak(`Effect set to ${effectName}`);
  }
});

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
            >0x</span
          >
          <div class="flex-1 relative">
            <input
              v-model="localSpeechRate"
              type="range"
              min="0"
              max="3"
              step="0.1"
              data-slider="rate"
              class="w-full h-3 bg-gradient-to-r from-blue-200 to-blue-400 dark:from-blue-600 dark:to-blue-800 rounded-lg appearance-none cursor-pointer slider-custom relative z-20"
              @input="handleSpeechRateChange($event.target.value)"
            />
            <div class="absolute inset-0 pointer-events-none z-10">
              <div
                class="h-3 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-lg transition-all duration-200"
                :style="{
                  width: `${((localSpeechRate - 0) / (3 - 0)) * 100}%`
                }"
              ></div>
            </div>
          </div>
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
            >3x</span
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
            >0</span
          >
          <div class="flex-1 relative">
            <input
              v-model="localSpeechPitch"
              type="range"
              min="0"
              max="3"
              step="0.1"
              data-slider="pitch"
              class="w-full h-3 bg-gradient-to-r from-green-200 to-green-400 dark:from-green-600 dark:to-green-800 rounded-lg appearance-none cursor-pointer slider-custom relative z-20"
              @input="handleSpeechPitchChange($event.target.value)"
            />
            <div class="absolute inset-0 pointer-events-none z-10">
              <div
                class="h-3 bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-lg transition-all duration-200"
                :style="{
                  width: `${((localSpeechPitch - 0) / (3 - 0)) * 100}%`
                }"
              ></div>
            </div>
          </div>
          <span
            class="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[2rem]"
            >3</span
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
            >0%</span
          >
          <div class="flex-1 relative">
            <input
              v-model="localSpeechVolume"
              type="range"
              min="0"
              max="1"
              step="0.1"
              data-slider="volume"
              class="w-full h-3 bg-gradient-to-r from-purple-200 to-purple-400 dark:from-purple-600 dark:to-purple-800 rounded-lg appearance-none cursor-pointer slider-custom relative z-20"
              @input="handleSpeechVolumeChange($event.target.value)"
            />
            <div class="absolute inset-0 pointer-events-none z-10">
              <div
                class="h-3 bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 rounded-lg transition-all duration-200"
                :style="{ width: `${localSpeechVolume * 100}%` }"
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
          <span>Muted</span>
          <span>Normal</span>
          <span>Maximum</span>
        </div>
      </div>
    </div>

    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      <label
        class="block text-lg font-semibold text-gray-900 dark:text-white mb-4"
      >
        Voice Effects
      </label>
      <div class="space-y-3">
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

    <div
      v-if="speaking || isPaused"
      class="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
    >
      <label
        class="block text-lg font-semibold text-gray-900 dark:text-white mb-4"
      >
        Playback Controls
      </label>
      <div class="flex gap-3">
        <Button
          v-if="!isPaused"
          class="bg-yellow-600 hover:bg-yellow-700"
          @click="pauseSpeech"
        >
          ⏸️ Pause
        </Button>
        <Button
          v-else
          class="bg-green-600 hover:bg-green-700"
          @click="resumeSpeech"
        >
          ▶️ Resume
        </Button>
        <Button class="bg-red-600 hover:bg-red-700" @click="stopSpeech">
          ⏹️ Stop
        </Button>
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
