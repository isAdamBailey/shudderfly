<template>
    <div class="game-board" @pointerdown.stop>
        <ScoreDisplay
            :score="state.score"
            :combo-count="state.comboCount"
            :hiss-count="state.hissCount"
        />
        <img src="/img/toilet.png" alt="Toilet" class="toilet-img" draggable="false" />
        <CockroachSprite
            :x="state.cockroachX"
            :y="state.cockroachY"
            :is-hissing="state.isHissing"
            :rotation="state.cockroachRotation"
            @head-tap="handleHiss"
        />
        <FartCloud :visible="state.showFart" />
        <div
            v-if="state.hissCount === 0"
            class="tap-hint"
            :style="{ left: state.cockroachX + '%', top: (state.cockroachY - 12) + '%' }"
        >
            Tap the head! <span class="hint-arrow">&#x1F447;</span>
        </div>
    </div>
</template>

<script setup>
import CockroachSprite from "./CockroachSprite.vue";
import FartCloud       from "./FartCloud.vue";
import ScoreDisplay    from "./ScoreDisplay.vue";
import { useSound }    from "../composables/useSound.js";

defineProps({
    state: { type: Object, required: true },
});

const emit = defineEmits(["hiss"]);

const { playHiss } = useSound();

function handleHiss(direction) {
    emit("hiss", direction);
    playHiss();
}

function handleBoardTap() {
    // no-op: captures stray taps on the board
}
</script>

<style scoped>
.toilet-img {
    position: absolute;
    right: 2%;
    top: 50%;
    transform: translateY(-50%);
    width: 18vmin;
    height: auto;
    z-index: 5;
    pointer-events: none;
    user-select: none;
    -webkit-user-select: none;
    filter: drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.3));
}

.game-board {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #3e2723 0%, #5d4037 30%, #6d4c41 60%, #8d6e63 100%);
    overflow: hidden;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
}

.tap-hint {
    position: absolute;
    transform: translate(-50%, 0);
    font-size: 3vmin;
    color: rgba(255, 255, 255, 0.85);
    font-weight: 700;
    animation: hintBounce 1.2s ease-in-out infinite;
    pointer-events: none;
    white-space: nowrap;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    z-index: 40;
}

.hint-arrow {
    display: inline-block;
    animation: hintBob 0.8s ease-in-out infinite;
}

@keyframes hintBounce {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
}

@keyframes hintBob {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(6px); }
}
</style>
