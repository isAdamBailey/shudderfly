<script setup>
// Draws a cured-meat pepperoni stick inside a 100x100 design box.
// Emits only <defs>/<g> — no <svg> wrapper — so it can be embedded either
// inside a standalone <svg> (see PepperoniStick.vue) or directly inside an
// existing <svg> such as GameBoard's digestion intro.
import { useId } from "vue";

// Multiple sticks can be on screen at once (drag tray, digest intro), each
// with its own <defs>. Gradient ids must be unique per instance — SVG id
// references resolve document-wide, so duplicate ids break the fill on
// whichever instance doesn't "win" the id, especially once a sibling with
// the same id gets hidden via display:none.
const bodyGradId = useId();
const casingGradId = useId();
</script>

<template>
    <g>
        <defs>
            <linearGradient :id="bodyGradId" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8a2b1e" />
                <stop offset="45%" stop-color="#b5432a" />
                <stop offset="100%" stop-color="#6e2016" />
            </linearGradient>
            <linearGradient :id="casingGradId" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#c97a35" />
                <stop offset="50%" stop-color="#e7a75c" />
                <stop offset="100%" stop-color="#c97a35" />
            </linearGradient>
        </defs>

        <g transform="rotate(-28 50 50)">
            <!-- twisted tie knots at each end -->
            <ellipse cx="11" cy="48" rx="4" ry="5.5" fill="#8a5423" />
            <ellipse cx="89" cy="52" rx="4" ry="5.5" fill="#8a5423" />

            <!-- wrinkled casing: wavy top/bottom edges rather than a flat rect -->
            <path
                d="M15,44
                   Q22,40.5 29,44
                   Q36,47.5 43,44
                   Q50,40.5 57,44
                   Q64,47.5 71,44
                   Q78,40.5 85,44
                   L85,56
                   Q78,59.5 71,56
                   Q64,52.5 57,56
                   Q50,59.5 43,56
                   Q36,52.5 29,56
                   Q22,59.5 15,56
                   Z"
                :fill="`url(#${casingGradId})`"
            />
            <path
                d="M18,46
                   Q24,43.5 30,46
                   Q36,48.5 42,46
                   Q48,43.5 54,46
                   Q60,48.5 66,46
                   Q72,43.5 78,46
                   L78,54
                   Q72,56.5 66,54
                   Q60,51.5 54,54
                   Q48,56.5 42,54
                   Q36,51.5 30,54
                   Q24,56.5 18,54
                   Z"
                :fill="`url(#${bodyGradId})`"
            />

            <!-- casing creases -->
            <path
                d="M24,42.5 Q23,50 24,57.5"
                fill="none"
                stroke="#5c3312"
                stroke-width="1"
                opacity="0.4"
            />
            <path
                d="M38,41.5 Q37,50 38,58.5"
                fill="none"
                stroke="#5c3312"
                stroke-width="1"
                opacity="0.35"
            />
            <path
                d="M52,41.5 Q51,50 52,58.5"
                fill="none"
                stroke="#5c3312"
                stroke-width="1"
                opacity="0.4"
            />
            <path
                d="M66,42 Q65,50 66,58"
                fill="none"
                stroke="#5c3312"
                stroke-width="1"
                opacity="0.35"
            />
            <path
                d="M78,43 Q77,50 78,57"
                fill="none"
                stroke="#5c3312"
                stroke-width="1"
                opacity="0.4"
            />

            <!-- fat flecks -->
            <circle cx="30" cy="49" r="2" fill="#e8b48a" opacity="0.8" />
            <circle cx="45" cy="52" r="1.7" fill="#f0c9a0" opacity="0.75" />
            <circle cx="60" cy="48" r="1.9" fill="#e8b48a" opacity="0.8" />
            <circle cx="72" cy="51" r="1.5" fill="#f0c9a0" opacity="0.7" />
            <ellipse cx="24" cy="46" rx="3.5" ry="1.3" fill="#fff" opacity="0.16" />
        </g>
    </g>
</template>
