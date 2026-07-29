<script setup>
import { computed } from "vue";

const props = defineProps({
    origin: { type: Object, required: true }, // { x, y }
    aimVector: { type: Object, required: true }, // { dx, dy, dist, power, valid }
    visible: { type: Boolean, default: false },
});

const DOT_COUNT = 6;
const DOT_SPACING = 26;

const dots = computed(() => {
    if (!props.visible || !props.aimVector.valid) return [];
    const { dx, dy, dist, power } = props.aimVector;
    const ux = dx / dist;
    const uy = dy / dist;
    const reach = 2 + Math.round(power * (DOT_COUNT - 2));
    return Array.from({ length: reach }, (_, i) => {
        const d = (i + 1) * DOT_SPACING;
        return {
            x: props.origin.x + ux * d,
            y: props.origin.y + uy * d,
            scale: 1 - (i / DOT_COUNT) * 0.5,
        };
    });
});
</script>

<template>
    <div v-if="dots.length" class="aim-guide" aria-hidden="true">
        <span
            v-for="(dot, i) in dots"
            :key="i"
            class="aim-dot"
            :style="{
                left: `${dot.x}px`,
                top: `${dot.y}px`,
                transform: `translate(-50%, -50%) scale(${dot.scale})`,
            }"
        ></span>
    </div>
</template>

<style scoped>
.aim-guide {
    position: absolute;
    inset: 0;
    z-index: 12;
    pointer-events: none;
}

.aim-dot {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.75);
    box-shadow: 0 0 6px rgba(255, 255, 255, 0.5);
}
</style>
