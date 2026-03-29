<script setup>
import Button from "@/Components/Button.vue";
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
    <div
        class="game-end-screen absolute inset-0 z-50 flex touch-manipulation items-center justify-center bg-black/75 backdrop-blur-sm"
    >
        <div
            class="max-w-[min(90vw,28rem)] rounded-2xl border-2 border-theme-primary bg-game-modal px-[clamp(1.125rem,4vmin,2.75rem)] py-[clamp(1.25rem,4vmin,2.5rem)] text-center"
        >
            <div
                v-if="emoji"
                class="game-end-emoji mb-2 text-[clamp(3rem,10vmin,5rem)] leading-none"
            >
                {{ emoji }}
            </div>
            <h1
                class="font-heading text-game-modal-title mb-2 text-[clamp(1.6rem,6vmin,2.4rem)] font-black leading-tight"
            >
                {{ title }}
            </h1>
            <slot name="above-score" />
            <div class="mb-2 flex items-baseline justify-center gap-[0.35em] text-gray-100">
                <span class="text-[clamp(2rem,7vmin,3.2rem)] font-extrabold tabular-nums">{{
                    score
                }}</span>
                <span
                    class="game-end-score-label text-[clamp(0.9rem,2.5vmin,1.1rem)] text-gray-400"
                    >point{{ score !== 1 ? "s" : "" }}</span
                >
            </div>
            <slot />
            <Button
                type="button"
                data-testid="game-end-play-again"
                class="game-end-play-again mt-2 active:scale-95 !rounded-full !px-6 !py-2.5 !text-sm !font-extrabold !normal-case !tracking-normal transition-transform sm:!px-8 sm:!py-3 sm:!text-base"
                @pointerdown.prevent="$emit('play-again')"
            >
                {{ playAgainLabel }}
            </Button>
            <div
                class="mx-auto mt-3 max-w-[min(90vw,28rem)] touch-manipulation sm:mt-5"
            >
                <ShareToChatButton :game-slug="gameSlug" :score="score" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.game-end-screen {
    animation: gameEndFadeIn 0.4s ease-out;
}

@keyframes gameEndFadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
</style>
