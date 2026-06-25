<script setup>
import { useEmojiRise } from "@/composables/useEmojiRise";

const { particles } = useEmojiRise();

const particleStyle = (particle) => ({
    "--emoji-left": `${particle.left}%`,
    "--emoji-size": `${particle.size}rem`,
    "--emoji-duration": `${particle.duration}s`,
    "--emoji-delay": `${particle.delay}s`,
});
</script>

<template>
    <div class="emoji-rise-overlay" aria-hidden="true">
        <span
            v-for="particle in particles"
            :key="particle.id"
            class="emoji-rise-particle"
            :style="particleStyle(particle)"
        >
            {{ particle.emoji }}
        </span>
    </div>
</template>

<style scoped>
.emoji-rise-overlay {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 60;
}

.emoji-rise-particle {
    position: absolute;
    bottom: -5%;
    left: var(--emoji-left);
    font-size: var(--emoji-size);
    animation: emoji-rise var(--emoji-duration) ease-in var(--emoji-delay) forwards;
}

@keyframes emoji-rise {
    0% {
        transform: translateY(0) scale(0.8);
        opacity: 0;
    }

    10% {
        opacity: 1;
    }

    85% {
        opacity: 1;
    }

    100% {
        transform: translateY(-115vh) scale(1.1);
        opacity: 0;
    }
}

@media (prefers-reduced-motion: reduce) {
    .emoji-rise-particle {
        animation-duration: 0.01ms;
        animation-delay: 0s;
    }
}
</style>
