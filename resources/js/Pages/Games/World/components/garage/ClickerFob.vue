<script setup>
/**
 * The Garage's keychain fob clicker (issue #227): a little black fob on
 * its ring, one big rubber button with a garage on it that presses the
 * opener, and a red LED that shows the opener's light (`lit`).
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
            <linearGradient id="gcf-body" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#4b5563" />
                <stop offset="1" stop-color="#111827" />
            </linearGradient>
            <radialGradient id="gcf-button" cx="0.4" cy="0.35" r="0.75">
                <stop offset="0" stop-color="#6b7280" />
                <stop offset="1" stop-color="#374151" />
            </radialGradient>
        </defs>

        <!-- The split ring, and the loop it's through. -->
        <circle
            cx="62"
            cy="20"
            r="15"
            fill="none"
            stroke="#cbd5e1"
            stroke-width="4"
        />
        <rect x="52" y="30" width="20" height="18" rx="6" fill="#1f2937" />
        <circle cx="62" cy="39" r="4" fill="#0f172a" />

        <!-- The body, its seam, and a highlight down one edge. -->
        <rect
            x="20"
            y="42"
            width="84"
            height="152"
            rx="38"
            fill="url(#gcf-body)"
        />
        <rect
            x="24"
            y="46"
            width="76"
            height="144"
            rx="34"
            fill="none"
            stroke="#6b7280"
            stroke-width="1.2"
        />
        <path
            d="M30 80 Q30 56 50 50"
            fill="none"
            stroke="#9ca3af"
            stroke-width="2.5"
            stroke-linecap="round"
            opacity="0.6"
        />

        <!-- The LED, which shows the opener's light. -->
        <circle cx="62" cy="64" r="5" fill="#1f2937" />
        <circle class="lamp" :class="{ on: lit }" cx="62" cy="64" r="3.5" />

        <!-- The big button, a garage on it. -->
        <g class="bar" style="transform-origin: 62px 113px">
            <circle cx="62" cy="114" r="30" fill="#111827" />
            <circle cx="62" cy="113" r="27" fill="url(#gcf-button)" />
            <path d="M46 114 L62 101 L78 114 Z" fill="#e5e7eb" />
            <rect x="49" y="114" width="26" height="15" fill="#e5e7eb" />
            <g fill="#4b5563">
                <rect x="52" y="117" width="20" height="2.5" />
                <rect x="52" y="121.5" width="20" height="2.5" />
                <rect x="52" y="126" width="20" height="2.5" />
            </g>
        </g>

        <!-- Lock and unlock, below: for show. -->
        <g fill="#374151" stroke="#111827">
            <rect x="36" y="156" width="22" height="16" rx="6" />
            <rect x="66" y="156" width="22" height="16" rx="6" />
        </g>
        <g fill="#9ca3af">
            <rect x="43" y="162" width="8" height="6" rx="1" />
            <rect x="73" y="162" width="8" height="6" rx="1" />
        </g>
        <g fill="none" stroke="#9ca3af" stroke-width="1.6">
            <path d="M44.5 162 V159.5 A2.5 2.5 0 0 1 49.5 159.5 V162" />
            <path d="M74.5 162 V159.5 A2.5 2.5 0 0 1 79.5 158" />
        </g>
    </svg>
</template>

<style scoped>
.lamp {
    fill: #7f1d1d;
    transition: fill 150ms;
}

.lamp.on {
    fill: #f87171;
    filter: drop-shadow(0 0 3px #ef4444);
}

@media (prefers-reduced-motion: reduce) {
    .lamp {
        transition: none;
    }
}
</style>
