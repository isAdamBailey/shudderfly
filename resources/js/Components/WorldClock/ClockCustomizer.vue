<script setup>
import SecondaryButton from "@/Components/SecondaryButton.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import { useGlobalTimer } from "@/composables/useGlobalTimer";
import { useLogoPreference } from "@/composables/useLogoPreference";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { FACE_OPTIONS } from "@/world-clock/presets/faces";
import { HAND_OPTIONS } from "@/world-clock/presets/hands";
import { computed } from "vue";

const props = defineProps({
  facePreset: { type: String, required: true },
  handPreset: { type: String, required: true },
  numerals: { type: String, required: true },
  secondHandMode: { type: String, required: true }
});

const emit = defineEmits([
  "update:facePreset",
  "update:handPreset",
  "update:numerals",
  "update:secondHandMode"
]);

const { speak } = useSpeechSynthesis();
const { logo, clearLogoClock } = useLogoPreference();
const {
  active: timerActive,
  remainingSeconds,
  start: startTimer,
  stop: stopTimer
} = useGlobalTimer();

const TIMER_OPTIONS = [15, 30, 45, 60];

const startTimerMinutes = (minutes) => {
  startTimer(minutes * 60);
  speak(`${minutes} minute timer started`);
};

const cancelTimer = () => {
  stopTimer();
  speak("Timer stopped");
};

const timerLabel = computed(() => {
  const total = remainingSeconds.value;
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
});

const spokenRemaining = computed(() => {
  const total = remainingSeconds.value;
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  const parts = [];
  if (mm > 0) parts.push(`${mm} minute${mm === 1 ? "" : "s"}`);
  if (ss > 0) parts.push(`${ss} second${ss === 1 ? "" : "s"}`);
  if (parts.length === 0) parts.push("0 seconds");
  return `${parts.join(" and ")} left`;
});

const NUMERAL_OPTIONS = [
  { value: "arabic", label: "Arabic", speech: "Arabic numbers" },
  { value: "roman", label: "Roman", speech: "Roman numerals" },
  { value: "none", label: "None", speech: "No numbers" }
];

const SECOND_OPTIONS = [
  { value: "smooth", label: "Smooth", speech: "Smooth second hand" },
  { value: "tick", label: "Tick", speech: "Ticking second hand" }
];

// Each settings group renders as a row of large, tap-friendly buttons.
const groups = computed(() => [
  {
    key: "facePreset",
    title: "Clock face",
    value: props.facePreset,
    options: FACE_OPTIONS.map((o) => ({ ...o, speech: `${o.label} face` }))
  },
  {
    key: "handPreset",
    title: "Hands",
    value: props.handPreset,
    options: HAND_OPTIONS.map((o) => ({ ...o, speech: `${o.label} hands` }))
  },
  {
    key: "numerals",
    title: "Numbers",
    value: props.numerals,
    options: NUMERAL_OPTIONS
  },
  {
    key: "secondHandMode",
    title: "Second hand",
    value: props.secondHandMode,
    options: SECOND_OPTIONS
  }
]);

const pick = (group, option) => {
  emit(`update:${group.key}`, option.value);
  speak(option.speech || option.label);
};

const resetLogo = () => {
  clearLogoClock();
  speak("Default logo restored");
};
</script>

<template>
  <div class="space-y-5 rounded-lg bg-gray-800 p-4">
    <h3 class="font-heading text-lg text-gray-100">Customize</h3>

    <div v-for="group in groups" :key="group.key">
      <span class="text-sm text-gray-300">{{ group.title }}</span>
      <div class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="option in group.options"
          :key="`${group.key}-${option.value}`"
          type="button"
          class="btn-bulge min-h-12 rounded-lg px-4 py-3 text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          :class="
            group.value === option.value
              ? 'bg-theme-button-active text-theme-button-active'
              : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
          "
          :aria-pressed="group.value === option.value"
          @click="pick(group, option)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="border-t border-gray-700 pt-4">
      <span class="text-sm text-gray-300">Timer</span>
      <p class="mt-1 text-xs text-gray-500">
        A red countdown fills every clock and counts down on the face.
      </p>
      <div v-if="timerActive" class="mt-2 flex items-center gap-2">
        <span
          class="font-heading text-xl tabular-nums text-red-400"
          aria-live="polite"
        >
          {{ timerLabel }}
        </span>
        <SpeakButton
          aria-label="Say how much time is left"
          @click="speak(spokenRemaining)"
        />
        <SecondaryButton @click="cancelTimer">Stop</SecondaryButton>
      </div>
      <div v-else class="mt-2 flex flex-wrap gap-2">
        <button
          v-for="minutes in TIMER_OPTIONS"
          :key="`timer-${minutes}`"
          type="button"
          class="btn-bulge min-h-12 rounded-lg bg-gray-700 px-4 py-3 text-base font-semibold text-gray-100 transition-colors hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          :aria-label="`Start a ${minutes} minute timer`"
          @click="startTimerMinutes(minutes)"
        >
          {{ minutes }} min
        </button>
      </div>
    </div>

    <div class="border-t border-gray-700 pt-4">
      <span class="text-sm text-gray-300">App logo</span>
      <p v-if="logo.enabled" class="mt-1 text-xs text-gray-400">
        Logo: {{ logo.cityName || "Custom clock" }}. Use the pin button on a
        clock to change it.
      </p>
      <p v-else class="mt-1 text-xs text-gray-500">
        Use the pin button on a clock to set it as the app logo.
      </p>

      <SecondaryButton v-if="logo.enabled" class="mt-3" @click="resetLogo">
        Reset to default logo
      </SecondaryButton>
    </div>
  </div>
</template>
