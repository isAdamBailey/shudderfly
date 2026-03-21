<template>
    <div class="hud-bar">
        <div class="hud-left">
            <div class="stat-box">
                <span class="stat-label">SCORE</span>
                <span class="stat-value score-value">{{ score }}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">HISSES</span>
                <span class="stat-value">{{ hissCount }}</span>
            </div>
        </div>

        <div class="hud-center">
            <Transition name="combo-pop">
                <div v-if="comboCount > 1" :key="comboCount" class="combo-badge">
                    {{ comboCount }}x Combo!
                </div>
            </Transition>
        </div>

        <div class="hud-right">
            <button
                class="help-btn"
                @pointerdown.prevent="speakRules"
                :class="{ speaking: isSpeaking }"
            >
                <svg v-if="!isSpeaking" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
                    <path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref, onUnmounted } from "vue";
import { speakGameRules, stopSpeaking } from "../composables/useSpeech.js";

defineProps({
    score:      { type: Number, default: 0 },
    comboCount: { type: Number, default: 0 },
    hissCount:  { type: Number, default: 0 },
});

const isSpeaking = ref(false);

function speakRules() {
    if (isSpeaking.value) {
        stopSpeaking();
        isSpeaking.value = false;
        return;
    }
    isSpeaking.value = true;
    speakGameRules(() => {
        isSpeaking.value = false;
    });
}

onUnmounted(() => {
    stopSpeaking();
});
</script>

<style scoped>
.hud-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: calc(env(safe-area-inset-top, 8px) + 1vmin) 2.5vmin 1.2vmin;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 50;
    user-select: none;
    -webkit-user-select: none;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.25) 70%, transparent 100%);
}

.hud-left {
    display: flex;
    gap: 2.5vmin;
}

.stat-box {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.2vmin;
    padding: 0.6vmin 1.8vmin;
    min-width: 10vmin;
}

.stat-label {
    font-size: 1.4vmin;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.stat-value {
    font-size: 3.2vmin;
    font-weight: 800;
    color: #fff;
    line-height: 1.2;
}

.score-value { color: #ffd54f; }

.hud-center {
    flex: 1;
    display: flex;
    justify-content: center;
    min-height: 4vmin;
}

.combo-badge {
    font-size: 3vmin;
    font-weight: 900;
    color: #ff6d00;
    text-shadow:
        0 0 8px rgba(255, 109, 0, 0.5),
        0 1px 3px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
}

.combo-pop-enter-active { animation: comboIn 0.3s ease-out; }
.combo-pop-leave-active { animation: comboOut 0.2s ease-in; }

.hud-right {
    display: flex;
    align-items: center;
}

.help-btn {
    font-size: 3vmin;
    width: 5.5vmin;
    height: 5.5vmin;
    border-radius: 1.2vmin;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(0, 0, 0, 0.35);
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.help-btn:active { background: rgba(255, 255, 255, 0.15); }

.help-btn.speaking {
    border-color: #ffd54f;
    color: #ffd54f;
    background: rgba(255, 213, 79, 0.15);
}

@keyframes comboIn {
    0%   { transform: scale(0.3) translateY(8px); opacity: 0; }
    60%  { transform: scale(1.25) translateY(-2px); opacity: 1; }
    100% { transform: scale(1) translateY(0); }
}

@keyframes comboOut {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.6) translateY(-6px); }
}
</style>
