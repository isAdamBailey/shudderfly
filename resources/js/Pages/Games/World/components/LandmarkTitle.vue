<script setup>
import { computed } from "vue";

// A landmark's name in gold on an arc, shared by both road drawers: the same
// gilded-extrusion look as the sky logo (SVG textPath on an arc, layered depth
// copies, gradient face) rather than a straight line of CSS text — the arc
// bows over the icon's shoulders so a long game name has room to fit without
// truncating. Decorative: the button it sits in carries the name.
const props = defineProps({
    /** Unique per page: it namespaces the SVG ids. */
    id: { type: String, required: true },
    name: { type: String, required: true },
});

// The viewBox widens with name length and the <svg> is left unsized in CSS,
// so it renders at its intrinsic viewBox-to-px size (1 user unit = 1px) —
// every name gets the same font size, and a long one simply produces a wider
// arc that overflows past the icon rather than being squeezed to fit.
const CHAR_WIDTH = 17;
const MIN_WIDTH = 150;
const HEIGHT = 70;

const width = computed(() =>
    Math.max(MIN_WIDTH, Math.round(props.name.length * CHAR_WIDTH + 40))
);
const path = computed(
    () =>
        `M 12 ${HEIGHT - 8} Q ${width.value / 2} 4 ${width.value - 12} ${
            HEIGHT - 8
        }`
);
</script>

<template>
    <div class="landmark-title" aria-hidden="true">
        <svg
            :width="width"
            :height="HEIGHT"
            :viewBox="`0 0 ${width} ${HEIGHT}`"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <path :id="`titleArc-${id}`" :d="path" fill="none" />
                <linearGradient
                    :id="`titleFill-${id}`"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                >
                    <stop offset="0" stop-color="#fff7c2" />
                    <stop offset="0.45" stop-color="#ffd23f" />
                    <stop offset="1" stop-color="#f7931e" />
                </linearGradient>
            </defs>
            <text
                v-for="depth in 4"
                :key="depth"
                class="landmark-title-depth"
                :dx="depth"
                :dy="depth"
            >
                <textPath :href="`#titleArc-${id}`" startOffset="50%">
                    {{ name }}
                </textPath>
            </text>
            <text
                class="landmark-title-face"
                :style="{ fill: `url(#titleFill-${id})` }"
            >
                <textPath :href="`#titleArc-${id}`" startOffset="50%">
                    {{ name }}
                </textPath>
            </text>
        </svg>
    </div>
</template>

<style scoped>
/* Positioned absolutely and centred so it can freely overflow past the
   icon's own width on either side instead of being confined (and shrunk) to
   it; the caller's positioned box is what this is placed against. */
.landmark-title {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: -0.5rem;
    pointer-events: none;
}

/* No width/height here: left at its intrinsic size, the <svg> renders its
   viewBox 1 user unit = 1px, so every title gets the same font size — a
   longer name widens the arc instead of shrinking to fit a fixed box. */
.landmark-title svg {
    display: block;
    overflow: visible;
}

.landmark-title-depth {
    font-family: "Spicy Rice", ui-rounded, system-ui, sans-serif;
    font-size: 28px;
    text-anchor: middle;
    fill: #b5590f;
}

.landmark-title-face {
    font-family: "Spicy Rice", ui-rounded, system-ui, sans-serif;
    font-size: 28px;
    text-anchor: middle;
    stroke: #7a3b00;
    stroke-width: 2px;
    stroke-linejoin: round;
    paint-order: stroke fill;
}
</style>
