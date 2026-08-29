<template>
    <GameBoard
        v-if="state.phase === 'playing' || state.phase === 'fighting'"
        :state="state"
        @tap="tap"
    />
    <WinScreen
        v-else-if="state.phase === 'win'"
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
import { useTranslations } from "@/composables/useTranslations";

const { t } = useTranslations();
const FIGHT_HISS_INTERVAL_MS = 400;

const { state, stars, currentFact, startGame, tap, cleanup } = useGameState();
const { initAudio, playHiss } = useSound(null);

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

        if (phase === "fighting") {
            playHiss();
            fightHissIntervalId = setInterval(() => {
                playHiss();
            }, FIGHT_HISS_INTERVAL_MS);
        }
    }
);

onUnmounted(() => {
    cleanup();
    clearFightHisses();
});

async function handlePlay() {
    await initAudio();
    startGame();
}

useAutoStartGame(handlePlay);
</script>
