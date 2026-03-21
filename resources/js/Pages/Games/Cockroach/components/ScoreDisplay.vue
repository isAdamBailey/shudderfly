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
            <GameStartSpeechButton
                variant="icon"
                :script="COCKROACH_INTRO_SCRIPT"
            />
        </div>
    </div>
</template>

<script setup>
import GameStartSpeechButton from "@/Components/Games/GameStartSpeechButton.vue";
import { COCKROACH_INTRO_SCRIPT } from "@/Pages/Games/shared/introScripts.js";

defineProps({
    score:      { type: Number, default: 0 },
    comboCount: { type: Number, default: 0 },
    hissCount:  { type: Number, default: 0 },
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
