<script setup>
/**
 * The Garage's car visor remote clicker (issue #227): a grey remote on
 * the clip that holds it to a car's sun visor, three buttons down it. The
 * first, with a garage on it, presses the opener; the others are for
 * show. Its green LED shows the opener's light (`lit`).
 *
 * Only its picture: GarageClicker.vue is the button, and pushes in its
 * `.bar`.
 */
defineProps({
    lit: { type: Boolean, default: false },
});
</script>

<template>
    <svg viewBox="0 0 124 200" aria-hidden="true">
        <defs>
            <linearGradient id="gcv-body" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#9ca3af" />
                <stop offset="0.5" stop-color="#d1d5db" />
                <stop offset="1" stop-color="#9ca3af" />
            </linearGradient>
            <linearGradient id="gcv-key" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#4b5563" />
                <stop offset="1" stop-color="#1f2937" />
            </linearGradient>
            <linearGradient id="gcv-clip" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#94a3b8" />
                <stop offset="0.5" stop-color="#f1f5f9" />
                <stop offset="1" stop-color="#94a3b8" />
            </linearGradient>
        </defs>

        <!-- The visor clip, behind it, over its top. -->
        <rect
            x="44"
            y="2"
            width="36"
            height="64"
            rx="6"
            fill="url(#gcv-clip)"
        />
        <rect x="50" y="8" width="24" height="5" rx="2" fill="#64748b" />

        <!-- The body and its bezel. -->
        <rect x="16" y="14" width="92" height="182" rx="14" fill="#6b7280" />
        <rect
            x="19"
            y="17"
            width="86"
            height="176"
            rx="12"
            fill="url(#gcv-body)"
        />

        <!-- The LED, which shows the opener's light. -->
        <circle cx="62" cy="32" r="5" fill="#374151" />
        <circle class="lamp" :class="{ on: lit }" cx="62" cy="32" r="3.5" />

        <!-- Button 1, the garage's. -->
        <g class="bar" style="transform-origin: 62px 73px">
            <rect
                x="28"
                y="46"
                width="68"
                height="54"
                rx="9"
                fill="url(#gcv-key)"
                stroke="#111827"
            />
            <path d="M46 74 L62 61 L78 74 Z" fill="#e5e7eb" />
            <rect x="49" y="74" width="26" height="17" fill="#e5e7eb" />
            <g fill="#4b5563">
                <rect x="52" y="77" width="20" height="2.5" />
                <rect x="52" y="81.5" width="20" height="2.5" />
                <rect x="52" y="86" width="20" height="2.5" />
            </g>
        </g>

        <!-- Buttons 2 and 3, for show, and their numbers. -->
        <g fill="url(#gcv-key)" stroke="#111827">
            <rect x="28" y="110" width="68" height="34" rx="9" />
            <rect x="28" y="152" width="68" height="34" rx="9" />
        </g>
        <g
            fill="#d1d5db"
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-size="18"
            font-weight="700"
            text-anchor="middle"
        >
            <text x="62" y="133">2</text>
            <text x="62" y="175">3</text>
        </g>
    </svg>
</template>

<style scoped>
.lamp {
    fill: #14532d;
    transition: fill 150ms;
}

.lamp.on {
    fill: #4ade80;
    filter: drop-shadow(0 0 3px #22c55e);
}

@media (prefers-reduced-motion: reduce) {
    .lamp {
        transition: none;
    }
}
</style>
