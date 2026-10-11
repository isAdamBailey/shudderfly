<script setup>
import { computed } from "vue";
import { useTranslations } from "@/composables/useTranslations";

// The gold "Toot Food World" arched across the sky, shared by both road
// drawers. Decorative: the page has its own heading.
const { t } = useTranslations();

// Smaller letters for a longer name (a translation), so it fits the arch.
const fontSize = computed(
    () => `${Math.min(40, Math.floor(600 / t("games.world.title").length))}px`
);
</script>

<template>
    <div class="sky-logo" aria-hidden="true">
        <svg
            class="sky-logo-svg"
            viewBox="0 0 400 120"
            preserveAspectRatio="xMidYMid meet"
            :style="{ '--sky-logo-size': fontSize }"
        >
            <defs>
                <path
                    id="skyLogoArc"
                    d="M 24 100 Q 200 4 376 100"
                    fill="none"
                />
                <linearGradient id="skyLogoFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#fff7c2" />
                    <stop offset="0.45" stop-color="#ffd23f" />
                    <stop offset="1" stop-color="#f7931e" />
                </linearGradient>
            </defs>
            <text
                v-for="depth in 6"
                :key="depth"
                class="sky-logo-depth"
                :dx="depth"
                :dy="depth"
            >
                <textPath href="#skyLogoArc" startOffset="50%">
                    {{ t("games.world.title") }}
                </textPath>
            </text>
            <text class="sky-logo-face">
                <textPath href="#skyLogoArc" startOffset="50%">
                    {{ t("games.world.title") }}
                </textPath>
            </text>
        </svg>
    </div>
</template>

<style scoped>
.sky-logo {
    /* Anchored to the top edge and clear of the tallest landmark (translated
       up from the horizon by its own emoji height plus its signpost), so a
       landmark spawning early in the world can never render over the logo.
       The caller adds the centring/peek transform. */
    position: absolute;
    top: 2%;
    left: 50%;
    width: min(60%, 380px);
    pointer-events: none;
    will-change: transform;
}

.sky-logo-svg {
    width: 100%;
    height: auto;
    display: block;
    filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.18));
}

/* Same glyphs stamped repeatedly, each nudged a pixel further down-right and
   darkened — the classic layered-text trick for a solid extruded edge under
   the curve, since SVG has no real 3D text primitive. */
.sky-logo-depth {
    font-family: "Spicy Rice", ui-rounded, system-ui, sans-serif;
    font-weight: 800;
    font-size: var(--sky-logo-size, 40px);
    text-anchor: middle;
    fill: #b5590f;
}

.sky-logo-face {
    font-family: "Spicy Rice", ui-rounded, system-ui, sans-serif;
    font-weight: 800;
    font-size: var(--sky-logo-size, 40px);
    text-anchor: middle;
    fill: url(#skyLogoFill);
    stroke: #7a3b00;
    stroke-width: 3px;
    stroke-linejoin: round;
    paint-order: stroke fill;
}
</style>
