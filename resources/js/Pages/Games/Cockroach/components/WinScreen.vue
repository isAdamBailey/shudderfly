<template>
    <GameEndScreen
        title="You Win!"
        :score="score"
        game-slug="cockroach"
        @play-again="$emit('play-again')"
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
            v-if="isNewHigh"
            class="mb-2 animate-pulse text-center text-[clamp(0.9rem,3vmin,1.2rem)] font-bold text-yellow-200"
        >
            New High Score!
        </div>
        <div
            class="mx-auto mb-2 max-w-lg rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-left text-sm leading-relaxed text-gray-300 sm:px-4 sm:py-3 sm:text-[0.95rem]"
        >
            <span class="font-bold text-yellow-300">Fun Fact: </span>{{ fact }}
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
