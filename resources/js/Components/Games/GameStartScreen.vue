<script setup>
import GameStartSpeechButton from "@/Components/Games/GameStartSpeechButton.vue";
import { Link } from "@inertiajs/vue3";

defineProps({
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    introScript: { type: String, required: true },
    highScore: { type: Number, default: 0 },
    playLabel: { type: String, default: "Play" },
    zIndex: { type: Number, default: 50 },
});

defineEmits(["play"]);
</script>

<template>
    <div
        class="game-start-screen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-start-title"
        :style="{ zIndex }"
    >
        <div class="game-start-inner">
            <div class="game-start-card">
                <div v-if="$slots.media" class="game-start-media">
                    <slot name="media" />
                </div>
                <h1 id="game-start-title" class="game-start-title">{{ title }}</h1>
                <p v-if="subtitle" class="game-start-subtitle">{{ subtitle }}</p>
                <div v-if="$slots.default" class="game-start-body">
                    <slot />
                </div>
                <div v-if="$slots.extra" class="game-start-extra-wrap">
                    <slot name="extra" />
                </div>
                <div class="game-start-actions">
                    <GameStartSpeechButton variant="panel" :script="introScript" />
                    <button
                        type="button"
                        class="game-start-play"
                        @pointerdown.prevent="$emit('play')"
                    >
                        {{ playLabel }}
                    </button>
                </div>
                <p v-if="highScore > 0" class="game-start-high">High score: {{ highScore }}</p>
                <Link :href="route('games.index')" class="game-start-back">← Back to games</Link>
            </div>
        </div>
    </div>
</template>

<style scoped>
.game-start-screen {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(12px, 4vmin, 28px);
    background: rgba(14, 10, 8, 0.78);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
}

.game-start-inner {
    width: 100%;
    max-width: min(36rem, 100%);
}

.game-start-card {
    background: rgba(40, 28, 20, 0.94);
    border: 2px solid rgba(188, 155, 113, 0.5);
    border-radius: clamp(16px, 3vmin, 24px);
    padding: clamp(20px, 4vmin, 40px) clamp(18px, 4vmin, 44px);
    text-align: center;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.game-start-media {
    font-size: clamp(3rem, 12vmin, 5rem);
    line-height: 1;
    margin-bottom: 0.2em;
}

.game-start-title {
    margin: 0 0 0.35em;
    font-size: clamp(1.65rem, 5.5vmin, 2.65rem);
    font-weight: 900;
    color: #f0b74a;
    text-shadow:
        0 2px 0 #6b4e1a,
        0 4px 14px rgba(0, 0, 0, 0.35);
    letter-spacing: 0.02em;
}

.game-start-subtitle {
    margin: 0 0 0.75em;
    font-size: clamp(0.95rem, 2.8vmin, 1.15rem);
    font-weight: 600;
    color: #d4b896;
    line-height: 1.45;
}

.game-start-body {
    margin: 0 0 1rem;
    font-size: clamp(0.9rem, 2.5vmin, 1.05rem);
    color: #e8d4c4;
    line-height: 1.55;
    opacity: 0.95;
}

.game-start-body :deep(p) {
    margin: 0;
}

.game-start-extra-wrap {
    margin: 0 0 1.15rem;
}

.game-start-extra-wrap :deep(.game-start-aside) {
    font-size: clamp(0.82rem, 2.2vmin, 0.98rem);
    color: #e8d5b7;
    background: rgba(255, 255, 255, 0.08);
    border-radius: clamp(10px, 1.5vmin, 14px);
    padding: clamp(10px, 1.5vmin, 14px) clamp(14px, 2.5vmin, 20px);
    line-height: 1.5;
    text-align: left;
    max-width: 32rem;
    margin-left: auto;
    margin-right: auto;
}

.game-start-extra-wrap :deep(.game-start-aside-label) {
    font-weight: 700;
    color: #ffcc00;
}

.game-start-actions {
    display: flex;
    flex-wrap: wrap;
    gap: clamp(10px, 2.5vmin, 14px);
    justify-content: center;
    align-items: center;
}

.game-start-play {
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
}

.game-start-play:active {
    transform: scale(0.95);
}

.game-start-back {
    display: inline-block;
    margin-top: 0.85rem;
    font-size: clamp(0.85rem, 2.3vmin, 0.98rem);
    font-weight: 600;
    color: #c9a87a;
    text-decoration: none;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.15s ease;
}

.game-start-back:hover {
    color: #e8d4c4;
    text-decoration: underline;
}

.game-start-high {
    margin: 1rem 0 0;
    font-size: clamp(0.85rem, 2.2vmin, 1rem);
    color: #c4a574;
    font-weight: 600;
}
</style>
