<template>
    <GameStartScreen
        v-if="state.phase === 'start'"
        title="Cockroach Fight"
        subtitle="Tap a cockroach head to bring them together!"
        :intro-script="COCKROACH_FIGHT_INTRO_SCRIPT"
        :high-score="state.highScore"
        @play="handlePlay"
    >
        <template #extra>
            <div class="game-start-aside">
                <span class="game-start-aside-label">Fun fact: </span>{{ currentFact }}
            </div>
        </template>
    </GameStartScreen>
    <GameBoard
        v-else-if="state.phase === 'playing' || state.phase === 'fighting'"
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
import { watch, onUnmounted } from "vue";

import GameStartScreen from "@/Components/Games/GameStartScreen.vue";
import GameBoard from "./components/GameBoard.vue";
import WinScreen from "./components/WinScreen.vue";
import { COCKROACH_FIGHT_INTRO_SCRIPT } from "@/Pages/Games/shared/introScripts.js";
import { useGameState } from "./composables/useGameState.js";
import { useSound } from "../Cockroach/composables/useSound.js";

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
</script>
