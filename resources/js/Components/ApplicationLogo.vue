<template>
    <AnalogClock
        v-if="logo.enabled && logo.timezone"
        :timezone="logo.timezone"
        :city-name="logo.cityName"
        size="100%"
        :face-preset="state.facePreset"
        :hand-preset="state.handPreset"
        :numerals="state.numerals"
        :show-seconds="true"
        second-hand-mode="tick"
    />
    <ThemeLogoIcon v-else />
</template>

<script setup>
import AnalogClock from "@/Components/WorldClock/AnalogClock.vue";
import ThemeLogoIcon from "@/Components/ThemeLogoIcon.vue";
import { useLogoPreference } from "@/composables/useLogoPreference";
import { useWorldClockSync } from "@/composables/useWorldClockSync";

const { logo } = useLogoPreference();
// The logo clock uses the shared global appearance so it matches the other
// clocks; the logo itself only records which city is pinned.
const { state } = useWorldClockSync();
</script>
