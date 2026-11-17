<script setup>
import { ref } from "vue";
import { useTranslations } from "@/composables/useTranslations";
import { playGarageBeep } from "../../garageSounds.js";
import { CODE_LENGTH, createKeypad } from "../garageKeypad.js";

/**
 * The Garage's outdoor keypad clicker (issue #227), the kind on the wall
 * outside a garage: any four digits and Enter press the opener (`press`;
 * garageKeypad.js), a dot lighting for each digit in. Its lamp shows the
 * opener's light (`lit`), and the keys glow with it. Every key beeps
 * (garageSounds.js), Enter higher when it opens.
 */
const props = defineProps({
    lit: { type: Boolean, default: false },
    // While the room's frozen, the keys do nothing.
    frozen: { type: Boolean, default: false },
});
const emit = defineEmits(["press"]);
const { t } = useTranslations();

const keypad = createKeypad();
const entered = ref(0);

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function digit() {
    if (props.frozen) return;
    playGarageBeep();
    keypad.digit();
    entered.value = keypad.entered;
}

function enter() {
    if (props.frozen) return;
    const opens = keypad.enter();
    playGarageBeep(opens);
    entered.value = keypad.entered;
    if (opens) emit("press");
}
</script>

<template>
    <div
        class="clicker"
        :class="{ lit }"
        role="group"
        :aria-label="t('games.world.toys.garage_button')"
        :title="t('games.world.toys.garage_button')"
    >
        <div class="top">
            <span class="lamp" :class="{ on: lit }" />
            <span class="dots" aria-hidden="true">
                <span
                    v-for="n in CODE_LENGTH"
                    :key="n"
                    class="dot"
                    :class="{ in: n <= entered }"
                />
            </span>
        </div>
        <div class="keys">
            <button
                v-for="d in DIGITS"
                :key="d"
                type="button"
                class="key"
                :data-key="d"
                @click.stop="digit"
            >
                {{ d }}
            </button>
            <button
                type="button"
                class="key"
                data-key="0"
                style="grid-column: 2"
                @click.stop="digit"
            >
                0
            </button>
            <button
                type="button"
                class="key enter"
                data-key="enter"
                :aria-label="t('games.world.garage.enter')"
                @click.stop="enter"
            >
                <span aria-hidden="true">⏎</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
/* A brushed steel box on the wall, sized off the box it's in
   (GarageClicker.vue). */
.clicker {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 7cqh 9cqw;
    gap: 5cqh;
    border-radius: 8cqw;
    background: linear-gradient(135deg, #e5e7eb, #9ca3af 55%, #d1d5db);
    box-shadow: inset 0 0 0 2px #6b7280, inset 0 3px 6px rgb(255 255 255 / 0.5);
}

.top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5cqh 5cqw;
    border-radius: 3cqw;
    background: #1f2937;
}

.lamp {
    width: 5cqh;
    height: 5cqh;
    border-radius: 50%;
    background: #78350f;
    transition: background-color 150ms;
}

.lamp.on {
    background: #fbbf24;
    box-shadow: 0 0 2cqh #fde68a;
}

.dots {
    display: flex;
    gap: 3cqw;
}

.dot {
    width: 3cqh;
    height: 3cqh;
    border-radius: 50%;
    background: #374151;
}

.dot.in {
    background: #4ade80;
}

.keys {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 3cqh 5cqw;
}

.key {
    padding: 0;
    border: 0;
    border-radius: 3cqw;
    background: linear-gradient(#4b5563, #1f2937);
    box-shadow: 0 1cqh 0 #111827;
    color: #e5e7eb;
    font: 700 8cqh / 1 ui-sans-serif, system-ui, sans-serif;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: transform 60ms ease-out, color 150ms;
}

.lit .key {
    color: #fde68a;
    text-shadow: 0 0 1.5cqh #f59e0b;
}

.key:active {
    transform: translateY(1cqh);
    box-shadow: none;
}

.enter {
    background: linear-gradient(#15803d, #14532d);
}

.key:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
    .key,
    .lamp {
        transition: none;
    }
}
</style>
