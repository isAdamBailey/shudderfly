<template>
    <div class="win-screen">
        <div class="win-content">
            <h1 class="win-title">You Win!</h1>
            <div class="stars-row">
                <span v-for="i in 3" :key="i" class="star" :class="{ filled: i <= stars }">
                    &#9733;
                </span>
            </div>
            <div class="final-score">{{ score }}</div>
            <div v-if="isNewHigh" class="new-high">New High Score!</div>
            <div class="fun-fact">
                <span class="fact-label">Fun Fact: </span>{{ fact }}
            </div>
            <button class="play-again-btn" @pointerdown.prevent="$emit('play-again')">
                Play Again
            </button>
            <div class="share-wrap">
                <ShareToChatButton game-slug="cockroach" :score="score" />
            </div>
        </div>
    </div>
</template>

<script setup>
import ShareToChatButton from "@/Components/ShareToChatButton.vue";

defineProps({
    score:    { type: Number,  required: true },
    stars:    { type: Number,  required: true },
    fact:     { type: String,  required: true },
    isNewHigh: { type: Boolean, default: false },
});

defineEmits(["play-again"]);
</script>

<style scoped>
.win-screen {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at center, #1a2a0a 0%, #040d07 100%);
    z-index: 100;
    animation: fadeIn 0.5s ease-out;
}

.win-content {
    text-align: center;
    padding: 3vmin;
}

.win-title {
    font-size: 10vmin;
    font-weight: 900;
    color: #4caf50;
    text-shadow:
        0 3px 0 #1b5e20,
        0 6px 12px rgba(0, 0, 0, 0.5);
    margin: 0 0 2vmin;
}

.stars-row { margin-bottom: 2vmin; }

.star {
    font-size: 7vmin;
    color: #444;
    margin: 0 0.5vmin;
    transition: color 0.3s, transform 0.3s;
}

.star.filled {
    color: #ffd700;
    text-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
    animation: starPop 0.4s ease-out;
}

.final-score {
    font-size: 5vmin;
    font-weight: 800;
    color: #fff;
    margin-bottom: 1vmin;
}

.new-high {
    font-size: 3vmin;
    font-weight: 700;
    color: #ffcc00;
    animation: pulse 0.8s ease-in-out infinite alternate;
    margin-bottom: 2vmin;
}

.fun-fact {
    font-size: 2.2vmin;
    color: #c5e1a5;
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

.play-again-btn {
    display: inline-block;
    font-size: 4.5vmin;
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, #f5a623, #e65100);
    border: none;
    border-radius: 2vmin;
    padding: 2vmin 8vmin;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    transition: transform 0.15s ease;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
}

.play-again-btn:active { transform: scale(0.95); }

.share-wrap {
    margin-top: 3vmin;
    max-width: min(90vw, 28rem);
    margin-left: auto;
    margin-right: auto;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
}

@keyframes starPop {
    0%   { transform: scale(0); }
    60%  { transform: scale(1.3); }
    100% { transform: scale(1); }
}

@keyframes pulse {
    from { opacity: 0.7; }
    to   { opacity: 1; }
}
</style>
