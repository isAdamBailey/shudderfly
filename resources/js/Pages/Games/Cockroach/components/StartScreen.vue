<template>
    <div class="start-screen">
        <div class="start-content">
            <h1 class="game-title">Cockroach Fart</h1>
            <p class="subtitle">Tap the cockroach's head to make it hiss!</p>
            <div class="fun-fact">
                <span class="fact-label">Fun Fact: </span>{{ fact }}
            </div>
            <div class="btn-row">
                <button
                    class="rules-btn"
                    @pointerdown.prevent="speakRules"
                    :class="{ speaking: isSpeaking }"
                >
                    {{ isSpeaking ? "■ Stop" : "🔊 How to Play" }}
                </button>
                <button class="play-btn" @pointerdown.prevent="$emit('play')">
                    Play
                </button>
            </div>
            <div v-if="highScore > 0" class="high-score">
                High Score: {{ highScore }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onUnmounted } from "vue";
import { speakGameRules, stopSpeaking } from "../composables/useSpeech.js";

defineProps({
    fact:      { type: String, required: true },
    highScore: { type: Number, default: 0 },
});

defineEmits(["play"]);

const isSpeaking = ref(false);

function speakRules() {
    if (isSpeaking.value) {
        stopSpeaking();
        isSpeaking.value = false;
        return;
    }
    isSpeaking.value = true;
    speakGameRules(() => {
        isSpeaking.value = false;
    });
}

onUnmounted(() => {
    stopSpeaking();
});
</script>

<style scoped>
.start-screen {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at center, #2a1a0a 0%, #0d0704 100%);
    z-index: 100;
}

.start-content {
    text-align: center;
    padding: 3vmin;
    max-width: 90vw;
}

.game-title {
    font-size: 10vmin;
    font-weight: 900;
    color: #f5a623;
    text-shadow:
        0 3px 0 #8b5e1a,
        0 6px 12px rgba(0, 0, 0, 0.5);
    margin: 0 0 2vmin;
    letter-spacing: 0.02em;
}

.subtitle {
    font-size: 3vmin;
    color: #cba67a;
    margin: 0 0 3vmin;
}

.fun-fact {
    font-size: 2.2vmin;
    color: #e8d5b7;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 1.5vmin;
    padding: 1.5vmin 3vmin;
    margin: 0 auto 4vmin;
    max-width: 70vmin;
    line-height: 1.5;
}

.fact-label {
    font-weight: 700;
    color: #ffcc00;
}

.btn-row {
    display: flex;
    gap: 3vmin;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
}

.play-btn {
    display: inline-block;
    font-size: 4.5vmin;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, #4caf50, #2e7d32);
    border: none;
    border-radius: 2vmin;
    padding: 2vmin 8vmin;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s ease;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}

.play-btn:active { transform: scale(0.95); }

.rules-btn {
    display: inline-block;
    font-size: 3vmin;
    font-weight: 700;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 2vmin;
    padding: 2vmin 4vmin;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}

.rules-btn:active { transform: scale(0.95); }

.rules-btn.speaking {
    border-color: #ffcc00;
    color: #ffcc00;
}

.high-score {
    margin-top: 3vmin;
    font-size: 2.5vmin;
    color: #cba67a;
    font-weight: 600;
}
</style>
