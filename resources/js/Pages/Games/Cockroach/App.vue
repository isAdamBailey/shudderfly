<template>
    <StartScreen
        v-if="state.phase === 'start'"
        :fact="currentFact"
        :high-score="state.highScore"
        @play="handlePlay"
    />
    <GameBoard
        v-else-if="state.phase === 'playing'"
        :state="state"
        @hiss="hiss"
    />
    <WinScreen
        v-else-if="state.phase === 'win'"
        :score="state.score"
        :stars="stars"
        :fact="currentFact"
        :is-new-high="state.score >= state.highScore && state.score > 0"
        @play-again="handlePlay"
    />
</template>

<script setup>
import { watch, onUnmounted } from "vue";

import StartScreen from "./components/StartScreen.vue";
import GameBoard   from "./components/GameBoard.vue";
import WinScreen   from "./components/WinScreen.vue";
import { useGameState } from "./composables/useGameState.js";
import { useSound }     from "./composables/useSound.js";

const { state, stars, currentFact, startGame, hiss } = useGameState();
const { initAudio, playFart, playVictory }            = useSound();

let victoryTimeoutId = null;

watch(() => state.showFart, (isFarting) => {
    if (victoryTimeoutId !== null) {
        clearTimeout(victoryTimeoutId);
        victoryTimeoutId = null;
    }
    if (isFarting) {
        playFart();
        victoryTimeoutId = setTimeout(() => {
            playVictory();
            victoryTimeoutId = null;
        }, 1500);
    }
});

onUnmounted(() => {
    if (victoryTimeoutId !== null) {
        clearTimeout(victoryTimeoutId);
        victoryTimeoutId = null;
    }
});

async function handlePlay() {
    await initAudio();
    startGame();
}
</script>
