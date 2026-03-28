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
            <div class="stars-row">
                <span v-for="i in 3" :key="i" class="star" :class="{ filled: i <= stars }">
                    &#9733;
                </span>
            </div>
        </template>
        <div class="collision-stat">
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

const {
    state, segments, totalHeight, elapsedSeconds,
    stars, progress, startGame, movePoop, getPassageAt, POOP_RADIUS,
} = useGameState();
const { initAudio, playFart } = useSound();

watch(() => state.phase, (phase) => {
    if (phase === "win") playFart();
});

async function handlePlay() {
    await initAudio();
    startGame();
}
</script>

<style scoped>
.stars-row {
    margin-bottom: 0.5em;
}

.star {
    font-size: clamp(1.8rem, 7vmin, 2.8rem);
    color: #444;
    margin: 0 0.15em;
    transition: color 0.3s, transform 0.3s;
}

.star.filled {
    color: #ffd700;
    text-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
    animation: starPop 0.4s ease-out;
}

.collision-stat {
    font-size: clamp(0.8rem, 2.2vmin, 0.95rem);
    color: #e8d5b7;
    background: rgba(255, 255, 255, 0.08);
    border-radius: clamp(10px, 1.5vmin, 14px);
    padding: clamp(8px, 1.2vmin, 12px) clamp(14px, 2.5vmin, 20px);
    margin: 0 auto 0.5em;
}

@keyframes starPop {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
}
</style>
