<script setup>
import { speakGameIntro, stopGameIntroSpeech } from "@/composables/useGameIntroSpeech";
import { ref, onUnmounted } from "vue";

const props = defineProps({
    script: { type: String, required: true },
    variant: {
        type: String,
        default: "cockroach",
        validator: (v) => ["cockroach", "boom", "icon", "panel"].includes(v),
    },
});

const isSpeaking = ref(false);

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
        class="game-intro-speech"
        :class="[`game-intro-speech--${variant}`, { 'game-intro-speech--active': isSpeaking }]"
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

<style scoped>
.game-intro-speech {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s, border-color 0.2s, color 0.2s;
}

.game-intro-speech:active {
    transform: scale(0.95);
}

.game-intro-speech--cockroach {
    display: inline-block;
    font-size: 3vmin;
    font-weight: 700;
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 2vmin;
    padding: 2vmin 4vmin;
}

.game-intro-speech--cockroach.game-intro-speech--active {
    border-color: #ffcc00;
    color: #ffcc00;
}

.game-intro-speech--boom {
    display: inline-block;
    font-size: 1rem;
    font-weight: 700;
    color: #fff5e5;
    background: rgba(63, 45, 28, 0.45);
    border: 2px solid rgba(236, 208, 171, 0.45);
    border-radius: 50px;
    padding: 10px 22px;
}

.game-intro-speech--boom.game-intro-speech--active {
    border-color: #ffd54f;
    color: #ffd54f;
}

.game-intro-speech--icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.6em;
    height: 2.6em;
    padding: 0;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.35);
    background: rgba(0, 0, 0, 0.35);
    color: rgba(255, 255, 255, 0.92);
    font-size: clamp(14px, 3.2vmin, 22px);
}

.game-intro-speech--icon.game-intro-speech--active {
    border-color: #ffcc00;
    color: #ffcc00;
}

.game-intro-speech--panel {
    display: inline-block;
    font-size: clamp(0.9rem, 2.6vmin, 1.05rem);
    font-weight: 700;
    color: #fff5e5;
    background: rgba(0, 0, 0, 0.28);
    border: 2px solid rgba(236, 208, 171, 0.45);
    border-radius: 50px;
    padding: clamp(8px, 1.8vmin, 12px) clamp(18px, 4vmin, 24px);
}

.game-intro-speech--panel.game-intro-speech--active {
    border-color: #ffd54f;
    color: #ffd54f;
}
</style>
