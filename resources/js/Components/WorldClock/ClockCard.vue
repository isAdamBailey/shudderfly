<script setup>
import AnalogClock from "@/Components/WorldClock/AnalogClock.vue";
import SpeakButton from "@/Components/SpeakButton.vue";
import { useClockTime } from "@/composables/useClockTime";
import { useLogoPreference } from "@/composables/useLogoPreference";
import { useTranslations } from "@/composables/useTranslations";
import { computed } from "vue";

const props = defineProps({
  city: { type: Object, required: true },
  label: { type: String, default: null },
  size: { type: Number, default: 220 },
  facePreset: { type: String, default: "classic" },
  handPreset: { type: String, default: "classic" },
  numerals: { type: String, default: "arabic" },
  secondHandMode: { type: String, default: "smooth" }
});

const emit = defineEmits(["speak"]);

const { logo, setLogoClock } = useLogoPreference();
const { t } = useTranslations();

const isLogo = computed(
  () =>
    logo.enabled &&
    logo.timezone === props.city.timezone &&
    logo.cityName === props.city.name
);

const setAsLogo = () => {
  setLogoClock({
    cityName: props.city.name,
    timezone: props.city.timezone
  });
  emit("speak", t("world_clock.clock_set_as_logo", { city: displayName.value }));
};

const { hour24, minutes } = useClockTime(computed(() => props.city.timezone));

// 12-hour clock time, e.g. "3:05 PM".
const clockTime = computed(() => {
  const period = hour24.value < 12 ? "AM" : "PM";
  let h12 = hour24.value % 12;
  if (h12 === 0) h12 = 12;
  const m = String(minutes.value).padStart(2, "0");
  return `${h12}:${m} ${period}`;
});

const digital = computed(() => clockTime.value);

// A shared, DB-backed custom label for this timezone, shown only on this
// page — the pinned "logo" clock always shows the real city name.
const displayName = computed(() => props.label || props.city.name);

// City + local time spoken in 12-hour format, e.g. "Tokyo, 3:05 PM".
const spokenTime = computed(() => `${displayName.value}, ${clockTime.value}`);
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <AnalogClock
      :timezone="city.timezone"
      :city-name="displayName"
      :size="size"
      :face-preset="facePreset"
      :hand-preset="handPreset"
      :numerals="numerals"
      :second-hand-mode="secondHandMode"
    />
    <div class="text-center">
      <div class="font-heading text-lg text-gray-900 dark:text-gray-100">
        {{ displayName }}
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-400">{{ digital }}</div>
    </div>
    <div class="flex items-center gap-2">
      <SpeakButton
        :aria-label="`Say the time in ${displayName}`"
        @click="emit('speak', spokenTime)"
      />
      <button
        type="button"
        class="btn-bulge inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border p-2.5 shadow-sm transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        :class="
          isLogo
            ? 'border-theme-button-active bg-theme-button-active text-theme-button-active'
            : 'border-theme-primary bg-theme-primary text-theme-button hover:bg-theme-button hover:text-theme-button-hover'
        "
        :aria-pressed="isLogo"
        :aria-label="`Use the ${displayName} clock as the app logo`"
        :title="`Use the ${displayName} clock as the app logo`"
        @click="setAsLogo"
      >
        <i
          :class="isLogo ? 'ri-pushpin-fill' : 'ri-pushpin-line'"
          class="text-xl"
          aria-hidden="true"
        ></i>
      </button>
    </div>
  </div>
</template>
