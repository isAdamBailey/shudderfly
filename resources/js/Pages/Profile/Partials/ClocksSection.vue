<script setup>
/* global route */
import CityPicker from "@/Components/WorldClock/CityPicker.vue";
import ClockCustomizer from "@/Components/WorldClock/ClockCustomizer.vue";
import WorldClockGrid from "@/Components/WorldClock/WorldClockGrid.vue";
import { usePermissions } from "@/composables/permissions";
import { useWorldClockPreferences } from "@/composables/useWorldClockPreferences";
import { useWorldClockSync } from "@/composables/useWorldClockSync";
import { computed, reactive } from "vue";

const props = defineProps({
    defaultCities: { type: Array, default: () => [] },
    maxCities: { type: Number, default: 6 },
    timezoneLabels: { type: Object, default: () => ({}) },
    worldClock: { type: Object, default: null },
});

const { canEditPages } = usePermissions();

if (props.worldClock) useWorldClockSync().hydrate(props.worldClock);

const { prefs, addCity, removeCity } = useWorldClockPreferences(
    props.maxCities
);

const labels = reactive({ ...props.timezoneLabels });

const gridProps = computed(() => ({
    cities: prefs.cities,
    labels,
    facePreset: prefs.facePreset,
    handPreset: prefs.handPreset,
    numerals: prefs.numerals,
    secondHandMode: prefs.secondHandMode,
}));

const onRelabel = async (timezone, label) => {
    try {
        const response = await window.axios.put(
            route("world-clock.labels.update"),
            {
                timezone,
                label,
            }
        );
        if (response.data.label) {
            labels[timezone] = response.data.label;
        } else {
            delete labels[timezone];
        }
    } catch {
        // leave label state untouched on failure
    }
};
</script>

<template>
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Mobile: a sticky, horizontally-scrolling clock strip so edits stay
             visible while the page keeps scrolling vertically underneath it. -->
        <div
            class="sticky top-0 z-10 -mx-6 -mt-6 bg-white px-6 pb-3 pt-6 dark:bg-gray-800 lg:hidden"
        >
            <WorldClockGrid compact v-bind="gridProps" />
        </div>
        <!-- Desktop: the full, non-sticky grid alongside the settings. -->
        <div class="hidden lg:order-2 lg:col-span-2 lg:block">
            <WorldClockGrid v-bind="gridProps" />
        </div>
        <div class="lg:order-1 lg:col-span-1 space-y-6">
            <ClockCustomizer
                v-model:face-preset="prefs.facePreset"
                v-model:hand-preset="prefs.handPreset"
                v-model:numerals="prefs.numerals"
                v-model:second-hand-mode="prefs.secondHandMode"
            />
            <CityPicker
                :selected-cities="prefs.cities"
                :max-cities="maxCities"
                :labels="labels"
                :can-relabel="canEditPages"
                @add="addCity"
                @remove="removeCity"
                @relabel="onRelabel"
            />
        </div>
    </div>
</template>
