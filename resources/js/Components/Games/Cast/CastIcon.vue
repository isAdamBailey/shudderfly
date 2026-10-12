<script>
import { own } from "@/utils/object";
import GusterGlyph from "./GusterGlyph.vue";

// An icon that is an emoji, or a cast figure drawn in its place (a game's
// title, a rising particle): `figure` names one of FIGURES, else `emoji`
// is printed. Decorative.
const FIGURES = { guster: GusterGlyph };
</script>

<script setup>
defineProps({
    emoji: { type: String, default: null },
    figure: {
        type: String,
        default: null,
        validator: (figure) => figure === null || !!own(FIGURES, figure),
    },
});
</script>

<template>
    <component :is="FIGURES[figure]" v-if="figure" />
    <span v-else aria-hidden="true">{{ emoji }}</span>
</template>
