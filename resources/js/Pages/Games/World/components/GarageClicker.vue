<script setup>
import { onBeforeUnmount, ref } from "vue";
import { useTranslations } from "@/composables/useTranslations";
import ClickerFob from "./garage/ClickerFob.vue";
import ClickerKeypad from "./garage/ClickerKeypad.vue";
import ClickerVisor from "./garage/ClickerVisor.vue";
import ClickerWall from "./garage/ClickerWall.vue";

/**
 * The Garage's clicker (issue #227), on screen the whole time you're in
 * the Garage, whichever wall you face: whichever style `clicker` names
 * (composables/useGarageStyles.js CLICKERS), big and detailed. It presses
 * the opener (`press`), and its lamp shows the opener's light (`lit`).
 * Beside it, one button swaps to the next clicker (`next-clicker`) and
 * one to the next door (`next-door`).
 *
 * The keypad is its own keys; every other clicker is a picture this makes
 * one button of, pushing in the picture's `.bar` on a press.
 */
defineProps({
    clicker: { type: String, default: "wall" },
    lit: { type: Boolean, default: false },
});
const emit = defineEmits(["press", "next-clicker", "next-door"]);
const { t } = useTranslations();

const PICTURES = {
    wall: ClickerWall,
    fob: ClickerFob,
    visor: ClickerVisor,
};

// Held in for a moment after a press, so a quick tap still shows.
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
    <div class="garage-clicker">
        <div class="device" :class="{ keypad: clicker === 'keypad' }">
            <ClickerKeypad
                v-if="clicker === 'keypad'"
                :lit="lit"
                @press="emit('press')"
            />
            <button
                v-else
                type="button"
                class="picture"
                :class="{ pushed }"
                :aria-label="t('games.world.toys.garage_button')"
                :title="t('games.world.toys.garage_button')"
                @click.stop="press"
            >
                <component :is="PICTURES[clicker]" :lit="lit" />
            </button>
        </div>
        <div class="swaps">
            <button
                type="button"
                class="swap"
                :aria-label="t('games.world.garage.swap_clicker')"
                :title="t('games.world.garage.swap_clicker')"
                @click.stop="emit('next-clicker')"
            >
                <span aria-hidden="true">🎛️</span>
            </button>
            <button
                type="button"
                class="swap"
                :aria-label="t('games.world.garage.swap_door')"
                :title="t('games.world.garage.swap_door')"
                @click.stop="emit('next-door')"
            >
                <span aria-hidden="true">🚪</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
/* Bottom left, over the turn buttons, big enough to mash, its swaps to
   its right along its foot. Every clicker fills the same box but the
   keypad, which needs a bigger one for its twelve keys, though never so
   big it hides the room on a small screen. The box is what a clicker
   sizes itself off (its cqh and cqw). */
.garage-clicker {
    position: absolute;
    left: calc(0.75rem + env(safe-area-inset-left, 0px));
    bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
    z-index: 10;
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
}

.device {
    container-type: size;
    height: min(13rem, 45vh);
    aspect-ratio: 124 / 200;
    filter: drop-shadow(0 4px 8px rgb(0 0 0 / 0.45));
}

.device.keypad {
    height: min(17rem, 45vh, 52vw);
    aspect-ratio: 3 / 4;
}

.picture {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}

.picture :deep(svg) {
    display: block;
    width: 100%;
    height: 100%;
}

.picture :deep(.bar) {
    transition: transform 80ms ease-out, filter 80ms ease-out;
}

.picture:active :deep(.bar),
.picture.pushed :deep(.bar) {
    transform: scale(0.95) translateY(1.5px);
    filter: brightness(0.88);
}

.picture:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 3px;
    border-radius: 0.75rem;
}

.swaps {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.swap {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 2px solid rgb(255 255 255 / 0.85);
    border-radius: 9999px;
    background: rgb(15 23 42 / 0.7);
    font-size: 1.35rem;
    line-height: 1;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.35);
}

.swap:active {
    transform: scale(0.92);
}

.swap:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
    .picture :deep(.bar) {
        transition: none;
    }
}
</style>
