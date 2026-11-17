<script setup>
import { ref } from "vue";

/**
 * The Garage's classic clicker (issue #227): a big beige wall console
 * like the one on the wall (three/garageButton.js), drawn in detail. Its
 * push bar presses the opener, and its
 * indicator lamp shows the opener's light (`lit`).
 *
 * Its light button and lock slide are for show: a tap on the light
 * button lights the bulb on it (or puts it out), and a tap on the lock
 * slide slides it across to lock, showing red, and back. Neither does
 * anything else, and neither presses the opener (GarageClicker.vue skips
 * an `.extra`).
 *
 * Only its picture: GarageClicker.vue is the button, and pushes in its
 * `.bar`.
 */
defineProps({
    lit: { type: Boolean, default: false },
});

const bulbOn = ref(false);
const locked = ref(false);
</script>

<template>
    <svg viewBox="0 0 124 200" aria-hidden="true">
        <defs>
            <linearGradient id="gcw-plate" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#f5eedd" />
                <stop offset="1" stop-color="#d9cba9" />
            </linearGradient>
            <linearGradient id="gcw-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#f1e7cf" />
                <stop offset="1" stop-color="#cdbd98" />
            </linearGradient>
            <radialGradient id="gcw-lamp" cx="0.4" cy="0.35" r="0.7">
                <stop offset="0" stop-color="#fff7d1" />
                <stop offset="1" class="lamp-edge" :class="{ on: lit }" />
            </radialGradient>
        </defs>

        <!-- The wire up the wall, into its grommet. -->
        <rect x="57" y="0" width="10" height="14" fill="#d8cbb0" />
        <!-- The housing and its face plate. -->
        <rect x="4" y="10" width="116" height="186" rx="14" fill="#c7b78f" />
        <rect
            x="8"
            y="13"
            width="108"
            height="178"
            rx="11"
            fill="url(#gcw-plate)"
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
        <circle
            class="lamp"
            :class="{ on: lit }"
            cx="62"
            cy="38"
            r="6.5"
            fill="url(#gcw-lamp)"
        />

        <!-- The push bar's recess, and the bar in it. -->
        <rect x="17" y="52" width="90" height="88" rx="8" fill="#a8987a" />
        <g class="bar" style="transform-origin: 62px 96px">
            <rect
                x="20"
                y="55"
                width="84"
                height="82"
                rx="7"
                fill="url(#gcw-bar)"
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

        <!-- The light button, a bulb on it: for show, it lights. -->
        <g
            class="extra light"
            :class="{ on: bulbOn }"
            data-extra="light"
            @click="bulbOn = !bulbOn"
        >
            <circle
                cx="36"
                cy="164"
                r="13"
                fill="url(#gcw-bar)"
                stroke="#b9a98a"
            />
            <circle class="bulb" cx="36" cy="161" r="5" />
            <rect class="bulb-base" x="33" y="166" width="6" height="4" />
        </g>

        <!-- The lock slide: for show, it slides across to lock. -->
        <g class="extra" data-extra="lock" @click="locked = !locked">
            <rect x="60" y="159" width="44" height="10" rx="5" fill="#5b4f3c" />
            <rect
                class="lock-mark"
                :class="{ on: locked }"
                x="64"
                y="161"
                width="20"
                height="6"
                rx="3"
            />
            <rect
                class="knob"
                :class="{ locked }"
                x="62"
                y="155"
                width="16"
                height="18"
                rx="3"
                fill="url(#gcw-bar)"
                stroke="#b9a98a"
            />
        </g>
    </svg>
</template>

<style scoped>
.lamp-edge {
    stop-color: #a16207;
}

.lamp {
    opacity: 0.45;
    transition: opacity 150ms;
}

.lamp.on {
    opacity: 1;
    filter: drop-shadow(0 0 4px #fde68a);
}

.lamp-edge.on {
    stop-color: #fbbf24;
}

.bulb,
.bulb-base {
    fill: #5b4f3c;
    transition: fill 150ms;
}

.light.on .bulb {
    fill: #fde047;
    filter: drop-shadow(0 0 4px #facc15);
}

.light.on .bulb-base {
    fill: #a16207;
}

.lock-mark {
    fill: #5b4f3c;
    transition: fill 150ms;
}

.lock-mark.on {
    fill: #dc2626;
}

.knob {
    transition: transform 160ms ease-out;
}

.knob.locked {
    transform: translateX(24px);
}

@media (prefers-reduced-motion: reduce) {
    .lamp,
    .bulb,
    .bulb-base,
    .lock-mark,
    .knob {
        transition: none;
    }
}
</style>
