<script setup>
import Button from "@/Components/Button.vue";
import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import { Link } from "@inertiajs/vue3";

defineProps({
    title: { type: String, required: true },
    emoji: { type: String, default: "" },
    score: { type: Number, required: true },
    gameSlug: { type: String, required: true },
    playAgainLabel: { type: String, default: "Play Again" },
});

const emit = defineEmits(["play-again"]);

function playAgain() {
    emit("play-again");
}
</script>

<template>
    <div
        class="game-end-screen fixed inset-x-0 bottom-0 top-16 z-40 flex touch-manipulation items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
    >
        <div
            class="game-modal-panel max-w-[min(90vw,28rem)] rounded-2xl border-2 border-theme-primary bg-game-modal px-[clamp(1.125rem,4vmin,2.75rem)] py-[clamp(1.25rem,4vmin,2.5rem)] text-center"
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
                @pointerdown.prevent="playAgain"
                @keydown.enter.prevent="playAgain"
                @keydown.space.prevent="playAgain"
            >
                {{ playAgainLabel }}
            </Button>
            <div
                class="mx-auto mt-3 max-w-[min(90vw,28rem)] touch-manipulation sm:mt-5"
            >
                <ShareToChatButton :game-slug="gameSlug" :score="score" />
            </div>
            <Link
                :href="route('games.index')"
                class="mt-4 inline-block touch-manipulation rounded-md text-[clamp(0.85rem,2.3vmin,0.98rem)] font-semibold text-game-modal-accent transition-[color,opacity] hover:underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
                ← Back to games
            </Link>
        </div>
    </div>
</template>

<style scoped>
.game-end-screen {
    animation: gameModalBackdropIn 0.25s ease-out both;
}

.game-modal-panel {
    animation: gameModalPanelIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.game-end-emoji {
    animation: gameModalEmojiIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
}

@keyframes gameModalBackdropIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes gameModalPanelIn {
    from {
        opacity: 0;
        transform: translateY(12px) scale(0.97);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@keyframes gameModalEmojiIn {
    from {
        opacity: 0;
        transform: scale(0.6) rotate(-8deg);
    }
    to {
        opacity: 1;
        transform: scale(1) rotate(0);
    }
}

@media (prefers-reduced-motion: reduce) {
    .game-end-screen,
    .game-modal-panel,
    .game-end-emoji {
        animation: gameModalBackdropIn 0.2s ease-out both;
    }
}
</style>
