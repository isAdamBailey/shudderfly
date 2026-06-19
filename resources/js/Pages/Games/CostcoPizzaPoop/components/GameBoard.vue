<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { Link } from "@inertiajs/vue3";
import { SVG_WIDTH } from "../composables/useGameState.js";

const props = defineProps({
    state: { type: Object, required: true },
    segments: { type: Array, required: true },
    totalHeight: { type: Number, required: true },
    elapsedSeconds: { type: Number, required: true },
    progress: { type: Number, required: true },
    poopRadius: { type: Number, required: true },
    getPassageAt: { type: Function, required: true },
    controlsEnabled: { type: Boolean, default: true },
    poopVisible: { type: Boolean, default: true },
    showDigestIntro: { type: Boolean, default: false },
});

const emit = defineEmits(["move"]);

const boardEl = ref(null);
const svgEl = ref(null);
const pixelW = ref(400);
const pixelH = ref(600);

const svgAspect = computed(() => SVG_WIDTH / pixelW.value);
const svgH = computed(() => pixelH.value * svgAspect.value);

const cameraY = computed(() => {
    return Math.max(0, Math.min(
        props.state.poopY - svgH.value / 2,
        props.totalHeight - svgH.value,
    ));
});

const svgViewBox = computed(() => {
    return `0 ${cameraY.value} ${SVG_WIDTH} ${svgH.value}`;
});

const TOP_EXTEND = 500;

const intestinePaths = computed(() => {
    const segs = props.segments;
    if (segs.length < 2) return { fill: "" };

    const leftPts = segs.map((s) => ({ x: s.leftWall, y: s.y }));
    const rightPts = segs.map((s) => ({ x: s.rightWall, y: s.y }));
    const last = segs[segs.length - 1];
    const exitY = last.y + 120;

    let fill = `M ${leftPts[0].x} ${leftPts[0].y - TOP_EXTEND}`;
    fill += ` L ${leftPts[0].x} ${leftPts[0].y}`;
    fill += ` Q ${leftPts[0].x} ${leftPts[0].y}, ${(leftPts[0].x + leftPts[1].x) / 2} ${(leftPts[0].y + leftPts[1].y) / 2}`;
    for (let i = 1; i < leftPts.length - 1; i++) {
        const cx = (leftPts[i].x + leftPts[i + 1].x) / 2;
        const cy = (leftPts[i].y + leftPts[i + 1].y) / 2;
        fill += ` Q ${leftPts[i].x} ${leftPts[i].y}, ${cx} ${cy}`;
    }
    fill += ` Q ${leftPts[leftPts.length - 1].x} ${leftPts[leftPts.length - 1].y}, ${leftPts[leftPts.length - 1].x} ${exitY}`;
    fill += ` L ${rightPts[rightPts.length - 1].x} ${exitY}`;
    fill += ` Q ${rightPts[rightPts.length - 1].x} ${rightPts[rightPts.length - 1].y}, ${(rightPts[rightPts.length - 1].x + rightPts[rightPts.length - 2].x) / 2} ${(rightPts[rightPts.length - 1].y + rightPts[rightPts.length - 2].y) / 2}`;
    for (let i = rightPts.length - 2; i > 0; i--) {
        const cx = (rightPts[i].x + rightPts[i - 1].x) / 2;
        const cy = (rightPts[i].y + rightPts[i - 1].y) / 2;
        fill += ` Q ${rightPts[i].x} ${rightPts[i].y}, ${cx} ${cy}`;
    }
    fill += ` Q ${rightPts[0].x} ${rightPts[0].y}, ${rightPts[0].x} ${rightPts[0].y}`;
    fill += ` L ${rightPts[0].x} ${rightPts[0].y - TOP_EXTEND} Z`;

    return { fill };
});

const anusCenter = computed(() => {
    const last = props.segments[props.segments.length - 1];
    return { x: last.centerX, y: last.y + 100 };
});

const showSteerHint = ref(false);
let steerHintTimer = null;

watch(
    () => props.controlsEnabled,
    (enabled) => {
        if (!enabled) return;
        showSteerHint.value = true;
        if (steerHintTimer) clearTimeout(steerHintTimer);
        steerHintTimer = window.setTimeout(() => {
            showSteerHint.value = false;
            steerHintTimer = null;
        }, 2600);
    },
);

const digestIntro = computed(() => {
    const targetX = props.state.poopX || SVG_WIDTH / 2;
    const targetY = props.state.poopY || 232;
    const stomachCy = Math.max(108, targetY - 84);

    return {
        targetX,
        targetY,
        stomachCx: targetX,
        stomachCy,
        stomachRx: 86,
        stomachRy: 66,
    };
});

const POINTER_LAG = 0.14;

let dragActive = false;
let grabOffset = { x: 0, y: 0 };
let lastTarget = { x: 0, y: 0 };
let rafId = null;

function scheduleDragTick() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(dragTick);
}

function dragTick() {
    rafId = null;
    if (!dragActive) return;
    const rawDx = lastTarget.x - props.state.poopX;
    const rawDy = lastTarget.y - props.state.poopY;
    if (Math.abs(rawDx) > 0.06 || Math.abs(rawDy) > 0.06) {
        emit("move", rawDx * POINTER_LAG, rawDy * POINTER_LAG);
    }
    if (dragActive) {
        rafId = requestAnimationFrame(dragTick);
    }
}

function stopDragLoop() {
    dragActive = false;
    if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

function clientToSvg(clientX, clientY) {
    const svg = svgEl.value;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
}

function onPointerDown(e) {
    if (!props.controlsEnabled) return;
    if (props.state.phase !== "playing") return;
    e.preventDefault();
    showSteerHint.value = false;
    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    dragActive = true;
    grabOffset = {
        x: props.state.poopX - p.x,
        y: props.state.poopY - p.y,
    };
    lastTarget = {
        x: p.x + grabOffset.x,
        y: p.y + grabOffset.y,
    };
    try {
        boardEl.value?.setPointerCapture?.(e.pointerId);
    } catch {
        /* ignore */
    }
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    scheduleDragTick();
}

function onPointerMove(e) {
    if (!dragActive) return;
    e.preventDefault();
    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    lastTarget = {
        x: p.x + grabOffset.x,
        y: p.y + grabOffset.y,
    };
}

function onPointerUp(e) {
    try {
        boardEl.value?.releasePointerCapture?.(e.pointerId);
    } catch {
        /* ignore */
    }
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    stopDragLoop();
}

function onKeyDown(e) {
    if (!props.controlsEnabled) return;
    if (props.state.phase !== "playing") return;
    showSteerHint.value = false;
    const step = 7;
    switch (e.key) {
        case "ArrowLeft":
        case "a":
            emit("move", -step, 0);
            break;
        case "ArrowRight":
        case "d":
            emit("move", step, 0);
            break;
        case "ArrowDown":
        case "s":
            emit("move", 0, step);
            break;
    }
}

function updateSize() {
    if (!boardEl.value) return;
    const rect = boardEl.value.getBoundingClientRect();
    pixelW.value = rect.width;
    pixelH.value = rect.height;
}

onMounted(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
    stopDragLoop();
    if (steerHintTimer) clearTimeout(steerHintTimer);
    window.removeEventListener("resize", updateSize);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
});
</script>

<template>
    <div
        ref="boardEl"
        class="game-board"
        :class="{ 'game-board-locked': !controlsEnabled }"
        @pointerdown="onPointerDown"
    >
        <svg
            ref="svgEl"
            class="intestine-svg"
            :viewBox="svgViewBox"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <linearGradient id="mucosaGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#c45a60" />
                    <stop offset="25%" stop-color="#e09498" />
                    <stop offset="50%" stop-color="#efb0ad" />
                    <stop offset="75%" stop-color="#e09498" />
                    <stop offset="100%" stop-color="#c45a60" />
                </linearGradient>
                <radialGradient id="anusGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#1a0808" />
                    <stop offset="35%" stop-color="#3d1515" />
                    <stop offset="65%" stop-color="#6b2828" />
                    <stop offset="100%" stop-color="#8b4040" />
                </radialGradient>
            </defs>

            <rect
                x="0"
                :y="cameraY"
                :width="SVG_WIDTH"
                :height="svgH"
                fill="#0c0406"
            />

            <path
                :d="intestinePaths.fill"
                fill="#6b2535"
                stroke="#8b3545"
                stroke-width="16"
                stroke-linejoin="round"
            />

            <path
                :d="intestinePaths.fill"
                fill="url(#mucosaGrad)"
            />

            <ellipse
                :cx="anusCenter.x"
                :cy="anusCenter.y"
                rx="38"
                ry="22"
                fill="url(#anusGrad)"
                stroke="#4a1212"
                stroke-width="3"
            />
            <ellipse
                :cx="anusCenter.x"
                :cy="anusCenter.y"
                rx="18"
                ry="9"
                fill="#0a0303"
            />
            <ellipse
                :cx="anusCenter.x"
                :cy="anusCenter.y - 1"
                rx="10"
                ry="4"
                fill="rgba(100,30,30,0.4)"
            />

            <text
                v-if="poopVisible"
                :x="state.poopX"
                :y="state.poopY"
                text-anchor="middle"
                dominant-baseline="central"
                :font-size="poopRadius * 2.2"
                class="poop-sprite"
            >💩</text>

            <g v-if="showDigestIntro" class="digest-intro-overlay" aria-hidden="true">
                <ellipse
                    :cx="digestIntro.stomachCx"
                    :cy="digestIntro.stomachCy"
                    :rx="digestIntro.stomachRx"
                    :ry="digestIntro.stomachRy"
                    class="digest-stomach-shell"
                />
                <ellipse
                    :cx="digestIntro.stomachCx"
                    :cy="digestIntro.stomachCy - 4"
                    :rx="digestIntro.stomachRx * 0.72"
                    :ry="digestIntro.stomachRy * 0.62"
                    class="digest-stomach-inner"
                />
                <text
                    :x="digestIntro.stomachCx"
                    :y="digestIntro.stomachCy"
                    text-anchor="middle"
                    dominant-baseline="central"
                    class="digest-slice digest-slice-a"
                >🍕</text>
                <text
                    :x="digestIntro.stomachCx"
                    :y="digestIntro.stomachCy"
                    text-anchor="middle"
                    dominant-baseline="central"
                    class="digest-slice digest-slice-b"
                >🍕</text>
                <text
                    :x="digestIntro.stomachCx"
                    :y="digestIntro.stomachCy"
                    text-anchor="middle"
                    dominant-baseline="central"
                    class="digest-slice digest-slice-c"
                >🍕</text>
                <text
                    :x="digestIntro.stomachCx"
                    :y="digestIntro.stomachCy"
                    text-anchor="middle"
                    dominant-baseline="central"
                    class="digest-intro-poop"
                    :style="{ '--digest-drop': `${digestIntro.targetY - digestIntro.stomachCy}px` }"
                >💩</text>
            </g>
        </svg>

        <div class="hud">
            <div class="hud-item">
                <span class="hud-label">Wall hits</span>
                <span class="hud-value">{{ state.collisions }}</span>
            </div>
            <div class="hud-item progress-wrap">
                <span class="hud-label">Progress</span>
                <div class="progress-bar">
                    <div
                        class="progress-fill"
                        :style="{ transform: `scaleX(${progress})` }"
                    ></div>
                </div>
            </div>
            <div class="hud-item">
                <span class="hud-label">Time</span>
                <span class="hud-value">{{ elapsedSeconds }}s</span>
            </div>
        </div>

        <Link
            :href="route('games.index')"
            class="game-quit"
            aria-label="Quit to games"
        >✕</Link>

        <transition name="steer-hint-fade">
            <div v-if="showSteerHint" class="steer-hint" aria-hidden="true">
                Drag to steer 👇
            </div>
        </transition>
    </div>
</template>

<style scoped>
.game-board {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #0c0406;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: grab;
}

.game-board:active {
    cursor: grabbing;
}

.game-board-locked,
.game-board-locked:active {
    cursor: default;
}

.intestine-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
}

.poop-sprite {
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.7));
    pointer-events: none;
}

.digest-intro-overlay {
    pointer-events: none;
}

.digest-stomach-shell {
    fill: rgba(122, 34, 50, 0.45);
    stroke: rgba(244, 170, 152, 0.65);
    stroke-width: 4;
    transform-box: fill-box;
    transform-origin: center;
    animation: digestChurn 0.85s ease-in-out infinite;
}

.digest-stomach-inner {
    fill: rgba(255, 208, 164, 0.2);
    stroke: rgba(255, 188, 158, 0.25);
    stroke-width: 2;
    transform-box: fill-box;
    transform-origin: center;
    animation: digestChurnGlow 1.8s ease-in-out infinite;
}

.digest-slice,
.digest-intro-poop {
    font-size: 52px;
    line-height: 1;
    transform-box: fill-box;
    transform-origin: center;
}

.digest-slice-a {
    animation: digestSliceA 1.4s cubic-bezier(0.5, 0, 0.4, 1) forwards;
}

.digest-slice-b {
    animation: digestSliceB 1.4s cubic-bezier(0.5, 0, 0.4, 1) forwards;
}

.digest-slice-c {
    animation: digestSliceC 1.4s cubic-bezier(0.5, 0, 0.4, 1) forwards;
}

.digest-intro-poop {
    opacity: 0;
    filter: drop-shadow(0 0 0 rgba(78, 37, 23, 0));
    animation: digestPoopForm 1.25s cubic-bezier(0.22, 0.78, 0.3, 1) 1.15s forwards;
}

.hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: rgba(30, 8, 12, 0.96);
    color: #f0d0c0;
    font-weight: 700;
    z-index: 20;
    border-bottom: 2px solid rgba(160, 60, 70, 0.5);
    pointer-events: none;
}

.hud-label {
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.7;
    display: block;
    text-align: center;
}

.hud-value {
    font-size: 1.2rem;
    display: block;
    text-align: center;
}

.progress-wrap {
    flex: 1;
    max-width: 140px;
    margin: 0 12px;
}

.progress-bar {
    height: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.12);
    overflow: hidden;
    margin-top: 3px;
}

.progress-fill {
    width: 100%;
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #d4606a, #4caf50);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.15s ease;
}

.game-quit {
    position: absolute;
    top: 6px;
    left: 8px;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: rgba(20, 6, 8, 0.7);
    color: #f0d0c0;
    font-size: 1.1rem;
    line-height: 1;
    text-decoration: none;
    pointer-events: auto;
    transition: background-color 0.15s ease;
}

.game-quit:hover {
    background: rgba(160, 60, 70, 0.7);
}

.game-quit:focus-visible {
    outline: 2px solid #fbbf24;
    outline-offset: 2px;
}

.steer-hint {
    position: absolute;
    left: 50%;
    bottom: 14%;
    transform: translateX(-50%);
    z-index: 18;
    padding: 8px 16px;
    border-radius: 999px;
    background: rgba(20, 6, 8, 0.82);
    color: #ffe9d6;
    font-size: clamp(0.95rem, 3vmin, 1.2rem);
    font-weight: 800;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
}

.steer-hint-fade-enter-active,
.steer-hint-fade-leave-active {
    transition: opacity 0.3s ease;
}

.steer-hint-fade-enter-from,
.steer-hint-fade-leave-to {
    opacity: 0;
}

/* Stomach kneading the slices into a churning mass. */
@keyframes digestChurn {
    0%,
    100% {
        transform: scale(1, 1);
    }
    32% {
        transform: scale(1.07, 0.91);
    }
    64% {
        transform: scale(0.94, 1.08);
    }
}

/* Inner belly churns and brightens as the mass forms (~70% = the moment poop emerges). */
@keyframes digestChurnGlow {
    0% {
        transform: scale(1, 1);
        opacity: 0.18;
    }
    40% {
        transform: scale(1.05, 0.95);
        opacity: 0.34;
    }
    70% {
        transform: scale(0.95, 1.07);
        opacity: 0.72;
    }
    100% {
        transform: scale(1, 1);
        opacity: 0.28;
    }
}

/* Slices spiral inward and compress into the belly — moderate spin, downward bias. */
@keyframes digestSliceA {
    0% {
        opacity: 1;
        transform: translate(-34px, -22px) rotate(-14deg) scale(1);
    }
    55% {
        opacity: 1;
        transform: translate(-10px, 0) rotate(170deg) scale(0.76);
    }
    82% {
        opacity: 0.85;
        transform: translate(0, 12px) rotate(300deg) scale(0.4, 0.3);
    }
    100% {
        opacity: 0;
        transform: translate(0, 16px) rotate(360deg) scale(0.06);
    }
}

@keyframes digestSliceB {
    0% {
        opacity: 1;
        transform: translate(32px, -14px) rotate(16deg) scale(1);
    }
    55% {
        opacity: 1;
        transform: translate(9px, 1px) rotate(-180deg) scale(0.78);
    }
    82% {
        opacity: 0.85;
        transform: translate(0, 12px) rotate(-320deg) scale(0.4, 0.3);
    }
    100% {
        opacity: 0;
        transform: translate(0, 16px) rotate(-380deg) scale(0.06);
    }
}

@keyframes digestSliceC {
    0% {
        opacity: 1;
        transform: translate(2px, 26px) rotate(-20deg) scale(0.96);
    }
    55% {
        opacity: 1;
        transform: translate(1px, 6px) rotate(200deg) scale(0.74);
    }
    82% {
        opacity: 0.85;
        transform: translate(0, 13px) rotate(330deg) scale(0.38, 0.28);
    }
    100% {
        opacity: 0;
        transform: translate(0, 16px) rotate(400deg) scale(0.06);
    }
}

/* Poop forms in the belly with a squash-pop, then oozes down to its start. */
@keyframes digestPoopForm {
    0% {
        opacity: 0;
        transform: translateY(0) scale(0.08, 0.12) rotate(-18deg);
        filter: drop-shadow(0 0 0 rgba(120, 60, 30, 0));
    }
    22% {
        opacity: 1;
        transform: translateY(0) scale(1.22, 0.82) rotate(6deg);
        filter: drop-shadow(0 0 16px rgba(150, 80, 40, 0.55));
    }
    40% {
        opacity: 1;
        transform: translateY(calc(var(--digest-drop) * 0.18)) scale(0.88, 1.14) rotate(-4deg);
        filter: drop-shadow(0 0 10px rgba(120, 60, 30, 0.4));
    }
    74% {
        opacity: 1;
        transform: translateY(calc(var(--digest-drop) * 0.84)) scale(1.08, 0.92) rotate(3deg);
        filter: drop-shadow(0 0 6px rgba(78, 37, 23, 0.3));
    }
    100% {
        opacity: 1;
        transform: translateY(var(--digest-drop)) scale(1, 1) rotate(0deg);
        filter: drop-shadow(0 0 0 rgba(78, 37, 23, 0));
    }
}

@media (prefers-reduced-motion: reduce) {
    .progress-fill {
        transition: none;
    }

    .digest-stomach-shell,
    .digest-stomach-inner {
        animation: none;
    }

    .digest-stomach-inner {
        opacity: 0.4;
    }

    .digest-slice-a,
    .digest-slice-b,
    .digest-slice-c {
        animation: digestSliceFade 0.7s ease forwards;
    }

    .digest-intro-poop {
        animation: digestPoopFade 0.5s ease 0.9s forwards;
    }

    .steer-hint-fade-enter-active,
    .steer-hint-fade-leave-active {
        transition: opacity 0.2s ease;
    }
}

@keyframes digestSliceFade {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

@keyframes digestPoopFade {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}
</style>
