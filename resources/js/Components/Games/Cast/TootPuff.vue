<script setup>
import { useTranslations } from "@/composables/useTranslations";

// The look of a toot: two 💨 clouds and the translated "toot!", ported from
// Toot Foods. Placed by its caller (see useToot's `puffs`) and gone after
// PUFF_MS; reduced motion fades it in place instead of drifting.
const { t } = useTranslations();
</script>

<template>
    <span class="toot-puff" aria-hidden="true">
        <span class="toot-cloud">💨</span>
        <span class="toot-cloud toot-cloud-2">💨</span>
        <span class="toot-word">{{ t("games.toot_foods.toot_word") }}</span>
    </span>
</template>

<style scoped>
.toot-puff {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
    font-size: clamp(2rem, 8vmin, 3.25rem);
}

.toot-cloud {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -50%);
    animation: toot-cloud 0.7s ease-out forwards;
}

.toot-cloud-2 {
    animation-name: toot-cloud-2;
    opacity: 0.75;
}

.toot-word {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(-50%, -50%);
    font-family: "Spicy Rice", cursive;
    font-size: clamp(1rem, 4vmin, 1.6rem);
    color: #fcd34d;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    animation: toot-word 0.72s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes toot-cloud {
    0% {
        transform: translate(-50%, -50%) scale(0.4);
        opacity: 0;
    }
    25% {
        opacity: 1;
    }
    100% {
        transform: translate(-130%, -130%) scale(1.3);
        opacity: 0;
    }
}

@keyframes toot-cloud-2 {
    0% {
        transform: translate(-50%, -50%) scale(0.4);
        opacity: 0;
    }
    25% {
        opacity: 0.75;
    }
    100% {
        transform: translate(10%, -150%) scale(1.4);
        opacity: 0;
    }
}

@keyframes toot-word {
    0% {
        transform: translate(-50%, -50%) scale(0.5) rotate(-6deg);
        opacity: 0;
    }
    30% {
        transform: translate(-50%, -120%) scale(1.1) rotate(-4deg);
        opacity: 1;
    }
    100% {
        transform: translate(-50%, -260%) scale(1) rotate(-2deg);
        opacity: 0;
    }
}

@keyframes toot-fade {
    0% {
        opacity: 0;
    }
    25% {
        opacity: 1;
    }
    100% {
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .toot-cloud,
    .toot-word {
        animation: toot-fade 0.7s ease-out forwards;
    }

    .toot-word {
        transform: translate(-50%, -150%);
    }
}
</style>
