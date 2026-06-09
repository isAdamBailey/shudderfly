<script setup>
/* global route */
import CityPicker from "@/Components/WorldClock/CityPicker.vue";
import ClockCustomizer from "@/Components/WorldClock/ClockCustomizer.vue";
import WorldClockGrid from "@/Components/WorldClock/WorldClockGrid.vue";
import { usePermissions } from "@/composables/permissions";
import { useWorldClockPreferences } from "@/composables/useWorldClockPreferences";
import { useWorldClockSync } from "@/composables/useWorldClockSync";
import { reactive } from "vue";

const props = defineProps({
  defaultCities: { type: Array, default: () => [] },
  maxCities: { type: Number, default: 6 },
  timezoneLabels: { type: Object, default: () => ({}) },
  worldClock: { type: Object, default: null }
});

const { canEditPages } = usePermissions();

if (props.worldClock) useWorldClockSync().hydrate(props.worldClock);

const { prefs, addCity, removeCity } = useWorldClockPreferences(props.maxCities);

const labels = reactive({ ...props.timezoneLabels });

const onRelabel = async (timezone, label) => {
  try {
    const response = await window.axios.put(route("world-clock.labels.update"), {
      timezone,
      label
    });
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
    <div class="lg:col-span-1 space-y-6">
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
    <div class="lg:col-span-2">
      <WorldClockGrid
        :cities="prefs.cities"
        :labels="labels"
        :face-preset="prefs.facePreset"
        :hand-preset="prefs.handPreset"
        :numerals="prefs.numerals"
        :second-hand-mode="prefs.secondHandMode"
      />
    </div>
  </div>
</template>
