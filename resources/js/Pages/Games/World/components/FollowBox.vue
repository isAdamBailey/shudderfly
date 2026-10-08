<script setup>
import { computed } from "vue";
import { boxStyle } from "./overlay.js";

// A hit box over something the canvas moves every frame (the Butt walking a
// room). It reads where that is itself, through `at`, so only this box
// re-renders as it moves, not the overlay around it. Attributes (class,
// role, label, listeners) land on its element.
const props = defineProps({
    /** () => { x, y, size } in stage px (feet at x, y), or null. */
    at: { type: Function, required: true },
});

const style = computed(() => {
    const spot = props.at();
    return spot ? boxStyle(spot) : { display: "none" };
});
</script>

<template>
    <div :style="style"></div>
</template>
