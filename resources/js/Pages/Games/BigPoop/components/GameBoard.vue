<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { SVG_WIDTH } from "../composables/useGameState.js";

const props = defineProps({
    state: { type: Object, required: true },
    segments: { type: Array, required: true },
    totalHeight: { type: Number, required: true },
    elapsedSeconds: { type: Number, required: true },
    progress: { type: Number, required: true },
    poopRadius: { type: Number, required: true },
    getPassageAt: { type: Function, required: true },
});

const emit = defineEmits(["move"]);

const boardEl = ref(null);
const pixelW = ref(400);
const pixelH = ref(600);

const svgAspect = computed(() => SVG_WIDTH / pixelW.value);
const svgH = computed(() => pixelH.value * svgAspect.value);

const cameraY = computed(() => {
    return Math.max(0, Math.min(
        props.state.poopY - svgH.value / 2,
        props.totalHeight - svgH.value
    ));
});

const svgViewBox = computed(() => {
    return `0 ${cameraY.value} ${SVG_WIDTH} ${svgH.value}`;
});

const TOP_EXTEND = 500;

function buildSmoothPath(segs, getSide) {
    if (segs.length < 2) return "";
    const pts = segs.map((s) => ({ x: getSide(s), y: s.y }));

    let d = `M ${pts[0].x} ${pts[0].y - TOP_EXTEND}`;
    d += ` L ${pts[0].x} ${pts[0].y}`;
    d += ` Q ${pts[0].x} ${pts[0].y}, ${(pts[0].x + pts[1].x) / 2} ${(pts[0].y + pts[1].y) / 2}`;

    for (let i = 1; i < pts.length - 1; i++) {
        const curr = pts[i];
        const next = pts[i + 1];
        const cx = (curr.x + next.x) / 2;
        const cy = (curr.y + next.y) / 2;
        d += ` Q ${curr.x} ${curr.y}, ${cx} ${cy}`;
    }

    const last = pts[pts.length - 1];
    d += ` Q ${last.x} ${last.y}, ${last.x} ${last.y + 30}`;
    return d;
}

const intestinePaths = computed(() => {
    const segs = props.segments;
    if (segs.length < 2) return { left: "", right: "", fill: "" };

    const leftPath = buildSmoothPath(segs, (s) => s.leftWall);
    const rightPath = buildSmoothPath(segs, (s) => s.rightWall);

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

    return { left: leftPath, right: rightPath, fill };
});

const haustraFolds = computed(() => {
    const folds = [];
    const segs = props.segments;
    for (let i = 1; i < segs.length - 1; i += 2) {
        const s = segs[i];
        const width = s.rightWall - s.leftWall;
        const bulgeFactor = 0.12;
        folds.push({
            y: s.y,
            leftX: s.leftWall,
            rightX: s.rightWall,
            cpLeftX: s.leftWall + width * bulgeFactor,
            cpRightX: s.rightWall - width * bulgeFactor,
        });
    }
    return folds;
});

const anusCenter = computed(() => {
    const last = props.segments[props.segments.length - 1];
    return { x: last.centerX, y: last.y + 100 };
});

const progressBarWidth = computed(() => `${(props.progress * 100).toFixed(1)}%`);

let dragActive = false;
let lastPointer = { x: 0, y: 0 };

function onPointerDown(e) {
    if (props.state.phase !== "playing") return;
    e.preventDefault();
    dragActive = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
}

function onPointerMove(e) {
    if (!dragActive) return;
    e.preventDefault();
    const scale = svgAspect.value;
    const dx = (e.clientX - lastPointer.x) * scale;
    const dy = (e.clientY - lastPointer.y) * scale;
    lastPointer = { x: e.clientX, y: e.clientY };
    emit("move", dx, dy);
}

function onPointerUp() {
    dragActive = false;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
}

function onKeyDown(e) {
    if (props.state.phase !== "playing") return;
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
    window.removeEventListener("resize", updateSize);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
});
</script>

<template>
    <div class="game-board" ref="boardEl" @pointerdown="onPointerDown">
        <svg
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
                <filter id="organicTexture" x="-5%" y="-5%" width="110%" height="110%">
                    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.04" numOctaves="5" seed="3" result="noise" />
                    <feColorMatrix type="saturate" values="0.3" in="noise" result="tintedNoise" />
                    <feBlend in="SourceGraphic" in2="tintedNoise" mode="soft-light" />
                </filter>
                <clipPath id="intestineClip">
                    <path :d="intestinePaths.fill" />
                </clipPath>
                <radialGradient id="anusGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="#1a0808" />
                    <stop offset="35%" stop-color="#3d1515" />
                    <stop offset="65%" stop-color="#6b2828" />
                    <stop offset="100%" stop-color="#8b4040" />
                </radialGradient>
            </defs>

            <!-- dark body cavity background -->
            <rect
                x="0" :y="cameraY"
                :width="SVG_WIDTH" :height="svgH"
                fill="#0c0406"
            />

            <!-- outer muscle wall (same shape, thick stroke behind fill) -->
            <path
                :d="intestinePaths.fill"
                fill="#6b2535"
                stroke="#8b3545"
                stroke-width="16"
                stroke-linejoin="round"
            />

            <!-- inner mucosa layer -->
            <path
                :d="intestinePaths.fill"
                fill="url(#mucosaGrad)"
                filter="url(#organicTexture)"
            />

            <!-- interior details clipped to the tube shape -->
            <g clip-path="url(#intestineClip)">
                <!-- haustra folds (circular ridges) -->
                <g v-for="(fold, i) in haustraFolds" :key="'fold-' + i" opacity="0.25">
                    <path
                        :d="`M ${fold.leftX} ${fold.y - 4} Q ${fold.cpLeftX} ${fold.y}, ${fold.leftX} ${fold.y + 4}`"
                        fill="none"
                        stroke="#c07080"
                        stroke-width="1.5"
                        stroke-linecap="round"
                    />
                    <path
                        :d="`M ${fold.rightX} ${fold.y - 4} Q ${fold.cpRightX} ${fold.y}, ${fold.rightX} ${fold.y + 4}`"
                        fill="none"
                        stroke="#c07080"
                        stroke-width="1.5"
                        stroke-linecap="round"
                    />
                </g>

                <!-- vein details -->
                <g v-for="(seg, i) in segments" :key="'vein-' + i">
                    <path
                        v-if="i % 3 === 0"
                        :d="`M ${seg.leftWall + 3} ${seg.y - 8} Q ${seg.leftWall + 10} ${seg.y} ${seg.leftWall + 5} ${seg.y + 10}`"
                        fill="none"
                        stroke="#b85565"
                        stroke-width="0.8"
                        opacity="0.35"
                        stroke-linecap="round"
                    />
                    <path
                        v-if="i % 4 === 1"
                        :d="`M ${seg.rightWall - 3} ${seg.y - 6} Q ${seg.rightWall - 9} ${seg.y + 2} ${seg.rightWall - 4} ${seg.y + 12}`"
                        fill="none"
                        stroke="#b85565"
                        stroke-width="0.7"
                        opacity="0.3"
                        stroke-linecap="round"
                    />
                </g>

                <!-- inner wall shadow -->
                <path
                    :d="intestinePaths.left"
                    fill="none"
                    stroke="rgba(60,15,20,0.5)"
                    stroke-width="6"
                    stroke-linecap="round"
                />
                <path
                    :d="intestinePaths.right"
                    fill="none"
                    stroke="rgba(60,15,20,0.5)"
                    stroke-width="6"
                    stroke-linecap="round"
                />
                <!-- inner wall highlight -->
                <path
                    :d="intestinePaths.left"
                    fill="none"
                    stroke="rgba(255,180,180,0.15)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                />
                <path
                    :d="intestinePaths.right"
                    fill="none"
                    stroke="rgba(255,180,180,0.15)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                />
            </g>

            <!-- anus / exit -->
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

            <!-- poop -->
            <text
                :x="state.poopX"
                :y="state.poopY"
                text-anchor="middle"
                dominant-baseline="central"
                :font-size="poopRadius * 2.2"
                class="poop-sprite"
            >💩</text>
        </svg>

        <div class="hud">
            <div class="hud-item">
                <span class="hud-label">Hits</span>
                <span class="hud-value">{{ state.collisions }}</span>
            </div>
            <div class="hud-item progress-wrap">
                <span class="hud-label">Progress</span>
                <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: progressBarWidth }"></div>
                </div>
            </div>
            <div class="hud-item">
                <span class="hud-label">Time</span>
                <span class="hud-value">{{ elapsedSeconds }}s</span>
            </div>
        </div>
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

.hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: rgba(30, 8, 12, 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
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
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, #d4606a, #4caf50);
    transition: width 0.15s ease;
}
</style>
