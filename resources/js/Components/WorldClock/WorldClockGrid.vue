<script setup>
import ClockCard from "@/Components/WorldClock/ClockCard.vue";
import LogoOption from "@/Components/WorldClock/LogoOption.vue";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { computed } from "vue";

const { speak } = useSpeechSynthesis();

const props = defineProps({
    cities: { type: Array, default: () => [] },
    labels: { type: Object, default: () => ({}) },
    facePreset: { type: String, default: "classic" },
    handPreset: { type: String, default: "classic" },
    numerals: { type: String, default: "arabic" },
    secondHandMode: { type: String, default: "smooth" },
    // Compact renders a single horizontally-scrolling row of small clocks
    // instead of a wrapping grid — used for the sticky mobile preview so
    // the page can still scroll vertically underneath it.
    compact: { type: Boolean, default: false },
});

const size = computed(() => (props.compact ? 110 : 220));
</script>

<template>
    <div
        :class="
            compact
                ? 'flex flex-nowrap items-start gap-4 overflow-x-auto overscroll-x-contain pb-1'
                : 'grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3'
        "
    >
        <div :class="compact ? 'shrink-0' : ''">
            <LogoOption :size="size" />
        </div>
        <div
            v-for="city in cities"
            :key="`${city.timezone}-${city.name}`"
            :class="compact ? 'shrink-0' : ''"
        >
            <ClockCard
                :city="city"
                :label="labels[city.timezone] ?? null"
                :size="size"
                :face-preset="facePreset"
                :hand-preset="handPreset"
                :numerals="numerals"
                :second-hand-mode="secondHandMode"
                @speak="speak"
            />
        </div>
    </div>
    <p
        v-if="!cities.length"
        class="mt-4 text-center text-gray-600 dark:text-gray-400"
    >
        Add a city to see its clock.
    </p>
</template>
