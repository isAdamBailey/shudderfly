<template>
    <GameBoard v-if="state.phase === 'playing'" :state="state" @hiss="hiss" />
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
import { onUnmounted, watch } from "vue";
import { usePage } from "@inertiajs/vue3";

import GameBoard from "./components/GameBoard.vue";
import WinScreen from "./components/WinScreen.vue";
import { useGameState } from "./composables/useGameState.js";
import { useSound } from "./composables/useSound.js";
import { useAutoStartGame } from "@/composables/useAutoStartGame";
import { useTranslations } from "@/composables/useTranslations";

const { t } = useTranslations();
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

async function handlePlay() {
    await initAudio();
    startGame();
}

useAutoStartGame(handlePlay);
</script>
