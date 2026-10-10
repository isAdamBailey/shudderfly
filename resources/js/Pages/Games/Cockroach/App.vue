<template>
    <GameBoard
        v-if="state.phase === 'playing'"
        :state="state"
        :kit="kit"
        @hiss="hiss"
    />
</template>

<script setup>
import { onMounted, watch } from "vue";

import GameBoard from "./components/GameBoard.vue";
import { useGameState } from "./composables/useGameState.js";

// Over the world, in the Cockroach's Nest (GameHost). The kit is the only way
// it reaches the world: the score, the fart, the hiss, and whether motion
// should stay down.
const props = defineProps({
    kit: { type: Object, required: true },
});

const { state, startGame, hiss } = useGameState();

watch(
    () => state.showFart,
    (isFarting) => {
        if (isFarting) {
            props.kit.toot("cockroach", {
                x: state.cockroachX / 100,
                y: state.cockroachY / 100,
            });
        }
    }
);

watch(
    () => state.phase,
    (phase) => {
        if (phase === "win") props.kit.finish({ score: state.score });
    }
);

onMounted(startGame);
</script>
