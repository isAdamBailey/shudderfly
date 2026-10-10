<template>
    <GameBoard
        v-if="state.phase === 'playing'"
        :state="state"
        :kit="kit"
        @hiss="hiss"
    />
    <WinScreen
        v-else-if="state.phase === 'win' && !kit"
        :score="state.score"
        :stars="stars"
        :fact="currentFact"
        :is-new-high="state.score >= state.highScore && state.score > 0"
        @play-again="handlePlay"
    />
</template>

<script setup>
import { onUnmounted, watch } from "vue";
import { usePage } from "@inertiajs/vue3";

import GameBoard from "./components/GameBoard.vue";
import WinScreen from "./components/WinScreen.vue";
import { useGameState } from "./composables/useGameState.js";
import { useSound } from "./composables/useSound.js";
import { useAutoStartGame } from "@/composables/useAutoStartGame";

// With `kit`, over the world (GameHost). The kit is the only way it reaches
// the world: the score, the fart, the hiss, and whether motion should stay
// down. Without it, the game keeps its own win screen.
const props = defineProps({
    kit: { type: Object, default: null },
});

const fartSoundUrl = usePage().props.fartSoundUrl ?? "/fart.m4a";
const { state, stars, currentFact, startGame, hiss } = useGameState();
const { initAudio, playFart, playVictory } = useSound(fartSoundUrl);

let victoryTimeoutId = null;

watch(
    () => state.showFart,
    (isFarting) => {
        if (victoryTimeoutId !== null) {
            clearTimeout(victoryTimeoutId);
            victoryTimeoutId = null;
        }
        if (isFarting) {
            if (props.kit) {
                props.kit.toot("cockroach", {
                    x: state.cockroachX / 100,
                    y: state.cockroachY / 100,
                });
                return;
            }
            playFart();
            victoryTimeoutId = setTimeout(() => {
                playVictory();
                victoryTimeoutId = null;
            }, 1500);
        }
    }
);

onUnmounted(() => {
    if (victoryTimeoutId !== null) {
        clearTimeout(victoryTimeoutId);
        victoryTimeoutId = null;
    }
});

watch(
    () => state.phase,
    (phase) => {
        if (phase === "win" && props.kit) {
            props.kit.finish({ score: state.score });
        }
    }
);

async function handlePlay() {
    if (!props.kit) await initAudio();
    startGame();
}

useAutoStartGame(handlePlay);
</script>
