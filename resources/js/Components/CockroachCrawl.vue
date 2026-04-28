<script setup>
import { usePage } from "@inertiajs/vue3";
import { computed } from "vue";

const props = defineProps({
    area: {
        type: String,
        default: "header",
        validator: (value) => ["header", "footer"].includes(value),
    },
});

const enabled = computed(() => {
    const value = usePage().props.settings?.cockroaches_enabled;
    return value === "1" || value === 1 || value === true;
});

const headerRoaches = [
    { top: "18%", size: "1.65rem", duration: "16s", delay: "-2s" },
    { top: "52%", size: "1.25rem", duration: "20s", delay: "-12s", reverse: true },
    { top: "72%", size: "1.45rem", duration: "18s", delay: "-7s" },
    { top: "34%", size: "1.1rem", duration: "23s", delay: "-17s", reverse: true },
];

const footerRoaches = [
    { top: "14%", size: "1.8rem", duration: "22s", delay: "-5s" },
    { top: "28%", size: "1.3rem", duration: "18s", delay: "-14s", reverse: true },
    { top: "48%", size: "1.55rem", duration: "25s", delay: "-9s" },
    { top: "64%", size: "1.2rem", duration: "20s", delay: "-2s", reverse: true },
    { top: "78%", size: "1.45rem", duration: "24s", delay: "-19s" },
    { top: "38%", size: "1.05rem", duration: "17s", delay: "-11s", reverse: true },
];

const roaches = computed(() =>
    props.area === "footer" ? footerRoaches : headerRoaches
);

const roachStyle = (roach) => ({
    "--cockroach-top": roach.top,
    "--cockroach-size": roach.size,
    "--cockroach-duration": roach.duration,
    "--cockroach-delay": roach.delay,
});
</script>

<template>
    <div
        v-if="enabled"
        class="cockroach-crawl"
        aria-hidden="true"
    >
        <span
            v-for="(roach, index) in roaches"
            :key="`${area}-${index}`"
            class="cockroach-track"
            :class="{ reverse: roach.reverse }"
            :style="roachStyle(roach)"
        >
            <img
                src="/img/cockroach.png"
                alt=""
                class="cockroach"
                draggable="false"
            />
        </span>
    </div>
</template>

<style scoped>
.cockroach-crawl {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 50;
}

.cockroach-track {
    position: absolute;
    left: -4rem;
    top: var(--cockroach-top);
    width: var(--cockroach-size);
    animation: cockroach-crawl-across var(--cockroach-duration) linear infinite;
    animation-delay: var(--cockroach-delay);
}

.cockroach-track.reverse {
    left: auto;
    right: -4rem;
    animation-name: cockroach-crawl-across-reverse;
}

.cockroach {
    display: block;
    width: 100%;
    height: auto;
    opacity: 0.78;
    filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.45));
    animation: cockroach-scuttle 0.45s ease-in-out infinite alternate;
    user-select: none;
}

.cockroach-track.reverse .cockroach {
    animation-name: cockroach-scuttle-reverse;
}

@keyframes cockroach-crawl-across {
    from {
        transform: translateX(0);
    }

    to {
        transform: translateX(calc(100vw + 8rem));
    }
}

@keyframes cockroach-crawl-across-reverse {
    from {
        transform: translateX(0);
    }

    to {
        transform: translateX(calc(-100vw - 8rem));
    }
}

@keyframes cockroach-scuttle {
    from {
        transform: translateY(-1px) rotate(5deg);
    }

    to {
        transform: translateY(1px) rotate(-5deg);
    }
}

@keyframes cockroach-scuttle-reverse {
    from {
        transform: translateY(-1px) scaleX(-1) rotate(5deg);
    }

    to {
        transform: translateY(1px) scaleX(-1) rotate(-5deg);
    }
}

@media (prefers-reduced-motion: reduce) {
    .cockroach-track,
    .cockroach {
        animation-duration: 60s;
    }
}
</style>
