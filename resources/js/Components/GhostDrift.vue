<script setup>
import { usePage } from "@inertiajs/vue3";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const MIN_GAP_MS = 8000;
const MAX_GAP_MS = 25000;

const page = usePage();
const active = computed(() => page.props.theme === "halloween");

const ghosts = ref([]);
let nextId = 0;
let timer = null;

const random = (min, max) => min + Math.random() * (max - min);

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function spawnGhost() {
    if (document.hidden) return;

    ghosts.value.push({
        id: nextId++,
        top: `${random(10, 80)}vh`,
        size: `${random(1.75, 3.5)}rem`,
        duration: `${random(12, 22)}s`,
        reverse: Math.random() < 0.5,
    });
}

function removeGhost(id) {
    ghosts.value = ghosts.value.filter((ghost) => ghost.id !== id);
}

function scheduleNext() {
    timer = setTimeout(() => {
        spawnGhost();
        scheduleNext();
    }, random(MIN_GAP_MS, MAX_GAP_MS));
}

function stop() {
    clearTimeout(timer);
    timer = null;
    ghosts.value = [];
}

function start() {
    if (timer || prefersReducedMotion()) return;
    scheduleNext();
}

onMounted(() => {
    watch(active, (isActive) => (isActive ? start() : stop()), {
        immediate: true,
    });
});

onBeforeUnmount(stop);

const ghostStyle = (ghost) => ({
    "--ghost-top": ghost.top,
    "--ghost-size": ghost.size,
    "--ghost-duration": ghost.duration,
});
</script>

<template>
    <div v-if="active" class="ghost-drift" aria-hidden="true">
        <span
            v-for="ghost in ghosts"
            :key="ghost.id"
            class="ghost-track"
            :class="{ reverse: ghost.reverse }"
            :style="ghostStyle(ghost)"
            @animationend.self="removeGhost(ghost.id)"
        >
            <span class="ghost">👻</span>
        </span>
    </div>
</template>

<style scoped>
.ghost-drift {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 40;
}

.ghost-track {
    position: absolute;
    left: -5rem;
    top: var(--ghost-top);
    font-size: var(--ghost-size);
    line-height: 1;
    animation: ghost-drift-across var(--ghost-duration) linear forwards;
}

.ghost-track.reverse {
    left: auto;
    right: -5rem;
    animation-name: ghost-drift-across-reverse;
}

.ghost {
    display: block;
    opacity: 0.75;
    filter: drop-shadow(0 0 8px rgb(255 255 255 / 0.45));
    animation: ghost-bob 2.4s ease-in-out infinite alternate;
    user-select: none;
}

.ghost-track.reverse .ghost {
    animation-name: ghost-bob-reverse;
}

@keyframes ghost-drift-across {
    to {
        transform: translateX(calc(100vw + 10rem));
    }
}

@keyframes ghost-drift-across-reverse {
    to {
        transform: translateX(calc(-100vw - 10rem));
    }
}

@keyframes ghost-bob {
    from {
        transform: translateY(-12px) rotate(-6deg);
    }

    to {
        transform: translateY(12px) rotate(6deg);
    }
}

@keyframes ghost-bob-reverse {
    from {
        transform: translateY(-12px) rotate(6deg);
    }

    to {
        transform: translateY(12px) rotate(-6deg);
    }
}
</style>
