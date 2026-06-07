<script setup>
import Accordion from "@/Components/Accordion.vue";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import CityPicker from "@/Components/WorldClock/CityPicker.vue";
import ClockCustomizer from "@/Components/WorldClock/ClockCustomizer.vue";
import WorldClockGrid from "@/Components/WorldClock/WorldClockGrid.vue";
import { useWorldClockPreferences } from "@/composables/useWorldClockPreferences";
import { useWorldClockSync } from "@/composables/useWorldClockSync";
import { Head } from "@inertiajs/vue3";

const props = defineProps({
  defaultCities: { type: Array, default: () => [] },
  maxCities: { type: Number, default: 6 },
  worldClock: { type: Object, default: null }
});

// Seed the shared state from this page's server props before reading it.
if (props.worldClock) useWorldClockSync().hydrate(props.worldClock);

const { prefs, addCity, removeCity } = useWorldClockPreferences(props.maxCities);

// Settings start expanded on desktop and collapsed on mobile, so phones lead
// with the clocks themselves.
const settingsOpen =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(min-width: 1024px)").matches
    : true;
</script>

<template>
  <Head title="World Clock" />

  <AuthenticatedLayout>
    <template #header>
      <h2 class="font-heading text-2xl text-theme-title leading-tight">
        World Clock
      </h2>
    </template>

    <div class="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="lg:col-span-1">
          <Accordion
            title="Clock settings"
            :default-open="settingsOpen"
            dark-background
            compact
            class="rounded-lg"
          >
            <div class="space-y-6">
              <ClockCustomizer
                v-model:face-preset="prefs.facePreset"
                v-model:hand-preset="prefs.handPreset"
                v-model:numerals="prefs.numerals"
                v-model:second-hand-mode="prefs.secondHandMode"
              />
              <CityPicker
                :selected-cities="prefs.cities"
                :max-cities="maxCities"
                @add="addCity"
                @remove="removeCity"
              />
            </div>
          </Accordion>
        </div>

        <div class="lg:col-span-2">
          <WorldClockGrid
            :cities="prefs.cities"
            :face-preset="prefs.facePreset"
            :hand-preset="prefs.handPreset"
            :numerals="prefs.numerals"
            :second-hand-mode="prefs.secondHandMode"
          />
        </div>
      </div>
    </div>
  </AuthenticatedLayout>
</template>
