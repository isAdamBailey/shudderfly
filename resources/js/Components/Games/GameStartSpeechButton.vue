<script setup>
import { speakGameIntro, stopGameIntroSpeech } from "@/composables/useGameIntroSpeech";
import { computed, onUnmounted, ref } from "vue";

const props = defineProps({
    script: { type: String, required: true },
    variant: {
        type: String,
        default: "cockroach",
        validator: (v) => ["cockroach", "boom", "icon", "panel"].includes(v),
    },
});

const isSpeaking = ref(false);

const variantClass = computed(() => {
    switch (props.variant) {
        case "boom":
            return "inline-block rounded-full border-2 border-white/25 bg-white/10 px-[22px] py-2.5 text-base font-bold text-gray-100";
        case "icon":
            return "flex h-[2.6em] w-[2.6em] items-center justify-center rounded-full border-2 border-white/30 bg-black/40 p-0 text-[clamp(14px,3.2vmin,22px)] text-gray-100";
        case "panel":
            return "inline-block rounded-full border-2 border-white/25 bg-white/10 px-[clamp(18px,4vmin,24px)] py-[clamp(8px,1.8vmin,12px)] text-[clamp(0.9rem,2.6vmin,1.05rem)] font-bold text-gray-100";
        default:
            return "inline-block rounded-[2vmin] border-2 border-white/30 bg-white/12 px-[4vmin] py-[2vmin] text-[3vmin] font-bold text-white";
    }
});

const activeClass = computed(() =>
    isSpeaking.value ? "border-yellow-300 text-yellow-200" : "",
);

function toggle() {
    if (isSpeaking.value) {
        stopGameIntroSpeech();
        isSpeaking.value = false;
        return;
    }
    isSpeaking.value = true;
    speakGameIntro(props.script, () => {
        isSpeaking.value = false;
    });
}

onUnmounted(() => {
    stopGameIntroSpeech();
});
</script>

<template>
    <button
        type="button"
        class="game-intro-speech cursor-pointer touch-manipulation transition-[transform,color,border-color,background-color] duration-200 [-webkit-tap-highlight-color:transparent] active:scale-95"
        :class="[variantClass, activeClass]"
        :aria-label="isSpeaking ? 'Stop instructions' : 'Listen to how to play'"
        @pointerdown.prevent="toggle"
    >
        <template v-if="variant === 'icon'">
            <svg
                v-if="!isSpeaking"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="1em"
                height="1em"
                aria-hidden="true"
            >
                <path
                    d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                />
            </svg>
            <svg
                v-else
                viewBox="0 0 24 24"
                fill="currentColor"
                width="1em"
                height="1em"
                aria-hidden="true"
            >
                <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
        </template>
        <template v-else>
            {{ isSpeaking ? "■ Stop" : "🔊 How to Play" }}
        </template>
    </button>
</template>
