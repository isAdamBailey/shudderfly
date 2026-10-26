<script setup>
import { useResizeObserver } from "@vueuse/core";
import { ref, computed, onMounted, onUnmounted, shallowRef, watch } from "vue";
import { GUSTER_CSS_VARS, PIZZA } from "@/constants/characters.js";
import {
    FLOW_MARKS,
    PATH_D,
    EXIT,
    SECTION_PATHS,
    WALL,
    WORLD_HEIGHT,
    WORLD_WIDTH,
} from "../composables/intestinePath.js";
import GusterGlyph from "@/Components/Games/Cast/GusterGlyph.vue";
import PepperoniGlyph from "./PepperoniGlyph.vue";
import { useTranslations } from "@/composables/useTranslations";

const { t } = useTranslations();

const props = defineProps({
    state: { type: Object, required: true },
    elapsedSeconds: { type: Number, required: true },
    progress: { type: Number, required: true },
    poopRadius: { type: Number, required: true },
    controlsEnabled: { type: Boolean, default: true },
    poopVisible: { type: Boolean, default: true },
    showDigestIntro: { type: Boolean, default: false },
});

const emit = defineEmits(["move"]);

const boardEl = ref(null);
const svgEl = ref(null);
const pixelW = ref(400);
const pixelH = ref(600);

// The gut is bigger than the board: the board's shorter side shows this
// much of it, and the camera follows the poop round, across and down.
const VIEW_SPAN = 420;

const view = computed(() => {
    const scale = VIEW_SPAN / Math.min(pixelW.value, pixelH.value);
    return { w: pixelW.value * scale, h: pixelH.value * scale };
});

// Centred on the poop, held inside the world (or centred on it, when the
// board shows more than the whole world in one direction).
function follow(centre, span, world) {
    if (span >= world) return (world - span) / 2;
    return Math.max(0, Math.min(centre - span / 2, world - span));
}

const camera = computed(() => ({
    x: follow(props.state.poopX, view.value.w, WORLD_WIDTH),
    y: follow(props.state.poopY, view.value.h, WORLD_HEIGHT),
}));

const spriteSize = computed(() => props.poopRadius * 2.2);

const svgViewBox = computed(
    () => `${camera.value.x} ${camera.value.y} ${view.value.w} ${view.value.h}`
);

// The tube, stroked in layers: the wall, then its lining in bands lighter
// towards the middle so it reads round whichever way it runs, then folds
// across it (the colon's deep pouches, finer rings in the small
// intestine). Each layer goes on every section before the next, so the
// sections' joins stay open.
const LINING = [
    { width: 1, color: "#c45a60" },
    { width: 0.78, color: "#d4777c" },
    { width: 0.52, color: "#e09498" },
    { width: 0.24, color: "#efb0ad" },
];
const FOLDS = {
    small: { dash: "3 17", color: "rgba(150, 45, 58, 0.28)" },
    large: { dash: "6 40", color: "rgba(130, 35, 50, 0.42)" },
};
const TUBE_STROKES = [
    ...SECTION_PATHS.map((run) => ({
        d: run.d,
        color: "#8b3545",
        width: run.hw * 2 + WALL * 2,
    })),
    ...LINING.flatMap((band) =>
        SECTION_PATHS.map((run) => ({
            d: run.d,
            color: band.color,
            width: run.hw * 2 * band.width,
        }))
    ),
    ...SECTION_PATHS.map((run) => ({
        d: run.d,
        color: FOLDS[run.section].color,
        width: run.hw * 2,
        dash: FOLDS[run.section].dash,
    })),
];

// Little Gusters that tag along behind him, each this far back along the
// way he came (so they stay in the tube), and this big next to him.
const FOLLOWERS = [
    { back: 50, scale: 0.8 },
    { back: 96, scale: 0.68 },
    { back: 138, scale: 0.58 },
];
const TRAIL_STEP = 3;
const TRAIL_MAX = Math.ceil(FOLLOWERS.at(-1).back / TRAIL_STEP) * 2;

// Where he has been, newest first. A new run starts it over, so they
// bunch up behind him at the top.
const trail = shallowRef([]);

watch(
    () => props.state.startTime,
    () => (trail.value = [])
);

watch(
    () => [props.state.poopX, props.state.poopY],
    ([x, y]) => {
        const last = trail.value[0];
        if (last && Math.hypot(x - last.x, y - last.y) < TRAIL_STEP) return;
        trail.value = [{ x, y }, ...trail.value].slice(0, TRAIL_MAX);
    },
    { immediate: true }
);

// The point `back` along the trail behind him (or its far end, if he has
// not come that far yet).
function behind(points, back) {
    let walked = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const gap = Math.hypot(b.x - a.x, b.y - a.y);
        if (walked + gap >= back) {
            const t = (back - walked) / gap;
            return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        }
        walked += gap;
    }
    return points.at(-1);
}

// Farthest first, so nearer ones are drawn over them.
const followers = computed(() => {
    const points = [
        { x: props.state.poopX, y: props.state.poopY },
        ...trail.value,
    ];
    return FOLLOWERS.map(({ back, scale }) => ({
        ...behind(points, back),
        size: spriteSize.value * scale,
    })).reverse();
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
    }
);

// The stomach sits just above where the poop starts, and it drops into place.
const digestIntro = computed(() => {
    const stomachCy = Math.max(108, props.state.poopY - 84);

    return {
        stomachCx: props.state.poopX,
        stomachCy,
        drop: props.state.poopY - stomachCy,
        stomachRx: 86,
        stomachRy: 66,
    };
});

const POINTER_LAG = 0.14;
// His top speed while dragged, a step a frame.
const MAX_DRAG_STEP = 10;

let dragActive = false;
let grabOffset = { x: 0, y: 0 };
// The finger on screen. Its place in the gut is worked out each frame, so a
// finger held still keeps the poop going while the camera follows it.
let lastClient = { x: 0, y: 0 };
let rafId = null;

function scheduleDragTick() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(dragTick);
}

function dragTick() {
    rafId = null;
    if (!dragActive) return;
    const p = clientToSvg(lastClient.x, lastClient.y);
    if (p) {
        const dx = (p.x + grabOffset.x - props.state.poopX) * POINTER_LAG;
        const dy = (p.y + grabOffset.y - props.state.poopY) * POINTER_LAG;
        const step = Math.hypot(dx, dy);
        if (step > 0.06) {
            const cap = Math.min(1, MAX_DRAG_STEP / step);
            emit("move", dx * cap, dy * cap);
        }
    }
    rafId = requestAnimationFrame(dragTick);
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
    lastClient = { x: e.clientX, y: e.clientY };
    try {
        boardEl.value?.setPointerCapture?.(e.pointerId);
    } catch {
        /* ignore */
    }
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
    scheduleDragTick();
}

function onPointerMove(e) {
    if (!dragActive) return;
    e.preventDefault();
    lastClient = { x: e.clientX, y: e.clientY };
}

function onPointerUp(e) {
    try {
        boardEl.value?.releasePointerCapture?.(e.pointerId);
    } catch {
        /* ignore */
    }
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    stopDragLoop();
}

function onKeyDown(e) {
    if (!props.controlsEnabled) return;
    if (props.state.phase !== "playing") return;
    showSteerHint.value = false;
    const step = 9;
    switch (e.key) {
        case "ArrowLeft":
        case "a":
            emit("move", -step, 0);
            break;
        case "ArrowRight":
        case "d":
            emit("move", step, 0);
            break;
        case "ArrowUp":
        case "w":
            emit("move", 0, -step);
            break;
        case "ArrowDown":
        case "s":
            emit("move", 0, step);
            break;
        default:
            return;
    }
    // The arrows would scroll the page; the letters are left to type with.
    if (e.key.startsWith("Arrow")) e.preventDefault();
}

function updateSize() {
    if (!boardEl.value) return;
    const rect = boardEl.value.getBoundingClientRect();
    // Hidden or mid-transition: keep the last size rather than divide by 0.
    if (!rect.width || !rect.height) return;
    pixelW.value = rect.width;
    pixelH.value = rect.height;
}

// The host's window can change size without the browser window doing so.
useResizeObserver(boardEl, updateSize);

onMounted(() => {
    updateSize();
    window.addEventListener("keydown", onKeyDown);
});

onUnmounted(() => {
    stopDragLoop();
    if (steerHintTimer) clearTimeout(steerHintTimer);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
});
</script>

<template>
    <div
        ref="boardEl"
        class="game-board"
        :style="GUSTER_CSS_VARS"
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
                <radialGradient id="anusGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#1a0808" />
                    <stop offset="35%" stop-color="#3d1515" />
                    <stop offset="65%" stop-color="#6b2828" />
                    <stop offset="100%" stop-color="#8b4040" />
                </radialGradient>
            </defs>

            <rect
                :x="camera.x"
                :y="camera.y"
                :width="view.w"
                :height="view.h"
                fill="#0c0406"
            />

            <!-- Never changes: Vue need not diff it as the camera moves. -->
            <g v-once>
                <g fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path
                        v-for="(stroke, i) in TUBE_STROKES"
                        :key="i"
                        :d="stroke.d"
                        :stroke="stroke.color"
                        :stroke-width="stroke.width"
                        :stroke-dasharray="stroke.dash"
                        :stroke-linecap="stroke.dash ? 'butt' : undefined"
                    />
                </g>

                <path
                    v-for="(mark, i) in FLOW_MARKS"
                    :key="`flow-${i}`"
                    class="flow-mark"
                    d="M -7 -11 L 5 0 L -7 11"
                    :transform="`translate(${mark.x} ${mark.y}) rotate(${mark.heading})`"
                />
            </g>

            <ellipse
                :cx="EXIT.x"
                :cy="EXIT.y"
                rx="38"
                ry="22"
                fill="url(#anusGrad)"
                stroke="#4a1212"
                stroke-width="3"
            />
            <ellipse :cx="EXIT.x" :cy="EXIT.y" rx="18" ry="9" fill="#0a0303" />
            <ellipse
                :cx="EXIT.x"
                :cy="EXIT.y - 1"
                rx="10"
                ry="4"
                fill="rgba(100,30,30,0.4)"
            />

            <g v-if="poopVisible" class="followers">
                <g
                    v-for="(f, i) in followers"
                    :key="`follower-${i}`"
                    class="follower"
                    :style="{ animationDelay: `${-i * 0.18}s` }"
                >
                    <GusterGlyph :x="f.x" :y="f.y" :size="f.size" />
                </g>
            </g>

            <GusterGlyph
                v-if="poopVisible"
                class="poop-sprite"
                :x="state.poopX"
                :y="state.poopY"
                :size="spriteSize"
            />

            <g
                v-if="showDigestIntro"
                class="digest-intro-overlay"
                aria-hidden="true"
            >
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
                >
                    {{ PIZZA }}
                </text>
                <text
                    :x="digestIntro.stomachCx"
                    :y="digestIntro.stomachCy"
                    text-anchor="middle"
                    dominant-baseline="central"
                    class="digest-slice digest-slice-b"
                >
                    {{ PIZZA }}
                </text>
                <text
                    :x="digestIntro.stomachCx"
                    :y="digestIntro.stomachCy"
                    text-anchor="middle"
                    dominant-baseline="central"
                    class="digest-slice digest-slice-c"
                >
                    {{ PIZZA }}
                </text>
                <g
                    :transform="`translate(${digestIntro.stomachCx}, ${digestIntro.stomachCy})`"
                >
                    <g class="digest-pepp digest-pepp-a">
                        <g transform="translate(-24, -24) scale(0.5)">
                            <PepperoniGlyph />
                        </g>
                    </g>
                </g>
                <g
                    :transform="`translate(${digestIntro.stomachCx}, ${digestIntro.stomachCy})`"
                >
                    <g class="digest-pepp digest-pepp-b">
                        <g transform="translate(-24, -24) scale(0.5)">
                            <PepperoniGlyph />
                        </g>
                    </g>
                </g>
                <g
                    class="digest-intro-poop"
                    :style="{
                        '--digest-drop': `${digestIntro.drop}px`,
                    }"
                >
                    <GusterGlyph
                        :x="digestIntro.stomachCx"
                        :y="digestIntro.stomachCy"
                        :size="46"
                    />
                </g>
            </g>
        </svg>

        <svg
            class="minimap"
            :viewBox="`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`"
            aria-hidden="true"
        >
            <path
                :d="PATH_D"
                fill="none"
                stroke="rgba(224, 148, 152, 0.55)"
                stroke-width="90"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <rect
                :x="camera.x"
                :y="camera.y"
                :width="view.w"
                :height="view.h"
                fill="none"
                stroke="rgba(255, 255, 255, 0.5)"
                stroke-width="14"
            />
            <circle
                :cx="state.poopX"
                :cy="state.poopY"
                r="44"
                fill="var(--guster-body)"
                stroke="var(--guster-eye-white)"
                stroke-width="12"
            />
        </svg>

        <div class="hud">
            <div class="hud-item">
                <span class="hud-label">{{
                    t("games.costco_pizza_poop.board_wall_hits_label")
                }}</span>
                <span class="hud-value">{{ state.collisions }}</span>
            </div>
            <div class="hud-item progress-wrap">
                <span class="hud-label">{{
                    t("games.costco_pizza_poop.board_progress_label")
                }}</span>
                <div class="progress-bar">
                    <div
                        class="progress-fill"
                        :style="{ transform: `scaleX(${progress})` }"
                    ></div>
                </div>
            </div>
            <div class="hud-item">
                <span class="hud-label">{{
                    t("games.costco_pizza_poop.board_time_label")
                }}</span>
                <span class="hud-value">{{
                    t("games.costco_pizza_poop.board_time_value", {
                        seconds: elapsedSeconds,
                    })
                }}</span>
            </div>
        </div>

        <transition name="steer-hint-fade">
            <div v-if="showSteerHint" class="steer-hint" aria-hidden="true">
                {{ t("games.costco_pizza_poop.steer_hint") }}
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

.flow-mark {
    fill: none;
    stroke: rgba(120, 28, 42, 0.38);
    stroke-width: 5;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
}

.minimap {
    position: absolute;
    right: 10px;
    bottom: 10px;
    z-index: 15;
    width: clamp(64px, 18vmin, 110px);
    height: auto;
    padding: 6px;
    border-radius: 10px;
    background: rgb(var(--guster-base-rgb) / 0.72);
    pointer-events: none;
}

/* One shadow for all of them, not one each. */
.followers {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
    pointer-events: none;
}

.follower {
    transform-box: fill-box;
    transform-origin: center bottom;
    animation: followerBob 0.6s ease-in-out infinite;
}

@keyframes followerBob {
    0%,
    100% {
        transform: translateY(0) scale(1, 1);
    }
    50% {
        transform: translateY(-3px) scale(0.95, 1.06);
    }
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

.digest-pepp {
    transform-box: fill-box;
    transform-origin: center;
}

.digest-pepp-a {
    animation: digestPeppA 1.4s cubic-bezier(0.5, 0, 0.4, 1) forwards;
}

.digest-pepp-b {
    animation: digestPeppB 1.4s cubic-bezier(0.5, 0, 0.4, 1) forwards;
}

.digest-intro-poop {
    opacity: 0;
    filter: drop-shadow(0 0 0 rgba(78, 37, 23, 0));
    animation: digestPoopForm 1.25s cubic-bezier(0.22, 0.78, 0.3, 1) 1.15s
        forwards;
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
    background: rgb(var(--guster-base-rgb) / 0.96);
    color: var(--guster-eye-white);
    font-weight: 700;
    z-index: 20;
    border-bottom: 2px solid var(--guster-body);
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
    background: linear-gradient(90deg, #d4606a, var(--guster-body));
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.15s ease;
}

.steer-hint {
    position: absolute;
    left: 50%;
    bottom: 14%;
    transform: translateX(-50%);
    z-index: 18;
    padding: 8px 16px;
    border-radius: 999px;
    background: rgb(var(--guster-base-rgb) / 0.88);
    color: var(--guster-eye-white);
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

/* Pepperoni sticks join the slices, spiraling inward from the opposite side. */
@keyframes digestPeppA {
    0% {
        opacity: 1;
        transform: translate(-40px, 18px) rotate(24deg) scale(1);
    }
    55% {
        opacity: 1;
        transform: translate(-8px, 4px) rotate(-160deg) scale(0.72);
    }
    82% {
        opacity: 0.85;
        transform: translate(0, 13px) rotate(-290deg) scale(0.36, 0.26);
    }
    100% {
        opacity: 0;
        transform: translate(0, 16px) rotate(-360deg) scale(0.06);
    }
}

@keyframes digestPeppB {
    0% {
        opacity: 1;
        transform: translate(38px, 22px) rotate(-18deg) scale(1);
    }
    55% {
        opacity: 1;
        transform: translate(7px, 5px) rotate(190deg) scale(0.7);
    }
    82% {
        opacity: 0.85;
        transform: translate(0, 13px) rotate(310deg) scale(0.36, 0.26);
    }
    100% {
        opacity: 0;
        transform: translate(0, 16px) rotate(380deg) scale(0.06);
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
        transform: translateY(calc(var(--digest-drop) * 0.18)) scale(0.88, 1.14)
            rotate(-4deg);
        filter: drop-shadow(0 0 10px rgba(120, 60, 30, 0.4));
    }
    74% {
        opacity: 1;
        transform: translateY(calc(var(--digest-drop) * 0.84)) scale(1.08, 0.92)
            rotate(3deg);
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

    .follower {
        animation: none;
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
    .digest-slice-c,
    .digest-pepp-a,
    .digest-pepp-b {
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
