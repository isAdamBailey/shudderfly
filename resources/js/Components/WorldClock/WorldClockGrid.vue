<script setup>
import ClockCard from "@/Components/WorldClock/ClockCard.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";

const { speak } = useSpeechSynthesis();

defineProps({
  cities: { type: Array, default: () => [] },
  facePreset: { type: String, default: "classic" },
  handPreset: { type: String, default: "classic" },
  numerals: { type: String, default: "arabic" },
  secondHandMode: { type: String, default: "smooth" }
});
</script>

<template>
  <div
    v-if="cities.length"
    class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
  >
    <ClockCard
      v-for="city in cities"
      :key="`${city.timezone}-${city.name}`"
      :city="city"
      :face-preset="facePreset"
      :hand-preset="handPreset"
      :numerals="numerals"
      :second-hand-mode="secondHandMode"
      @speak="speak"
    />
  </div>
  <p v-else class="text-center text-gray-400">
    Add a city to see its clock.
  </p>
</template>
