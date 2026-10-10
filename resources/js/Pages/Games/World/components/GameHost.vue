<script setup>
import Button from "@/Components/Button.vue";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import { createCastKit } from "@/Components/Games/Cast/three/castMesh.js";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import {
    speakGameIntro,
    stopGameIntroSpeech,
} from "@/composables/useGameIntroSpeech";
import { useFocusTrap } from "@/composables/useFocusTrap";
import { useToot } from "@/composables/useToot";
import { useTranslations } from "@/composables/useTranslations";
import { usePage } from "@inertiajs/vue3";
import { usePreferredReducedMotion } from "@vueuse/core";
import {
    computed,
    defineAsyncComponent,
    nextTick,
    onMounted,
    onUnmounted,
    ref,
} from "vue";
import { hostedGame } from "../hostedGames.js";
import { playSound } from "../sounds.js";

// A page game played over the world (issue #144), in the same window as a
// minigame. The confirm card already asked; this mounts its App.vue in that
// window and, when the round ends, the score. The game reaches the world
// only through `kit`. Closing returns to the spot the card opened on.
const props = defineProps({
    // The confirm card's game: slug, name, emoji, and cast or landmark.
    game: { type: Object, required: true },
});

const emit = defineEmits(["cancel"]);

const { t } = useTranslations();
const page = usePage();

const load = hostedGame(props.game.slug);
const Game = load ? defineAsyncComponent(load) : null;
const titleId = `game-host-title-${props.game.slug}`;

// "playing", then "done". Another go mounts the game afresh.
const phase = ref("playing");
const score = ref(0);
const round = ref(0);

const panelRef = ref(null);
const playRef = ref(null);
const closeRef = ref(null);
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
        speakGameIntro(t("games.world.score", { score: result.score }));
        focusButton();
    },
};

function focusButton() {
    nextTick(() => playRef.value?.$el?.focus());
}

function playAgain() {
    unlock();
    stopGameIntroSpeech();
    round.value++;
    phase.value = "playing";
}

onMounted(() => {
    unlock();
    nextTick(() => closeRef.value?.focus());
});
onUnmounted(stopGameIntroSpeech);

const cancel = () => emit("cancel");

/** A click on the dim backdrop closes the score, but not mid-game, where a
 * tap is the game. */
function onBackdrop() {
    if (phase.value !== "playing") cancel();
}

const puffAt = (puff) => ({
    left: `${puff.x * 100}%`,
    top: `${puff.y * 100}%`,
});
</script>

<template>
    <div
        class="game-host absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-3"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="onBackdrop"
        @keydown.esc.prevent="cancel"
        @keydown="trapKeydown"
    >
        <div
            ref="panelRef"
            class="game-host-panel relative flex w-full max-w-lg flex-col rounded-2xl border-2 border-theme-primary bg-theme-content p-4 text-center shadow-xl"
        >
            <h2
                :id="titleId"
                class="font-heading px-12 text-[clamp(1.35rem,5vmin,1.9rem)] font-black leading-tight tracking-wide text-theme-book-title"
            >
                <span aria-hidden="true">{{ game.emoji }}</span>
                {{ game.name }}
            </h2>

            <div
                v-if="phase === 'playing'"
                class="game-host-play relative mt-3 flex-1 overflow-hidden rounded-xl"
            >
                <component :is="Game" :key="round" :kit="kit" />
                <TootPuff
                    v-for="puff in puffs"
                    :key="puff.id"
                    :style="puffAt(puff)"
                />
            </div>

            <div
                v-else
                class="game-host-score flex flex-1 flex-col items-center justify-center py-4"
            >
                <div class="text-[clamp(3rem,14vmin,4.5rem)] leading-none">
                    <CastMember v-if="game.cast" :id="game.cast" :move="null" />
                    <span v-else aria-hidden="true">{{ game.landmark }}</span>
                </div>
                <p
                    class="game-host-points mt-3 font-heading text-[clamp(1.2rem,4.5vmin,1.7rem)] font-black text-theme-book-title"
                >
                    {{ t("games.world.score", { score }) }}
                </p>
                <div class="mt-6 flex flex-col items-center gap-3">
                    <Button
                        ref="playRef"
                        type="button"
                        class="game-host-again"
                        @click="playAgain"
                    >
                        {{ t("games.world.minigames.play_again") }}
                    </Button>
                    <ShareToChatButton
                        :game-slug="game.slug"
                        :score="score"
                        :in-world="true"
                    />
                    <button
                        type="button"
                        class="game-host-done rounded-md px-3 py-1 text-sm font-bold text-theme-book-title underline-offset-2 transition-opacity hover:underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                        @click="cancel"
                    >
                        {{ t("games.world.minigames.done") }}
                    </button>
                </div>
            </div>

            <!-- Outside the play box: the game's own score bar is z-50 in
                 there, and this has to stay reachable above it. -->
            <button
                v-if="phase === 'playing'"
                ref="closeRef"
                type="button"
                class="game-host-close absolute right-3 top-3 z-10 h-12 w-12 rounded-full bg-black/70 text-2xl text-white shadow-lg ring-2 ring-white/80 focus-visible:outline-none focus-visible:ring-theme-primary"
                :aria-label="t('games.world.minigames.done')"
                @click="cancel"
            >
                <span aria-hidden="true">✕</span>
            </button>
        </div>
    </div>
</template>

<style scoped>
.game-host-panel {
    height: min(100%, 36rem);
}

.game-host-play {
    min-height: 18rem;
    background: #3e2723;
}
</style>
