<template>
    <GameBoard
        v-if="state.phase === 'playing' || state.phase === 'fighting'"
        :state="state"
        :kit="kit"
        @tap="tap"
    />
</template>

<script setup>
import { onMounted, onUnmounted, watch } from "vue";

import GameBoard from "./components/GameBoard.vue";
import { useGameState } from "./composables/useGameState.js";

// Over the world, in the Cockroach's Nest (GameHost). The kit is the only way
// it reaches the world: the score and the hiss.
const props = defineProps({
    kit: { type: Object, required: true },
});

const FIGHT_HISS_INTERVAL_MS = 400;

const { state, startGame, tap, cleanup } = useGameState();

const hiss = () => props.kit.playSound("hiss");

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

        if (phase === "win") {
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

onMounted(startGame);
</script>
