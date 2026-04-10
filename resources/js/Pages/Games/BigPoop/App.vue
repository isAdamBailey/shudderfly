<template>
    <GameStartScreen
        v-if="state.phase === 'start'"
        title="Big Poop"
        subtitle="Guide the poop through the intestine!"
        :intro-script="BIG_POOP_INTRO_SCRIPT"
        @play="handlePlay"
    >
        <template #media>💩</template>
        <p>
            Drag to move the poop left, right, and down.<br />
            Avoid the walls — fewer collisions means a higher score!
        </p>
    </GameStartScreen>
    <GameBoard
        v-else-if="state.phase === 'playing'"
        :state="state"
        :segments="segments"
        :total-height="totalHeight"
        :elapsed-seconds="elapsedSeconds"
        :progress="progress"
        :poop-radius="POOP_RADIUS"
        :get-passage-at="getPassageAt"
        @move="movePoop"
    />
    <GameEndScreen
        v-else-if="state.phase === 'win'"
        title="You Made It!"
        emoji="🎉"
        :score="state.score"
        game-slug="big-poop"
        @play-again="handlePlay"
    >
        <template #above-score>
            <div class="mb-2">
                <span
                    v-for="i in 3"
                    :key="i"
                    class="game-star inline-block text-[clamp(1.8rem,7vmin,2.8rem)] text-gray-600 transition-colors duration-300 dark:text-gray-500 mx-[0.15em]"
                    :class="{
                        'game-star-filled text-yellow-300 drop-shadow-[0_0_12px_rgba(253,224,71,0.45)]':
                            i <= stars,
                    }"
                >
                    &#9733;
                </span>
            </div>
        </template>
        <div
            class="collision-stat mx-auto mb-2 max-w-lg rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-gray-300 sm:px-4 sm:py-2.5 sm:text-[0.95rem]"
        >
            Wall hits: {{ state.collisions }} | Time: {{ elapsedSeconds }}s
        </div>
    </GameEndScreen>
</template>

<script setup>
import GameStartScreen from "@/Components/Games/GameStartScreen.vue";
import GameEndScreen from "@/Components/Games/GameEndScreen.vue";
import GameBoard from "./components/GameBoard.vue";
import { BIG_POOP_INTRO_SCRIPT } from "@/Pages/Games/shared/introScripts.js";
import { useGameState } from "./composables/useGameState.js";
import { useSound } from "./composables/useSound.js";
import { watch } from "vue";
import { usePage } from "@inertiajs/vue3";

const fartSoundUrl = usePage().props.fartSoundUrl ?? "/fart.m4a";
const {
    state, segments, totalHeight, elapsedSeconds,
    stars, progress, startGame, movePoop, getPassageAt, POOP_RADIUS,
} = useGameState();
const { initAudio, playFart } = useSound(fartSoundUrl);

watch(() => state.phase, (phase) => {
    if (phase === "win") playFart();
});

async function handlePlay() {
    await initAudio();
    startGame();
}
</script>

<style scoped>
.game-star-filled {
    animation: starPop 0.4s ease-out;
}

@keyframes starPop {
    0% {
        transform: scale(0);
    }
    60% {
        transform: scale(1.3);
    }
    100% {
        transform: scale(1);
    }
}
</style>
