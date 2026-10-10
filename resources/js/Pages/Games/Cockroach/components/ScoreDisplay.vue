<template>
    <div class="hud-bar">
        <div class="hud-left">
            <div class="stat-box">
                <span class="stat-label">{{
                    t("games.cockroach.hud_score_label")
                }}</span>
                <span class="stat-value score-value">{{ score }}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">{{
                    t("games.cockroach.hud_hisses_label")
                }}</span>
                <span class="stat-value">{{ hissCount }}</span>
            </div>
        </div>

        <div class="hud-center">
            <Transition name="combo-pop">
                <div
                    v-if="comboCount > 1"
                    :key="comboCount"
                    class="combo-badge"
                >
                    {{
                        t("games.cockroach.combo_label", { count: comboCount })
                    }}
                </div>
            </Transition>
        </div>

        <div class="hud-right">
            <GameStartSpeechButton
                variant="icon"
                :script="t(COCKROACH_INTRO_SCRIPT)"
            />
        </div>
    </div>
</template>

<script setup>
import GameStartSpeechButton from "@/Components/Games/GameStartSpeechButton.vue";
import { COCKROACH_INTRO_SCRIPT } from "@/Pages/Games/shared/introScripts.js";
import { useTranslations } from "@/composables/useTranslations";

const { t } = useTranslations();

defineProps({
    score: { type: Number, default: 0 },
    comboCount: { type: Number, default: 0 },
    hissCount: { type: Number, default: 0 },
});
</script>

<style scoped>
.hud-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: calc(env(safe-area-inset-top, 8px) + 0.35rem) 0.75rem 0.4rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 50;
    user-select: none;
    -webkit-user-select: none;
    background: linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.55) 0%,
        rgba(0, 0, 0, 0.25) 70%,
        transparent 100%
    );
}

.hud-left {
    display: flex;
    gap: 0.6rem;
}

.stat-box {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.4rem;
    padding: 0.2rem 0.55rem;
    min-width: 3.2rem;
}

.stat-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.stat-value {
    font-size: 1.15rem;
    font-weight: 800;
    color: #fff;
    line-height: 1.2;
}

.score-value {
    color: #ffd54f;
}

.hud-center {
    flex: 1;
    display: flex;
    justify-content: center;
    min-height: 1.25rem;
}

.combo-badge {
    font-size: 1.05rem;
    font-weight: 900;
    color: #ff6d00;
    text-shadow: 0 0 8px rgba(255, 109, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
}

.combo-pop-enter-active {
    animation: comboIn 0.3s ease-out;
}
.combo-pop-leave-active {
    animation: comboOut 0.2s ease-in;
}

.hud-right {
    display: flex;
    align-items: center;
}

@keyframes comboIn {
    0% {
        transform: scale(0.3) translateY(8px);
        opacity: 0;
    }
    60% {
        transform: scale(1.25) translateY(-2px);
        opacity: 1;
    }
    100% {
        transform: scale(1) translateY(0);
    }
}

@keyframes comboOut {
    0% {
        opacity: 1;
        transform: scale(1);
    }
    100% {
        opacity: 0;
        transform: scale(0.6) translateY(-6px);
    }
}
</style>
