<template>
    <GameBoard
        v-if="state.phase === 'playing' || state.phase === 'fighting'"
        :state="state"
        :kit="kit"
        @tap="tap"
    />
    <WinScreen
        v-else-if="state.phase === 'win' && !kit"
        :score="state.score"
        :stars="stars"
        :tap-count="state.tapCount"
        :fact="currentFact"
        :is-new-high="state.score >= state.highScore && state.score > 0"
        @play-again="handlePlay"
    />
</template>

<script setup>
import { onUnmounted, watch } from "vue";

import GameBoard from "./components/GameBoard.vue";
import WinScreen from "./components/WinScreen.vue";
import { useGameState } from "./composables/useGameState.js";
import { useSound } from "../Cockroach/composables/useSound.js";
import { useAutoStartGame } from "@/composables/useAutoStartGame";

// With `kit`, over the world (GameHost). The kit is the only way it reaches
// the world: the score and the hiss. Without it, the game keeps its own
// win screen.
const props = defineProps({
    kit: { type: Object, default: null },
});

const FIGHT_HISS_INTERVAL_MS = 400;

const { state, stars, currentFact, startGame, tap, cleanup } = useGameState();
const { initAudio, playHiss } = useSound(null);

function hiss() {
    if (props.kit) props.kit.playSound("hiss");
    else playHiss();
}

let fightHissIntervalId = null;

function clearFightHisses() {
    if (fightHissIntervalId !== null) {
        clearInterval(fightHissIntervalId);
        fightHissIntervalId = null;
    }
}

watch(
    () => state.phase,
    (phase) => {
        clearFightHisses();

        if (phase === "win" && props.kit) {
            props.kit.finish({ score: state.score });
            return;
        }

        if (phase === "fighting") {
            hiss();
            fightHissIntervalId = setInterval(hiss, FIGHT_HISS_INTERVAL_MS);
        }
    }
);

onUnmounted(() => {
    cleanup();
    clearFightHisses();
});

async function handlePlay() {
    if (!props.kit) await initAudio();
    startGame();
}

useAutoStartGame(handlePlay);
</script>
