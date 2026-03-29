<script setup>
import Button from "@/Components/Button.vue";
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
        class="absolute inset-0 flex items-center justify-center touch-manipulation bg-black/75 p-3 backdrop-blur-md sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-start-title"
        :style="{ zIndex }"
    >
        <div class="w-full max-w-xl">
            <div
                class="rounded-2xl border-2 border-theme-primary bg-game-modal px-[clamp(1.125rem,4vmin,2.75rem)] py-[clamp(1.25rem,4vmin,2.5rem)] text-center"
            >
                <div
                    v-if="$slots.media"
                    class="mb-1 text-[clamp(3rem,12vmin,5rem)] leading-none"
                >
                    <slot name="media" />
                </div>
                <h1
                    id="game-start-title"
                    class="font-heading text-game-modal-title text-[clamp(1.65rem,5.5vmin,2.65rem)] font-black leading-tight tracking-wide"
                >
                    {{ title }}
                </h1>
                <p
                    v-if="subtitle"
                    class="mb-3 text-[clamp(0.95rem,2.8vmin,1.15rem)] font-semibold leading-snug text-gray-300"
                >
                    {{ subtitle }}
                </p>
                <div
                    v-if="$slots.default"
                    class="mb-4 text-[clamp(0.9rem,2.5vmin,1.05rem)] leading-relaxed text-gray-300 [&_p]:m-0"
                >
                    <slot />
                </div>
                <div v-if="$slots.extra" class="game-start-extra-wrap mb-4">
                    <slot name="extra" />
                </div>
                <div
                    class="flex flex-wrap items-center justify-center gap-[clamp(0.625rem,2.5vmin,0.875rem)]"
                >
                    <GameStartSpeechButton variant="panel" :script="introScript" />
                    <Button
                        type="button"
                        class="game-start-play active:scale-95 !rounded-full !px-6 !py-2.5 !text-sm !font-extrabold !normal-case !tracking-normal transition-transform sm:!px-8 sm:!py-3 sm:!text-base"
                        @pointerdown.prevent="$emit('play')"
                    >
                        {{ playLabel }}
                    </Button>
                </div>
                <p
                    v-if="highScore > 0"
                    class="mt-4 text-[clamp(0.85rem,2.2vmin,1rem)] font-semibold text-game-modal-accent"
                >
                    High score: {{ highScore }}
                </p>
                <Link
                    :href="route('games.index')"
                    class="mt-3 inline-block touch-manipulation text-[clamp(0.85rem,2.3vmin,0.98rem)] font-semibold text-yellow-300 transition-colors hover:text-yellow-100 hover:underline"
                >
                    ← Back to games
                </Link>
            </div>
        </div>
    </div>
</template>

<style scoped>
.game-start-extra-wrap :deep(.game-start-aside) {
    @apply mx-auto max-w-lg rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-left text-sm leading-relaxed text-gray-300 sm:px-4 sm:py-3 sm:text-[0.98rem];
}

.game-start-extra-wrap :deep(.game-start-aside-label) {
    @apply font-bold text-yellow-300;
}
</style>
