<template>
    <div
        class="cockroach-wrapper"
        :style="wrapperStyle"
    >
        <div class="hit-area head-area" @pointerdown.prevent="onHeadTap($event)"></div>
        <img
            src="/img/cockroach.png"
            alt="Madagascar hissing cockroach"
            class="cockroach-img"
            :class="{ hissing: isHissing }"
            draggable="false"
        />
        <HissEffect v-if="isHissing" />
    </div>
</template>

<script setup>
import { computed } from "vue";
import HissEffect from "./HissEffect.vue";

const props = defineProps({
    x:         { type: Number,  required: true },
    y:         { type: Number,  required: true },
    rotation:  { type: Number,  default: 0 },
    isHissing: { type: Boolean, default: false },
});

const emit = defineEmits(["head-tap"]);

const wrapperStyle = computed(() => ({
    left:      `${props.x}%`,
    top:       `${props.y}%`,
    transform: `translate(-50%, -50%) rotate(${props.rotation}deg)`,
}));

function onHeadTap(event) {
    if (navigator.vibrate) {
        navigator.vibrate(30);
    }
    const rect      = event.currentTarget.getBoundingClientRect();
    const tapY      = event.clientY - rect.top;
    const direction = tapY < rect.height / 2 ? "up" : "down";
    emit("head-tap", direction);
}
</script>

<style scoped>
.cockroach-wrapper {
    position: absolute;
    width: 28vmin;
    height: auto;
    transition: left 0.35s ease-out, top 0.35s ease-out, transform 0.35s ease-out;
    z-index: 10;
    user-select: none;
    -webkit-user-select: none;
}

.cockroach-img {
    width: 100%;
    height: auto;
    display: block;
    pointer-events: none;
    filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.5));
}

.cockroach-img.hissing {
    animation: wiggle 0.15s ease-in-out 5;
}

.hit-area {
    position: absolute;
    z-index: 20;
    cursor: pointer;
}

.head-area {
    right: 0;
    top: 10%;
    width: 45%;
    height: 80%;
    border-radius: 50%;
}

@keyframes wiggle {
    0%, 100% { transform: rotate(0deg); }
    25%       { transform: rotate(-4deg) scale(1.03); }
    75%       { transform: rotate(4deg)  scale(1.03); }
}
</style>
