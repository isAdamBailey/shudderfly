<script setup>
import {
    speakGameIntro,
    stopGameIntroSpeech,
} from "@/composables/useGameIntroSpeech";
import Button from "@/Components/Button.vue";
import { useFocusTrap } from "@/composables/useFocusTrap";
import { useTranslations } from "@/composables/useTranslations";
import { Link } from "@inertiajs/vue3";
import { nextTick, onMounted, onUnmounted, ref } from "vue";

const props = defineProps({
    game: { type: Object, required: true },
});

const emit = defineEmits(["cancel"]);

const { t } = useTranslations();

const panelRef = ref(null);
const playRef = ref(null);

// Three controls now (Listen, Play, Cancel), so the shared trap earns its keep
// over a hand-rolled swap.
const { trapKeydown } = useFocusTrap(panelRef);

const titleId = `game-confirm-title-${props.game.slug}`;

// Link is a component, so its ref is an instance rather than the anchor.
function playEl() {
    return playRef.value?.$el ?? playRef.value;
}

onMounted(() => {
    nextTick(() => playEl()?.focus());
});

function cancel() {
    emit("cancel");
}

const isSpeaking = ref(false);

// Reads the card aloud for players who don't read yet — the same reason every
// game start screen has one.
function toggleSpeech() {
    if (isSpeaking.value) {
        stopGameIntroSpeech();
        isSpeaking.value = false;
        return;
    }
    isSpeaking.value = true;
    speakGameIntro(`${props.game.name}. ${props.game.description}`, () => {
        isSpeaking.value = false;
    });
}

onUnmounted(stopGameIntroSpeech);
</script>

<template>
    <div
        class="game-confirm absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="cancel"
        @keydown.esc.prevent="cancel"
        @keydown="trapKeydown"
    >
        <div
            ref="panelRef"
            class="game-confirm-panel w-full max-w-sm rounded-2xl border-2 border-theme-primary bg-theme-content px-6 py-6 text-center shadow-xl"
        >
            <div class="text-[clamp(3rem,14vmin,4.5rem)] leading-none">
                {{ game.landmark }}
            </div>
            <h2
                :id="titleId"
                class="font-heading mt-1 text-[clamp(1.35rem,5vmin,1.9rem)] font-black leading-tight tracking-wide text-theme-book-title"
            >
                <span aria-hidden="true">{{ game.emoji }}</span>
                {{ game.name }}
            </h2>
            <p
                class="mt-2 text-[clamp(0.9rem,2.6vmin,1.05rem)] font-semibold leading-relaxed text-gray-700"
            >
                {{ game.description }}
            </p>
            <div class="mt-6 flex flex-col items-center gap-3">
                <Link
                    ref="playRef"
                    :href="route('games.show', game.slug)"
                    class="game-confirm-play rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                >
                    <Button type="button" tabindex="-1">
                        {{ t("games.world.play") }}
                    </Button>
                </Link>
                <Button
                    type="button"
                    class="confirm-speak"
                    :is-active="isSpeaking"
                    @click="toggleSpeech"
                >
                    {{
                        isSpeaking
                            ? t("games.world.stop_listening")
                            : t("games.world.listen")
                    }}
                </Button>
                <button
                    type="button"
                    class="confirm-cancel rounded-md px-3 py-1 text-sm font-bold text-theme-book-title underline-offset-2 transition-opacity hover:underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                    @click="cancel"
                >
                    {{ t("games.world.cancel") }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.game-confirm {
    animation: confirmBackdropIn 0.2s ease-out both;
}

.game-confirm-panel {
    animation: confirmPanelIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes confirmBackdropIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes confirmPanelIn {
    from {
        opacity: 0;
        transform: translateY(10px) scale(0.97);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@media (prefers-reduced-motion: reduce) {
    .game-confirm,
    .game-confirm-panel {
        animation: confirmBackdropIn 0.15s ease-out both;
    }
}
</style>
