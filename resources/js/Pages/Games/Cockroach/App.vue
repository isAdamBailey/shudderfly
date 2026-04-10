<template>
    <GameStartScreen
        v-if="state.phase === 'start'"
        title="Cockroach Fart"
        subtitle="Tap the cockroach's head to make it hiss!"
        :intro-script="COCKROACH_INTRO_SCRIPT"
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
import { usePage } from "@inertiajs/vue3";

import GameStartScreen from "@/Components/Games/GameStartScreen.vue";
import GameBoard from "./components/GameBoard.vue";
import { COCKROACH_INTRO_SCRIPT } from "@/Pages/Games/shared/introScripts.js";
import WinScreen   from "./components/WinScreen.vue";
import { useGameState } from "./composables/useGameState.js";
import { useSound }     from "./composables/useSound.js";

const fartSoundUrl = usePage().props.fartSoundUrl ?? "/fart.mp3";
const { state, stars, currentFact, startGame, hiss } = useGameState();
const { initAudio, playFart, playVictory }            = useSound(fartSoundUrl);

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
