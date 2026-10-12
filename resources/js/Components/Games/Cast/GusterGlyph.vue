<script>
import { GUSTER_GLOSS, GUSTER_SVG } from "./gusterDraw.js";

let glyphs = 0;
</script>

<script setup>
import { computed } from "vue";

// Guster drawn inline, one em tall, where text would put an emoji: a game
// piece, a card, a particle. Decorative. CastMember draws him with this
// too, and plays his moves around it.
const props = defineProps({
    /** Inside another SVG: his height in its units, centred on (x, y). */
    size: { type: Number, default: null },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
});

// Inline he is sized in em by his stylesheet; nested, by attributes.
const box = computed(() =>
    props.size === null
        ? { class: "guster-inline", style: { width: `${GUSTER_SVG.aspect}em` } }
        : {
              x: props.x - (props.size * GUSTER_SVG.aspect) / 2,
              y: props.y - props.size / 2,
              width: props.size * GUSTER_SVG.aspect,
              height: props.size,
          }
);

// His gloss gradients need ids of their own on the page.
const id = `guster-${++glyphs}`;
</script>

<template>
    <svg
        class="guster-glyph"
        v-bind="box"
        :viewBox="GUSTER_SVG.viewBox"
        aria-hidden="true"
    >
        <defs>
            <radialGradient
                v-for="{ suffix, transform } in GUSTER_SVG.glosses"
                :id="`${id}${suffix}`"
                :key="suffix"
                gradientUnits="userSpaceOnUse"
                :cx="GUSTER_SVG.gloss.cx"
                :cy="GUSTER_SVG.gloss.cy"
                :r="GUSTER_SVG.gloss.r"
                :gradientTransform="transform"
            >
                <stop
                    v-for="[offset, color] in GUSTER_GLOSS.stops"
                    :key="offset"
                    :offset="offset"
                    :stop-color="color"
                />
            </radialGradient>
        </defs>
        <g :transform="GUSTER_SVG.flip">
            <ellipse
                v-for="(e, index) in GUSTER_SVG.ellipses"
                :key="index"
                :cx="e.cx"
                :cy="e.cy"
                :rx="e.rx"
                :ry="e.ry"
                :transform="e.transform"
                :opacity="e.opacity"
                :fill="e.gloss === null ? e.color : `url(#${id}${e.gloss})`"
            />
        </g>
    </svg>
</template>

<style scoped>
.guster-glyph {
    overflow: visible;
}

.guster-inline {
    display: inline-block;
    height: 1em;
    vertical-align: -0.1em;
}
</style>
