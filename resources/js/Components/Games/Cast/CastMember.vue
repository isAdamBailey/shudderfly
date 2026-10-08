<script setup>
import "./castMoves.css";
import PersonFace from "@/Components/Games/PersonFace.vue";
import { CAST } from "@/constants/characters.js";
import { useTranslations } from "@/composables/useTranslations";
import { computed, ref, watch } from "vue";

// The one way to draw a cast member (issue #130): the same glyph, depth,
// ground shadow and moves for a character wherever it appears. Callers place
// it; it never positions itself. Decorative unless given a label, so an
// interactable wraps it in its own <button>.
const props = defineProps({
    id: {
        type: String,
        required: true,
        validator: (id) => Object.hasOwn(CAST, id),
    },
    /** The ongoing move, from the character's list, or null to stand still.
     * One-shots (a toot, a gulp) are better played with play(). */
    move: { type: String, default: "idle" },
    /** Glyphs are drawn facing right; "left" mirrors them. */
    facing: {
        type: String,
        default: "right",
        validator: (f) => f === "left" || f === "right",
    },
    /** Any CSS font-size; inherits the parent's by default. */
    size: { type: String, default: null },
    /** Height above the ground in px: lifts the body, shrinks the shadow. */
    lift: { type: Number, default: 0 },
    /** Spin in degrees, e.g. while thrown. */
    tilt: { type: Number, default: 0 },
    /** Accessible name: a string, or true for the character's own name. */
    label: { type: [String, Boolean], default: null },
});

const { t } = useTranslations();

const member = computed(() => CAST[props.id]);
const ariaLabel = computed(() =>
    props.label === true ? t(member.value.nameKey) : props.label || null
);

// Read when needed rather than watched: only play() and landing ask, and
// castMoves.css already stills every move under reduced motion.
const reducedMotion = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// A one-shot played over the ongoing move until its animation ends. Each play
// re-keys the body, so playing the same one-shot twice restarts it.
const oneShot = ref(null);
const plays = ref(0);
const activeMove = computed(() => oneShot.value ?? props.move);

const moveClass = computed(() =>
    activeMove.value && member.value.moves.includes(activeMove.value)
        ? `cast-move-${activeMove.value}`
        : null
);

/** Plays `move` once, then returns to the ongoing move. Ignored for a move
 * the character doesn't have, and under reduced motion (nothing would show). */
function play(move) {
    if (!member.value.moves.includes(move) || reducedMotion()) return;
    oneShot.value = move;
    plays.value++;
}

function onAnimationEnd(event) {
    // Looping moves never end, and PersonFace's own animations bubble up too.
    const el = event.target.classList;
    if (el.contains("cast-body")) oneShot.value = null;
    else if (el.contains("cast-squash")) landing.value = false;
}

defineExpose({ play });

// Drawn from 0 (on the ground) shrinking toward half size and fading as the
// body rises, so height reads even on a flat road.
const SHADOW_FALLOFF = 120; // px of lift at which the shadow is at 1/2 size
const shadowStyle = computed(() => {
    const height = Math.max(props.lift, 0);
    const k = SHADOW_FALLOFF / (SHADOW_FALLOFF + height);
    return height ? { transform: `scale(${k})`, opacity: k } : null;
});

const liftStyle = computed(() =>
    props.lift || props.tilt
        ? {
              transform: `translateY(${-props.lift}px) rotate(${
                  props.tilt
              }deg)`,
          }
        : null
);

// Squash on touching down from a real height (a throw, not a walking bob).
// Re-keyed per landing like play(), so a bounce restarts it and a squash
// that never finished (hidden, reduced motion turned on) can't wedge it.
const LANDING_HEIGHT = 24; // px
const landing = ref(false);
const landings = ref(0);

watch(
    () => props.lift,
    (lift, before) => {
        if (lift <= 0 && before > LANDING_HEIGHT && !reducedMotion()) {
            landing.value = true;
            landings.value++;
        }
    }
);
</script>

<template>
    <span
        class="cast-member"
        :class="[
            `cast-${id}`,
            moveClass,
            { 'cast-landing': landing, 'cast-facing-left': facing === 'left' },
        ]"
        :style="size ? { fontSize: size } : null"
        :role="ariaLabel ? 'img' : null"
        :aria-label="ariaLabel"
        :aria-hidden="ariaLabel ? null : 'true'"
        @animationend="onAnimationEnd"
    >
        <!-- Two layers: the outer follows lift, the inner plays the move's
             own shadow animation, so neither overrides the other. -->
        <span class="cast-ground" :style="shadowStyle">
            <span class="cast-shadow"></span>
        </span>
        <span class="cast-lift" :style="liftStyle">
            <span :key="landings" class="cast-squash">
                <span :key="plays" class="cast-body">
                    <span v-if="id === 'face'" class="cast-face">
                        <PersonFace :gulping="activeMove === 'chomp'" />
                    </span>
                    <span v-else class="cast-glyph">{{ member.emoji }}</span>
                </span>
            </span>
        </span>
    </span>
</template>

<style scoped>
.cast-member {
    position: relative;
    display: inline-block;
    line-height: 1;
}

.cast-lift,
.cast-squash,
.cast-body {
    display: block;
}

/* The same depth for everyone: a few stacked, darkening copies of the glyph's
   own silhouette down and to the right, so a flat emoji reads as a solid. */
.cast-glyph {
    display: block;
    text-shadow: 0.015em 0.02em 0 rgb(0 0 0 / 0.18),
        0.03em 0.04em 0 rgb(0 0 0 / 0.14), 0.045em 0.06em 0 rgb(0 0 0 / 0.1);
}

.cast-facing-left .cast-glyph,
.cast-facing-left .cast-face {
    transform: scaleX(-1);
}

/* PersonFace sizes itself from its container's height. */
.cast-face {
    display: flex;
    justify-content: center;
    height: 1em;
    filter: drop-shadow(0.03em 0.04em 0 rgb(0 0 0 / 0.15));
}

.cast-ground {
    position: absolute;
    inset: auto 0 -0.06em;
    height: 0.16em;
    pointer-events: none;
}

.cast-shadow {
    position: absolute;
    left: 50%;
    width: 0.8em;
    height: 100%;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgb(0 0 0 / 0.3), rgb(0 0 0 / 0));
    transform: translateX(-50%);
}
</style>
