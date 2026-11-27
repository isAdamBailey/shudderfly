<script setup>
import { computed } from "vue";
import { findFood } from "../composables/foods.js";

// One food drawn inside an SVG, `size` units across, centred on (x, y).
// FoodIcon.vue wraps it in an <svg> of its own for HTML.
const props = defineProps({
    food: { type: String, required: true },
    size: { type: Number, default: 100 },
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
});

const item = computed(() => findFood(props.food));
</script>

<template>
    <g class="food-glyph" aria-hidden="true">
        <text
            v-if="item.emoji"
            :x="x"
            :y="y"
            :font-size="size * 0.85"
            text-anchor="middle"
            dominant-baseline="central"
        >
            {{ item.emoji }}
        </text>
        <g
            v-else
            :transform="`translate(${x - size / 2} ${y - size / 2}) scale(${
                size / 100
            })`"
        >
            <component :is="item.glyph" />
        </g>
    </g>
</template>
