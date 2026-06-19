<template>
    <GameStartScreen
        v-if="phase === 'start'"
        title="Costco Pizza Poop"
        subtitle="Feed the slices, then watch digestion begin."
        :intro-script="COSTCO_PIZZA_POOP_INTRO_SCRIPT"
        @play="handlePlayFromStart"
    >
        <template #media>🍕</template>
        <p>
            Drag each slice from the pizza into the mouth.<br />
            After all slices are eaten, steer the poop through the intestine to finish.
        </p>
    </GameStartScreen>

    <div
        v-else-if="phase === 'pizza'"
        ref="gameEl"
        class="game-container"
    >
        <div class="hud">
            <span class="hud-label">Slices left</span>
            <span class="hud-value">{{ slicesLeft }}</span>
        </div>

        <Link
            :href="route('games.index')"
            class="game-quit"
            aria-label="Quit to games"
        >✕</Link>

        <transition name="pizza-hint-fade">
            <div v-if="showPizzaHint" class="pizza-hint" aria-hidden="true">
                Drag a slice into the mouth 👇
            </div>
        </transition>

        <button
            v-for="s in sliceList"
            v-show="!s.eaten"
            :key="s.id"
            type="button"
            class="slice"
            :class="{ dragging: draggingId === s.id }"
            :style="sliceStyle(s)"
            :aria-label="`Pizza slice ${s.id + 1} — drag into the mouth, or press Enter to eat`"
            @pointerdown.prevent="startDrag(s.id, $event)"
            @keydown.enter.prevent="feedSlice(s.id)"
            @keydown.space.prevent="feedSlice(s.id)"
        >
            🍕
        </button>

        <div class="person-wrap">
            <div
                class="person"
                :class="{ anticipating, gulping }"
                aria-label="Hungry person"
            >
                <div
                    ref="faceRef"
                    class="person-face"
                    :style="{ '--gaze-x': `${gazeX}px`, '--gaze-y': `${gazeY}px` }"
                >
                    <span class="person-brow person-brow-left" aria-hidden="true"></span>
                    <span class="person-brow person-brow-right" aria-hidden="true"></span>
                    <span class="person-eye person-eye-left" aria-hidden="true">
                        <span class="person-pupil"></span>
                    </span>
                    <span class="person-eye person-eye-right" aria-hidden="true">
                        <span class="person-pupil"></span>
                    </span>
                    <span class="person-cheek person-cheek-left" aria-hidden="true"></span>
                    <span class="person-cheek person-cheek-right" aria-hidden="true"></span>
                    <div class="person-mouth" aria-hidden="true">
                        <span class="person-teeth"></span>
                        <span class="person-tongue"></span>
                        <div ref="mouthRef" class="mouth-hitbox"></div>
                    </div>
                    <div
                        v-if="gulping"
                        :key="chompCount"
                        class="chomp-burst"
                        aria-hidden="true"
                    >
                        <span></span><span></span><span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-else-if="phase === 'intestine'" class="intestine-wrap">
        <GameBoard
            :state="intestineState"
            :segments="segments"
            :total-height="totalHeight"
            :elapsed-seconds="intestineElapsedSeconds"
            :progress="progress"
            :poop-radius="POOP_RADIUS"
            :get-passage-at="getPassageAt"
            :controls-enabled="!intestineIntroActive"
            :poop-visible="!intestineIntroActive"
            :show-digest-intro="intestineIntroActive"
            @move="movePoop"
        />
    </div>

    <GameEndScreen
        v-else-if="phase === 'win'"
        title="Digestive Victory!"
        emoji="💩"
        :score="winScore"
        game-slug="costco-pizza-poop"
        @play-again="handlePlayAgain"
    >
        <p class="win-sub text-[clamp(0.85rem,2.4vmin,1rem)] text-gray-400">
            Time: {{ winElapsed }}s
        </p>
        <p class="win-sub text-[clamp(0.85rem,2.4vmin,1rem)] text-gray-400">
            Wall hits: {{ winCollisions }}
        </p>
    </GameEndScreen>
</template>

<script setup>
import GameStartScreen from "@/Components/Games/GameStartScreen.vue";
import GameEndScreen from "@/Components/Games/GameEndScreen.vue";
import GameBoard from "@/Pages/Games/CostcoPizzaPoop/components/GameBoard.vue";
import { COSTCO_PIZZA_POOP_INTRO_SCRIPT } from "@/Pages/Games/shared/introScripts.js";
import { useGameState } from "@/Pages/Games/CostcoPizzaPoop/composables/useGameState.js";
import { useSound } from "@/Pages/Games/CostcoPizzaPoop/composables/useSound.js";
import { Link, usePage } from "@inertiajs/vue3";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const SLICE_COUNT = 3;
const SLICE_SIZE = 96;
const INTESTINE_INTRO_MS = 2600;
const VICTORY_TUNE_DELAY_MS = 300;

const phase = ref("start");
const gameEl = ref(null);
const mouthRef = ref(null);
const faceRef = ref(null);
const gameW = ref(400);
const gameH = ref(600);

const gazeX = ref(0);
const gazeY = ref(0);
const anticipating = ref(false);
const gulping = ref(false);
const chompCount = ref(0);
let gulpTimer = null;
const sliceList = ref(
    Array.from({ length: SLICE_COUNT }, (_, id) => ({
        id,
        eaten: false,
        x: 0,
        y: 0,
        startX: 0,
        startY: 0,
    })),
);
const draggingId = ref(null);
const showPizzaHint = ref(false);
let dragOffsetX = 0;
let dragOffsetY = 0;
let activeMove = null;
let activeEnd = null;

const winScore = ref(0);
const winElapsed = ref(0);
const winCollisions = ref(0);
const intestineIntroActive = ref(false);
let intestineIntroTimer = null;
let victoryTuneTimer = null;

const fartSoundUrl = usePage().props.fartSoundUrl ?? "/fart.m4a";
const { initAudio, playFart, playChomp, playVictory, playMissSound } = useSound(fartSoundUrl);
const {
    state: intestineState,
    segments,
    totalHeight,
    elapsedSeconds: intestineElapsedSeconds,
    progress,
    startGame: startIntestineGame,
    movePoop,
    getPassageAt,
    POOP_RADIUS,
} = useGameState();

const slicesLeft = computed(
    () => sliceList.value.filter((s) => !s.eaten).length,
);

watch(
    () => intestineState.phase,
    (newPhase) => {
        if (phase.value !== "intestine" || newPhase !== "win") {
            return;
        }

        playFart();
        victoryTuneTimer = window.setTimeout(() => {
            playVictory();
            victoryTuneTimer = null;
        }, VICTORY_TUNE_DELAY_MS);
        winScore.value = intestineState.score;
        winElapsed.value = intestineElapsedSeconds.value;
        winCollisions.value = intestineState.collisions;
        phase.value = "win";
    },
);

watch(
    () => intestineState.collisions,
    (newCollisions, oldCollisions) => {
        if (phase.value !== "intestine" || intestineIntroActive.value) {
            return;
        }
        if (newCollisions > oldCollisions) {
            playMissSound();
        }
    },
);

function sliceStyle(s) {
    return {
        left: `${s.x - SLICE_SIZE / 2}px`,
        top: `${s.y - SLICE_SIZE / 2}px`,
        width: `${SLICE_SIZE}px`,
        height: `${SLICE_SIZE}px`,
        fontSize: `${Math.floor(SLICE_SIZE * 0.85)}px`,
    };
}

function updateSize() {
    if (!gameEl.value) return;
    const rect = gameEl.value.getBoundingClientRect();
    gameW.value = rect.width;
    gameH.value = rect.height;
    layoutSlices();
}

function layoutSlices() {
    const w = gameW.value;
    const baseY = Math.min(220, Math.max(150, w * 0.34));
    const margin = 24;
    const usable = w - margin * 2;
    const step = usable / (SLICE_COUNT + 1);
    sliceList.value.forEach((s, i) => {
        s.startX = margin + step * (i + 1);
        s.startY = baseY;
        if (!s.eaten && draggingId.value !== s.id) {
            s.x = s.startX;
            s.y = s.startY;
        }
    });
}

function getLocalPos(e) {
    const rect = gameEl.value.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
        x: src.clientX - rect.left,
        y: src.clientY - rect.top,
    };
}

function pointInMouth(px, py) {
    if (!mouthRef.value || !gameEl.value) return false;
    const mouth = mouthRef.value.getBoundingClientRect();
    const game = gameEl.value.getBoundingClientRect();
    const cx = game.left + px;
    const cy = game.top + py;
    return (
        cx >= mouth.left
        && cx <= mouth.right
        && cy >= mouth.top
        && cy <= mouth.bottom
    );
}

function mouthCenterLocal() {
    if (!mouthRef.value || !gameEl.value) return null;
    const m = mouthRef.value.getBoundingClientRect();
    const g = gameEl.value.getBoundingClientRect();
    return { x: m.left + m.width / 2 - g.left, y: m.top + m.height / 2 - g.top };
}

function faceCenterLocal() {
    if (!faceRef.value || !gameEl.value) return null;
    const f = faceRef.value.getBoundingClientRect();
    const g = gameEl.value.getBoundingClientRect();
    return { x: f.left + f.width / 2 - g.left, y: f.top + f.height / 2 - g.top };
}

function updateFaceFocus(px, py) {
    const fc = faceCenterLocal();
    if (fc) {
        gazeX.value = Math.max(-9, Math.min(9, (px - fc.x) * 0.045));
        gazeY.value = Math.max(-5, Math.min(8, (py - fc.y) * 0.045));
    }
    const mc = mouthCenterLocal();
    if (mc) {
        anticipating.value = Math.hypot(px - mc.x, py - mc.y) < 170;
    }
}

function resetFaceFocus() {
    gazeX.value = 0;
    gazeY.value = 0;
    anticipating.value = false;
}

function triggerGulp() {
    anticipating.value = false;
    chompCount.value += 1;
    gulping.value = true;
    if (gulpTimer) clearTimeout(gulpTimer);
    gulpTimer = window.setTimeout(() => {
        gulping.value = false;
        gulpTimer = null;
    }, 460);
}

function removeDragListeners() {
    if (activeMove) {
        document.removeEventListener("pointermove", activeMove);
        activeMove = null;
    }
    if (activeEnd) {
        document.removeEventListener("pointerup", activeEnd);
        document.removeEventListener("pointercancel", activeEnd);
        activeEnd = null;
    }
}

function feedSlice(id) {
    if (phase.value !== "pizza") return;
    const s = sliceList.value.find((x) => x.id === id);
    if (!s || s.eaten) return;
    s.eaten = true;
    showPizzaHint.value = false;
    triggerGulp();
    playChomp();
    if (slicesLeft.value === 0) {
        startIntestineRun();
    }
}

function startDrag(id, e) {
    if (phase.value !== "pizza") return;
    const s = sliceList.value.find((x) => x.id === id);
    if (!s || s.eaten) return;

    e.target.setPointerCapture?.(e.pointerId);

    const pos = getLocalPos(e);
    draggingId.value = id;
    dragOffsetX = pos.x - s.x;
    dragOffsetY = pos.y - s.y;

    activeMove = (ev) => {
        if (draggingId.value !== id) return;
        const p = getLocalPos(ev);
        s.x = Math.max(
            SLICE_SIZE / 2,
            Math.min(gameW.value - SLICE_SIZE / 2, p.x - dragOffsetX),
        );
        s.y = Math.max(
            SLICE_SIZE / 2,
            Math.min(gameH.value - SLICE_SIZE / 2, p.y - dragOffsetY),
        );
        updateFaceFocus(s.x, s.y);
    };

    activeEnd = () => {
        if (draggingId.value !== id) return;
        removeDragListeners();
        draggingId.value = null;

        if (pointInMouth(s.x, s.y)) {
            feedSlice(id);
        } else {
            s.x = s.startX;
            s.y = s.startY;
        }
        resetFaceFocus();
    };

    document.addEventListener("pointermove", activeMove, { passive: false });
    document.addEventListener("pointerup", activeEnd);
    document.addEventListener("pointercancel", activeEnd);
}

function startIntestineRun() {
    startIntestineGame();
    intestineIntroActive.value = true;
    phase.value = "intestine";
    intestineIntroTimer = window.setTimeout(() => {
        intestineIntroActive.value = false;
    }, INTESTINE_INTRO_MS);
}

async function handlePlayFromStart() {
    await initAudio();
    phase.value = "pizza";
    showPizzaHint.value = true;
    await nextTick();
    updateSize();
}

async function handlePlayAgain() {
    clearTimers();
    removeDragListeners();
    sliceList.value.forEach((s) => {
        s.eaten = false;
    });
    winScore.value = 0;
    winElapsed.value = 0;
    winCollisions.value = 0;
    intestineIntroActive.value = false;
    gulping.value = false;
    resetFaceFocus();
    await initAudio();
    phase.value = "pizza";
    showPizzaHint.value = true;
    await nextTick();
    updateSize();
    draggingId.value = null;
}

function clearTimers() {
    if (intestineIntroTimer) {
        clearTimeout(intestineIntroTimer);
        intestineIntroTimer = null;
    }
    if (victoryTuneTimer) {
        clearTimeout(victoryTuneTimer);
        victoryTuneTimer = null;
    }
    if (gulpTimer) {
        clearTimeout(gulpTimer);
        gulpTimer = null;
    }
}

onMounted(() => {
    window.addEventListener("resize", updateSize);
});

onUnmounted(() => {
    window.removeEventListener("resize", updateSize);
    removeDragListeners();
    clearTimers();
});
</script>

<style scoped>
.game-container {
    position: relative;
    width: min(100%, 700px);
    height: min(calc(100dvh - 4rem - 48px), 720px);
    margin: 0 auto;
    overflow: hidden;
    border-radius: 16px;
    background:
        radial-gradient(circle at 20% 15%, rgba(255, 220, 180, 0.35), transparent 40%),
        radial-gradient(circle at 80% 90%, rgba(80, 60, 40, 0.2), transparent 45%),
        linear-gradient(165deg, #2a2218, #1a1510);
    box-shadow: 0 0 48px rgba(0, 0, 0, 0.45);
    border: 3px solid #6b5344;
    user-select: none;
    touch-action: none;
}

.hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 10px 16px;
    background: rgba(40, 32, 24, 0.85);
    backdrop-filter: blur(8px);
    color: #fff5e6;
    font-weight: 800;
}

.hud-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.85;
}

.hud-value {
    font-size: 1.35rem;
    font-variant-numeric: tabular-nums;
}

.slice {
    position: absolute;
    z-index: 15;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    -webkit-appearance: none;
    appearance: none;
    line-height: 1;
    cursor: grab;
    touch-action: none;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
    transition: transform 0.12s ease;
}

.slice:focus-visible {
    outline: 3px solid #fbbf24;
    outline-offset: 4px;
    border-radius: 12px;
}

.slice.dragging {
    cursor: grabbing;
    z-index: 40;
    transform: scale(1.12);
    filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.55));
}

.person-wrap {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 48%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    pointer-events: none;
}

.person {
    position: relative;
    width: min(300px, 64vw);
    height: min(320px, 64vmin);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: headBob 3.6s ease-in-out infinite;
}

.person.gulping {
    animation: headGulp 0.46s cubic-bezier(0.3, 0.7, 0.3, 1);
}

.person-face {
    position: relative;
    width: min(220px, 50vw);
    height: min(230px, 52vw);
    border-radius: 45% 45% 50% 50%;
    border: 4px solid #f2c7a6;
    background:
        radial-gradient(circle at 30% 26%, rgba(255, 255, 255, 0.3), transparent 36%),
        linear-gradient(180deg, #ffd9bd 0%, #f4be95 100%);
    box-shadow:
        inset 0 -8px 16px rgba(138, 72, 35, 0.22),
        0 10px 20px rgba(0, 0, 0, 0.34);
}

.person-brow {
    position: absolute;
    top: 22%;
    width: 19%;
    height: 5.5%;
    border-radius: 999px;
    background: #c79b76;
    transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.person-brow-left {
    left: 20%;
    transform: rotate(-7deg);
}

.person-brow-right {
    right: 20%;
    transform: rotate(7deg);
}

.person.anticipating .person-brow-left {
    transform: translateY(-6px) rotate(-15deg);
}

.person.anticipating .person-brow-right {
    transform: translateY(-6px) rotate(15deg);
}

.person-eye {
    position: absolute;
    top: 30%;
    width: 21%;
    height: 18%;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 35%, #ffffff 0%, #efe1d4 100%);
    box-shadow: inset 0 2px 5px rgba(96, 48, 24, 0.25);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: height 0.18s ease;
}

.person-eye-left {
    left: 19%;
}

.person-eye-right {
    right: 19%;
}

.person-pupil {
    width: 46%;
    height: 58%;
    border-radius: 50%;
    background: radial-gradient(circle at 38% 30%, #6a3d2a 0%, #1c0d08 72%);
    transform: translate(var(--gaze-x, 0px), var(--gaze-y, 0px));
    transition: transform 0.12s ease-out;
}

.person-pupil::after {
    content: "";
    position: absolute;
    top: 22%;
    left: 30%;
    width: 26%;
    height: 26%;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
}

.person.anticipating .person-eye {
    height: 21%;
}

.person-cheek {
    position: absolute;
    top: 55%;
    width: 17%;
    height: 12%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 138, 116, 0.6) 0%, transparent 70%);
    opacity: 0.45;
    transition:
        opacity 0.2s ease,
        transform 0.2s ease;
}

.person-cheek-left {
    left: 11%;
}

.person-cheek-right {
    right: 11%;
}

.person.anticipating .person-cheek,
.person.gulping .person-cheek {
    opacity: 0.9;
    transform: scale(1.18);
}

.person-mouth {
    position: absolute;
    left: 50%;
    top: 69%;
    transform: translate(-50%, -50%);
    width: min(118px, 29vw);
    height: min(92px, 23vw);
    border-radius: 0 0 999px 999px;
    border: 4px solid #340f0f;
    border-top: 0;
    background: radial-gradient(circle at 50% 28%, #170404 0%, #080102 76%);
    overflow: hidden;
    animation: mouthChew 1.45s ease-in-out infinite;
    transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

.person.anticipating .person-mouth {
    animation: none;
    transform: translate(-50%, -50%) scaleX(1.08) scaleY(1.4);
}

.person.gulping .person-mouth {
    animation: none;
    transform: translate(-50%, -50%) scaleX(0.94) scaleY(0.5);
}

.person-teeth {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 82%;
    height: 17%;
    border-radius: 0 0 45% 45%;
    background: linear-gradient(180deg, #fffdf8 0%, #f0e2d2 100%);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

.chomp-burst {
    position: absolute;
    left: 50%;
    top: 67%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 5;
}

.chomp-burst span {
    position: absolute;
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: #e8b04b;
    box-shadow: inset 0 0 0 1px rgba(120, 70, 20, 0.45);
    animation: crumbFly 0.5s ease-out forwards;
}

.chomp-burst span:nth-child(1) {
    --tx: -36px;
    --ty: -28px;
}
.chomp-burst span:nth-child(2) {
    --tx: 34px;
    --ty: -24px;
}
.chomp-burst span:nth-child(3) {
    --tx: -20px;
    --ty: -40px;
}
.chomp-burst span:nth-child(4) {
    --tx: 22px;
    --ty: -38px;
}
.chomp-burst span:nth-child(5) {
    --tx: 2px;
    --ty: -46px;
}

.person-tongue {
    position: absolute;
    left: 50%;
    bottom: -8%;
    width: 76%;
    height: 52%;
    border-radius: 999px 999px 40% 40%;
    transform: translateX(-50%);
    background: linear-gradient(180deg, #ff7c7c 0%, #e35f72 100%);
    opacity: 0.95;
}

.mouth-hitbox {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    pointer-events: none;
}

.intestine-wrap {
    position: relative;
    width: min(100%, 700px);
    height: min(calc(100dvh - 4rem - 48px), 720px);
    margin: 0 auto;
    overflow: hidden;
    border-radius: 16px;
    border: 3px solid #6b5344;
    box-shadow: 0 0 48px rgba(0, 0, 0, 0.45);
}

@keyframes mouthChew {
    0% {
        transform: translate(-50%, -50%) scaleY(1);
    }
    45% {
        transform: translate(-50%, -50%) scaleY(0.9);
    }
    100% {
        transform: translate(-50%, -50%) scaleY(1);
    }
}

@keyframes headBob {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-5px);
    }
}

@keyframes headGulp {
    0% {
        transform: translateY(0) scale(1, 1);
    }
    35% {
        transform: translateY(7px) scale(1.05, 0.94);
    }
    70% {
        transform: translateY(-2px) scale(0.98, 1.03);
    }
    100% {
        transform: translateY(0) scale(1, 1);
    }
}

@keyframes crumbFly {
    0% {
        opacity: 1;
        transform: translate(0, 0) scale(1) rotate(0deg);
    }
    100% {
        opacity: 0;
        transform: translate(var(--tx, 0), var(--ty, 0)) scale(0.4) rotate(140deg);
    }
}

.win-sub {
    margin-top: 0.25rem;
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
    background: rgba(40, 32, 24, 0.8);
    color: #fff5e6;
    font-size: 1.1rem;
    line-height: 1;
    text-decoration: none;
    transition: background-color 0.15s ease;
}

.game-quit:hover {
    background: rgba(107, 83, 68, 0.85);
}

.game-quit:focus-visible {
    outline: 2px solid #fbbf24;
    outline-offset: 2px;
}

.pizza-hint {
    position: absolute;
    left: 50%;
    top: 64px;
    transform: translateX(-50%);
    z-index: 18;
    padding: 8px 16px;
    border-radius: 999px;
    background: rgba(40, 32, 24, 0.85);
    color: #fff5e6;
    font-size: clamp(0.95rem, 3vmin, 1.2rem);
    font-weight: 800;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
}

.pizza-hint-fade-enter-active,
.pizza-hint-fade-leave-active {
    transition: opacity 0.3s ease;
}

.pizza-hint-fade-enter-from,
.pizza-hint-fade-leave-to {
    opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
    .person,
    .person.gulping,
    .person-mouth {
        animation: none;
    }

    .slice,
    .person-mouth,
    .person-pupil,
    .person-brow,
    .person-cheek,
    .person-eye {
        transition: none;
    }

    .chomp-burst span {
        animation: none;
        opacity: 0;
    }

    .pizza-hint-fade-enter-active,
    .pizza-hint-fade-leave-active {
        transition: opacity 0.2s ease;
    }
}
</style>
