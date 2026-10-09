<script setup>
import Button from "@/Components/Button.vue";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import { createCastKit } from "@/Components/Games/Cast/three/castMesh.js";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import {
    speakGameIntro,
    stopGameIntroSpeech,
} from "@/composables/useGameIntroSpeech";
import { useFocusTrap } from "@/composables/useFocusTrap";
import { useToot } from "@/composables/useToot";
import { useTranslations } from "@/composables/useTranslations";
import { usePage } from "@inertiajs/vue3";
import { usePreferredReducedMotion } from "@vueuse/core";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { minigameComponent } from "../minigames/index.js";
import { playSound } from "../sounds.js";

// A minigame's host: a modal over the stage that says what the game is
// (read aloud), plays it in its own box on Play, then gives the score with
// another go or a way back to the room. The minigame gets the world only
// through `kit` (see minigames/index.js).
const props = defineProps({
    // The `minigame` interactable: its `minigame` name, `label`, `line`
    // (how to play) and look (`emoji` or `cast`).
    item: { type: Object, required: true },
});

const emit = defineEmits(["cancel"]);

const { t } = useTranslations();
const page = usePage();

const game = minigameComponent(props.item.minigame);
const titleId = `minigame-title-${props.item.id}`;

// "intro", then "playing", then "done"; another go goes back to "playing".
const phase = ref("intro");
const score = ref(0);
// Each go mounts the minigame afresh.
const round = ref(0);

const panelRef = ref(null);
const playRef = ref(null);
const { trapKeydown } = useFocusTrap(panelRef);

const { puffs, toot, unlock } = useToot(page.props.fartSoundUrl);
const motion = usePreferredReducedMotion();

const kit = {
    CastMember,
    createCastKit,
    toot,
    speak: speakGameIntro,
    playSound,
    reducedMotion: computed(() => motion.value === "reduce"),
    finish(result) {
        score.value = result.score;
        phase.value = "done";
        const words = t("games.world.minigames.score", {
            score: result.score,
        });
        speakGameIntro(words);
        focusButton();
    },
};

/** The first button (Play, or Play again) takes focus. */
function focusButton() {
    nextTick(() => playRef.value?.$el?.focus());
}

function play() {
    // The click is the gesture the toot needs to be allowed to sound.
    unlock();
    stopGameIntroSpeech();
    round.value++;
    phase.value = "playing";
}

onMounted(() => {
    focusButton();
    speakGameIntro(`${props.item.label}. ${props.item.line}`);
});

onUnmounted(stopGameIntroSpeech);

const cancel = () => emit("cancel");

/** A click on the dim backdrop closes it, but not mid-game, where a drag
 * that strays off the box is no reason to stop. */
function onBackdrop() {
    if (phase.value !== "playing") cancel();
}

const puffAt = (puff) => ({ left: `${puff.x * 100}%`, top: `${puff.y * 100}%` });
</script>

<template>
    <div
        class="minigame-card absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-3"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="onBackdrop"
        @keydown.esc.prevent="cancel"
        @keydown="trapKeydown"
    >
        <div
            ref="panelRef"
            class="minigame-panel flex w-full max-w-lg flex-col rounded-2xl border-2 border-theme-primary bg-theme-content p-4 text-center shadow-xl"
        >
            <h2
                :id="titleId"
                class="font-heading text-[clamp(1.35rem,5vmin,1.9rem)] font-black leading-tight tracking-wide text-theme-book-title"
            >
                {{ item.label }}
            </h2>

            <div
                v-if="phase === 'playing'"
                class="minigame-box relative mt-3 flex-1 overflow-hidden rounded-xl"
            >
                <component :is="game" :key="round" :kit="kit" />
                <TootPuff
                    v-for="puff in puffs"
                    :key="puff.id"
                    :style="puffAt(puff)"
                />
                <button
                    type="button"
                    class="minigame-close absolute right-2 top-10 h-12 w-12 rounded-full bg-black/40 text-2xl text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                    :aria-label="t('games.world.minigames.done')"
                    @click="cancel"
                >
                    <span aria-hidden="true">✕</span>
                </button>
            </div>

            <div
                v-else
                class="flex flex-1 flex-col items-center justify-center py-4"
            >
                <div class="text-[clamp(3rem,14vmin,4.5rem)] leading-none">
                    <CastMember v-if="item.cast" :id="item.cast" :move="null" />
                    <span v-else aria-hidden="true">{{ item.emoji }}</span>
                </div>
                <p
                    v-if="phase === 'done'"
                    class="minigame-score mt-3 font-heading text-[clamp(1.2rem,4.5vmin,1.7rem)] font-black text-theme-book-title"
                >
                    {{ t("games.world.minigames.score", { score }) }}
                </p>
                <p
                    v-else
                    class="mt-3 text-[clamp(0.9rem,2.6vmin,1.05rem)] font-semibold leading-relaxed text-gray-700"
                >
                    {{ item.line }}
                </p>
                <div class="mt-6 flex flex-col items-center gap-3">
                    <Button
                        ref="playRef"
                        type="button"
                        class="minigame-play"
                        @click="play"
                    >
                        {{
                            phase === "done"
                                ? t("games.world.minigames.play_again")
                                : t("games.world.play")
                        }}
                    </Button>
                    <button
                        type="button"
                        class="minigame-cancel rounded-md px-3 py-1 text-sm font-bold text-theme-book-title underline-offset-2 transition-opacity hover:underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                        @click="cancel"
                    >
                        {{
                            phase === "done"
                                ? t("games.world.minigames.done")
                                : t("games.world.cancel")
                        }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* As tall as the stage allows, so the game has room to fall in. */
.minigame-panel {
    height: min(100%, 36rem);
}

/* A sky to catch things under. */
.minigame-box {
    background: linear-gradient(#7dd3fc, #bae6fd 70%, #86efac 70%);
}
</style>
