<template>
    <div class="game-board" @pointerdown.stop>
        <div class="hud">
            <span class="hud-label">Taps:</span>
            <span class="hud-value">{{ state.tapCount }}</span>
        </div>
        <CockroachSprite
            :x="state.leftX"
            :y="state.leftY"
            :is-hissing="state.leftHissing"
            :fighting="state.leftFighting"
            :disabled="state.phase !== 'playing'"
            @head-tap="handleTap('left')"
        />
        <CockroachSprite
            :x="state.rightX"
            :y="state.rightY"
            :is-hissing="state.rightHissing"
            :flipped="true"
            :fighting="state.rightFighting"
            :disabled="state.phase !== 'playing'"
            @head-tap="handleTap('right')"
        />
        <div
            v-if="state.tapCount === 0 && state.phase === 'playing'"
            class="tap-hint"
        >
            Tap a head! <span class="hint-arrow">&#x1F447;</span>
        </div>
        <div v-if="state.phase === 'fighting'" class="fight-label">FIGHT!</div>
    </div>
</template>

<script setup>
import CockroachSprite from "../../Cockroach/components/CockroachSprite.vue";
import { useSound } from "../../Cockroach/composables/useSound.js";

defineProps({
    state: { type: Object, required: true },
});

const emit = defineEmits(["tap"]);

const { playHiss } = useSound(null);

function handleTap(side) {
    emit("tap", side);
    playHiss();
}
</script>

<style scoped>
.game-board {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #3e2723 0%, #5d4037 30%, #6d4c41 60%, #8d6e63 100%);
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
}

.hud {
    position: absolute;
    top: 2vmin;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    display: flex;
    align-items: baseline;
    gap: 0.4em;
    background: rgba(0, 0, 0, 0.35);
    border-radius: 999px;
    padding: 0.5em 1.2em;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
    font-size: clamp(0.9rem, 3vmin, 1.2rem);
    pointer-events: none;
}

.hud-value {
    font-variant-numeric: tabular-nums;
    color: #fde68a;
}

.tap-hint {
    position: absolute;
    left: 50%;
    top: 70%;
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

.fight-label {
    position: absolute;
    left: 50%;
    top: 15%;
    transform: translateX(-50%);
    font-size: clamp(2rem, 8vmin, 4rem);
    font-weight: 900;
    color: #fde68a;
    text-shadow: 0 0 20px rgba(253, 230, 138, 0.6), 0 4px 12px rgba(0, 0, 0, 0.5);
    animation: fightPulse 0.4s ease-in-out infinite alternate;
    pointer-events: none;
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

@keyframes fightPulse {
    0%   { transform: translateX(-50%) scale(1); }
    100% { transform: translateX(-50%) scale(1.08); }
}
</style>
