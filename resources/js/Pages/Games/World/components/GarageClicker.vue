<script setup>
import { onBeforeUnmount, ref } from "vue";
import { useTranslations } from "@/composables/useTranslations";

/**
 * The Garage's clicker (issue #227), on screen the whole time you're in
 * the Garage, whichever wall you face: a big beige wall console like the
 * one on the wall (three/garageButton.js), drawn in detail. Its push bar
 * presses the opener (`press`), and its indicator lamp shows the opener's
 * light (`lit`).
 */
defineProps({
    lit: { type: Boolean, default: false },
});
const emit = defineEmits(["press"]);
const { t } = useTranslations();

// Held in for a moment after a tap, so a quick one still shows.
const pushed = ref(false);
let release = null;
function press() {
    pushed.value = true;
    clearTimeout(release);
    release = setTimeout(() => (pushed.value = false), 180);
    emit("press");
}
onBeforeUnmount(() => clearTimeout(release));
</script>

<template>
    <button
        type="button"
        class="garage-clicker"
        :class="{ pushed, lit }"
        :aria-label="t('games.world.toys.garage_button')"
        :title="t('games.world.toys.garage_button')"
        @click.stop="press"
    >
        <svg viewBox="0 0 124 200" aria-hidden="true">
            <defs>
                <linearGradient id="gc-plate" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#f5eedd" />
                    <stop offset="1" stop-color="#d9cba9" />
                </linearGradient>
                <linearGradient id="gc-bar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#f1e7cf" />
                    <stop offset="1" stop-color="#cdbd98" />
                </linearGradient>
                <radialGradient id="gc-lamp" cx="0.4" cy="0.35" r="0.7">
                    <stop offset="0" stop-color="#fff7d1" />
                    <stop offset="1" class="lamp-edge" />
                </radialGradient>
            </defs>

            <!-- The wire up the wall, into its grommet. -->
            <rect x="57" y="0" width="10" height="14" fill="#d8cbb0" />
            <!-- The housing and its face plate. -->
            <rect
                x="4"
                y="10"
                width="116"
                height="186"
                rx="14"
                fill="#c7b78f"
            />
            <rect
                x="8"
                y="13"
                width="108"
                height="178"
                rx="11"
                fill="url(#gc-plate)"
                stroke="#b9a98a"
            />
            <circle cx="62" cy="21" r="4" fill="#b9a98a" />
            <!-- A screw in each corner. -->
            <g
                v-for="[x, y] in [
                    [18, 23],
                    [106, 23],
                    [18, 181],
                    [106, 181],
                ]"
                :key="`${x}-${y}`"
            >
                <circle :cx="x" :cy="y" r="4.5" fill="#a8a29e" />
                <line
                    :x1="x - 3"
                    :y1="y"
                    :x2="x + 3"
                    :y2="y"
                    stroke="#57534e"
                    stroke-width="1.4"
                />
            </g>

            <!-- The indicator lamp in its chrome bezel. -->
            <circle cx="62" cy="38" r="9" fill="#d6d3d1" />
            <circle class="lamp" cx="62" cy="38" r="6.5" fill="url(#gc-lamp)" />

            <!-- The push bar's recess, and the bar in it. -->
            <rect x="17" y="52" width="90" height="88" rx="8" fill="#a8987a" />
            <g class="bar">
                <rect
                    x="20"
                    y="55"
                    width="84"
                    height="82"
                    rx="7"
                    fill="url(#gc-bar)"
                    stroke="#b9a98a"
                />
                <!-- Ridges for a thumb, top and bottom. -->
                <g stroke="#bfae8c" stroke-width="1.5" stroke-linecap="round">
                    <line x1="32" y1="62" x2="92" y2="62" />
                    <line x1="32" y1="66" x2="92" y2="66" />
                    <line x1="32" y1="126" x2="92" y2="126" />
                    <line x1="32" y1="130" x2="92" y2="130" />
                </g>
                <!-- The garage: a pitched roof over a sectional door. -->
                <path d="M33 92 L56 76 L79 92 Z" fill="#5b4f3c" />
                <rect x="37" y="92" width="38" height="27" fill="#5b4f3c" />
                <g fill="#f1e7cf">
                    <rect x="41" y="96" width="30" height="4" />
                    <rect x="41" y="103" width="30" height="4" />
                    <rect x="41" y="110" width="30" height="4" />
                </g>
                <!-- Up and down. -->
                <path d="M88 83 L94 92 L82 92 Z" fill="#5b4f3c" />
                <path d="M88 118 L94 109 L82 109 Z" fill="#5b4f3c" />
            </g>

            <!-- The light button, a bulb on it, and the lock slide. -->
            <circle
                cx="36"
                cy="164"
                r="13"
                fill="url(#gc-bar)"
                stroke="#b9a98a"
            />
            <circle cx="36" cy="161" r="5" fill="#5b4f3c" />
            <rect x="33" y="166" width="6" height="4" fill="#5b4f3c" />
            <rect x="60" y="159" width="44" height="10" rx="5" fill="#5b4f3c" />
            <rect
                x="62"
                y="155"
                width="16"
                height="18"
                rx="3"
                fill="url(#gc-bar)"
                stroke="#b9a98a"
            />
        </svg>
    </button>
</template>

<style scoped>
/* Bottom left, over the turn buttons, big enough to mash. */
.garage-clicker {
    position: absolute;
    left: calc(0.75rem + env(safe-area-inset-left, 0px));
    bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
    z-index: 10;
    height: min(13rem, 45vh);
    aspect-ratio: 124 / 200;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    filter: drop-shadow(0 4px 8px rgb(0 0 0 / 0.45));
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}

.garage-clicker svg {
    display: block;
    width: 100%;
    height: 100%;
}

.bar {
    transform-origin: 62px 96px;
    transition: transform 80ms ease-out, filter 80ms ease-out;
}

.garage-clicker:active .bar,
.garage-clicker.pushed .bar {
    transform: scale(0.95) translateY(1.5px);
    filter: brightness(0.9);
}

.lamp-edge {
    stop-color: #a16207;
}

.lamp {
    opacity: 0.45;
    transition: opacity 150ms;
}

.garage-clicker.lit .lamp-edge {
    stop-color: #fbbf24;
}

.garage-clicker.lit .lamp {
    opacity: 1;
    filter: drop-shadow(0 0 4px #fde68a);
}

.garage-clicker:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 3px;
    border-radius: 0.75rem;
}

@media (prefers-reduced-motion: reduce) {
    .bar,
    .lamp {
        transition: none;
    }
}
</style>
