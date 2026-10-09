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

// The card a thing in the world opens before it takes you out of it (a
// game, a book): a modal over the stage that reads `script` aloud as it
// opens, with one way on (`action`, to `href`) and a way back. No `href`
// means the way on stays in the world: a button that emits `play`. The
// card fills in the rest: what it's about, titled by the element `titleId`.
const props = defineProps({
    titleId: { type: String, required: true },
    script: { type: String, required: true },
    href: { type: String, default: "" },
    action: { type: String, required: true },
});

const emit = defineEmits(["cancel", "play"]);

const { t } = useTranslations();

const panelRef = ref(null);
const actionRef = ref(null);

// The action and Cancel, so the shared trap earns its keep.
const { trapKeydown } = useFocusTrap(panelRef);

onMounted(() => {
    // Link is a component, so its ref is an instance rather than the anchor.
    nextTick(() => (actionRef.value?.$el ?? actionRef.value)?.focus());
    speakGameIntro(props.script);
});

onUnmounted(stopGameIntroSpeech);

const cancel = () => emit("cancel");
</script>

<template>
    <div
        class="world-card absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="cancel"
        @keydown.esc.prevent="cancel"
        @keydown="trapKeydown"
    >
        <div
            ref="panelRef"
            class="world-card-panel w-full max-w-sm rounded-2xl border-2 border-theme-primary bg-theme-content px-6 py-6 text-center shadow-xl"
        >
            <slot />
            <div class="mt-6 flex flex-col items-center gap-3">
                <Button
                    v-if="!href"
                    ref="actionRef"
                    type="button"
                    class="world-card-action"
                    @click="emit('play')"
                >
                    {{ action }}
                </Button>
                <Link
                    v-else
                    ref="actionRef"
                    :href="href"
                    class="world-card-action rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                >
                    <Button type="button" tabindex="-1">
                        {{ action }}
                    </Button>
                </Link>
                <button
                    type="button"
                    class="world-card-cancel rounded-md px-3 py-1 text-sm font-bold text-theme-book-title underline-offset-2 transition-opacity hover:underline hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
                    @click="cancel"
                >
                    {{ t("games.world.cancel") }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.world-card {
    animation: cardBackdropIn 0.2s ease-out both;
}

.world-card-panel {
    animation: cardPanelIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes cardBackdropIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes cardPanelIn {
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
    .world-card,
    .world-card-panel {
        animation: cardBackdropIn 0.15s ease-out both;
    }
}
</style>
