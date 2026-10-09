<script setup>
import { useTranslations } from "@/composables/useTranslations";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { BUTT_Y, useTootCatch } from "./useTootCatch.js";

// Toot Catch, the world's first minigame: Toot Foods fall, and the Butt
// slides along the bottom to catch them, tooting at each one's pitch. Like
// every minigame it reaches the world only through `kit` (minigames/index.js).
const props = defineProps({
    kit: { type: Object, required: true },
});

const { t } = useTranslations();

const game = useTootCatch({ calm: props.kit.reducedMotion.value });
const { state } = game;

const fieldEl = ref(null);
const buttRef = ref(null);
const moving = ref(false);

const still = computed(() => props.kit.reducedMotion.value);
const buttMove = computed(() => {
    if (still.value) return null;
    return moving.value ? "walk" : "idle";
});
const secondsLeft = computed(() => Math.ceil(state.timeLeft));

// --- The loop -------------------------------------------------------------------

let frame = 0;
let last = 0;

function tick(now) {
    // At most a twentieth of a second a frame, so a stall (a hidden tab)
    // doesn't drop a round's worth of food at once.
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const was = state.butt.x;
    for (const event of game.step(dt)) {
        if (event.type !== "catch") continue;
        props.kit.toot(event.food.type, { x: event.food.x, y: BUTT_Y });
        buttRef.value?.play("eat");
    }
    moving.value = state.butt.x !== was;
    if (state.finished) {
        frame = 0;
        props.kit.finish({ score: state.score });
        return;
    }
    frame = requestAnimationFrame(tick);
}

onMounted(() => {
    fieldEl.value?.focus({ preventScroll: true });
    last = performance.now();
    frame = requestAnimationFrame(tick);
});

onBeforeUnmount(() => cancelAnimationFrame(frame));

// --- Input ----------------------------------------------------------------------

// The field's box, measured once per press rather than on every move.
let pressed = null;

function across(event) {
    return (event.clientX - pressed.left) / pressed.width;
}

function onPointerDown(event) {
    if (event.button > 0) return;
    pressed = fieldEl.value.getBoundingClientRect();
    fieldEl.value.setPointerCapture?.(event.pointerId);
    game.slideTo(across(event));
}

function onPointerMove(event) {
    if (pressed) game.slideTo(across(event));
}

function onPointerUp() {
    pressed = null;
}

const KEYS = { ArrowLeft: -1, ArrowRight: 1 };

function onKeydown(event) {
    const direction = KEYS[event.key];
    if (!direction) return;
    event.preventDefault();
    game.hold(direction);
}

function onKeyup(event) {
    if (KEYS[event.key]) game.hold(0);
}

// A layer the field's size, moved by a fraction of itself: a thing at
// (x, y) of the field, placed with transform alone.
const at = (x, y) => ({ transform: `translate(${x * 100}%, ${y * 100}%)` });
</script>

<template>
    <div
        ref="fieldEl"
        class="catch-field"
        tabindex="0"
        :aria-label="t('games.world.minigames.toot_catch_aria')"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @keydown="onKeydown"
        @keyup="onKeyup"
    >
        <div class="catch-hud" aria-hidden="true">
            <span>🍑 {{ state.score }}</span>
            <span>⏱️ {{ secondsLeft }}</span>
        </div>

        <div
            v-for="food in state.foods"
            :key="food.id"
            class="catch-spot"
            :style="at(food.x, food.y)"
        >
            <component
                :is="kit.CastMember"
                :id="food.type"
                class="catch-thing"
                :move="null"
            />
        </div>

        <div class="catch-spot" :style="at(state.butt.x, BUTT_Y)">
            <component
                :is="kit.CastMember"
                id="butt"
                ref="buttRef"
                class="catch-thing catch-butt"
                :move="buttMove"
            />
        </div>
    </div>
</template>

<style scoped>
.catch-field {
    position: absolute;
    inset: 0;
    overflow: hidden;
    touch-action: none;
    outline: none;
    font-size: clamp(2rem, 9vmin, 3.25rem);
}

.catch-field:focus-visible {
    box-shadow: inset 0 0 0 3px #1d4ed8;
}

.catch-hud {
    position: absolute;
    top: 0.5rem;
    left: 0.75rem;
    right: 0.75rem;
    display: flex;
    justify-content: space-between;
    font-family: "Spicy Rice", cursive;
    font-size: clamp(1.1rem, 4vmin, 1.5rem);
    color: #fcd34d;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.catch-spot {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

/* Centred on its spot's corner, which is the thing's place. */
.catch-thing {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -50%);
    line-height: 1;
}

.catch-butt {
    font-size: 1.3em;
}
</style>
