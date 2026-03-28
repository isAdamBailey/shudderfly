<template>
    <GameEndScreen
        title="You Win!"
        :score="score"
        game-slug="cockroach"
        @play-again="$emit('play-again')"
    >
        <template #above-score>
            <div class="stars-row">
                <span v-for="i in 3" :key="i" class="star" :class="{ filled: i <= stars }">
                    &#9733;
                </span>
            </div>
        </template>
        <div v-if="isNewHigh" class="new-high">New High Score!</div>
        <div class="fun-fact">
            <span class="fact-label">Fun Fact: </span>{{ fact }}
        </div>
    </GameEndScreen>
</template>

<script setup>
import GameEndScreen from "@/Components/Games/GameEndScreen.vue";

defineProps({
    score: { type: Number, required: true },
    stars: { type: Number, required: true },
    fact: { type: String, required: true },
    isNewHigh: { type: Boolean, default: false },
});

defineEmits(["play-again"]);
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

.new-high {
    font-size: clamp(0.9rem, 3vmin, 1.2rem);
    font-weight: 700;
    color: #ffcc00;
    animation: pulse 0.8s ease-in-out infinite alternate;
    margin-bottom: 0.5em;
}

.fun-fact {
    font-size: clamp(0.8rem, 2.2vmin, 0.95rem);
    color: #e8d5b7;
    background: rgba(255, 255, 255, 0.08);
    border-radius: clamp(10px, 1.5vmin, 14px);
    padding: clamp(10px, 1.5vmin, 14px) clamp(14px, 2.5vmin, 20px);
    margin: 0 auto 0.5em;
    max-width: 32rem;
    line-height: 1.5;
    text-align: left;
}

.fact-label {
    font-weight: 700;
    color: #ffcc00;
}

@keyframes starPop {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
}

@keyframes pulse {
    from { opacity: 0.7; }
    to { opacity: 1; }
}
</style>
