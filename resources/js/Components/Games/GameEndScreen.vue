<script setup>
import ShareToChatButton from "@/Components/ShareToChatButton.vue";

defineProps({
    title: { type: String, required: true },
    emoji: { type: String, default: "" },
    score: { type: Number, required: true },
    gameSlug: { type: String, required: true },
    playAgainLabel: { type: String, default: "Play Again" },
});

defineEmits(["play-again"]);
</script>

<template>
    <div class="game-end-screen">
        <div class="game-end-content">
            <div v-if="emoji" class="game-end-emoji">{{ emoji }}</div>
            <h1 class="game-end-title">{{ title }}</h1>
            <slot name="above-score" />
            <div class="game-end-score">
                <span>{{ score }}</span>
                <span class="game-end-score-label">point{{ score !== 1 ? "s" : "" }}</span>
            </div>
            <slot />
            <button
                class="game-end-play-again"
                @pointerdown.prevent="$emit('play-again')"
            >
                {{ playAgainLabel }}
            </button>
            <div class="game-end-share">
                <ShareToChatButton :game-slug="gameSlug" :score="score" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.game-end-screen {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(14, 10, 8, 0.75);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 50;
    animation: gameEndFadeIn 0.4s ease-out;
}

.game-end-content {
    text-align: center;
    padding: clamp(20px, 4vmin, 40px) clamp(18px, 4vmin, 44px);
    background: rgba(40, 28, 20, 0.92);
    border: 2px solid rgba(188, 155, 113, 0.45);
    border-radius: clamp(16px, 3vmin, 24px);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
    max-width: min(90vw, 28rem);
}

.game-end-emoji {
    font-size: clamp(3rem, 10vmin, 5rem);
    line-height: 1;
    margin-bottom: 0.3em;
}

.game-end-title {
    font-size: clamp(1.6rem, 6vmin, 2.4rem);
    font-weight: 900;
    color: #f0b74a;
    text-shadow: 0 2px 0 #6b4e1a, 0 4px 14px rgba(0, 0, 0, 0.35);
    margin: 0 0 0.4em;
}

.game-end-score {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.35em;
    margin-bottom: 0.6em;
    color: #fff7eb;
}

.game-end-score span:first-child {
    font-size: clamp(2rem, 7vmin, 3.2rem);
    font-weight: 800;
}

.game-end-score-label {
    font-size: clamp(0.9rem, 2.5vmin, 1.1rem);
    opacity: 0.8;
}

.game-end-play-again {
    display: inline-block;
    font-size: clamp(1rem, 3vmin, 1.2rem);
    font-weight: 800;
    color: #fff;
    background: linear-gradient(135deg, #4caf50, #2e7d32);
    border: none;
    border-radius: 50px;
    padding: clamp(10px, 2vmin, 14px) clamp(24px, 6vmin, 36px);
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    transition: transform 0.15s ease;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    margin-top: 0.5em;
}

.game-end-play-again:active {
    transform: scale(0.95);
}

.game-end-share {
    margin-top: clamp(12px, 3vmin, 20px);
    max-width: min(90vw, 28rem);
    margin-left: auto;
    margin-right: auto;
    touch-action: manipulation;
}

@keyframes gameEndFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>
