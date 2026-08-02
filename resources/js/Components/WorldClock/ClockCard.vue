<script setup>
import AnalogClock from "@/Components/WorldClock/AnalogClock.vue";
import SelectableClockTile from "@/Components/WorldClock/SelectableClockTile.vue";
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
    secondHandMode: { type: String, default: "smooth" },
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
        timezone: props.city.timezone,
    });
    emit(
        "speak",
        t("world_clock.clock_set_as_logo", {
            city: displayName.value,
            time: clockTime.value,
        })
    );
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

// A shared, DB-backed custom label for this timezone, shown only on this
// page — the pinned "logo" clock always shows the real city name.
const displayName = computed(() => props.label || props.city.name);

// City + local time spoken in 12-hour format, e.g. "Tokyo, 3:05 PM".
const spokenTime = computed(() => `${displayName.value}, ${clockTime.value}`);
</script>

<template>
    <SelectableClockTile
        :active="isLogo"
        :size="size"
        :label="displayName"
        :aria-label="
            isLogo
                ? `${displayName} is the app logo clock`
                : `Use the ${displayName} clock as the app logo`
        "
        :title="`Use the ${displayName} clock as the app logo`"
        @select="setAsLogo"
    >
        <AnalogClock
            :timezone="city.timezone"
            :city-name="displayName"
            :size="size"
            :face-preset="facePreset"
            :hand-preset="handPreset"
            :numerals="numerals"
            :second-hand-mode="secondHandMode"
        />
        <template #details>
            <div class="flex items-center justify-center gap-1.5">
                <span class="text-sm text-gray-600 dark:text-gray-400">
                    {{ clockTime }}
                </span>
                <SpeakButton
                    :aria-label="`Say the time in ${displayName}`"
                    @click="emit('speak', spokenTime)"
                />
            </div>
        </template>
    </SelectableClockTile>
</template>
