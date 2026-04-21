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

        <div
            v-for="s in sliceList"
            v-show="!s.eaten"
            :key="s.id"
            class="slice"
            :class="{ dragging: draggingId === s.id }"
            :style="sliceStyle(s)"
            @pointerdown.prevent="startDrag(s.id, $event)"
        >
            🍕
        </div>

        <div class="person-wrap">
            <div class="person" aria-label="Hungry person">
                <div class="person-face">
                    <span class="person-eye person-eye-left" aria-hidden="true"></span>
                    <span class="person-eye person-eye-right" aria-hidden="true"></span>
                    <div class="person-mouth" aria-hidden="true">
                        <span class="person-tongue"></span>
                        <div ref="mouthRef" class="mouth-hitbox"></div>
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
import { usePage } from "@inertiajs/vue3";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const SLICE_COUNT = 3;
const SLICE_SIZE = 96;
const INTESTINE_INTRO_MS = 2600;
const VICTORY_TUNE_DELAY_MS = 300;

const phase = ref("start");
const gameEl = ref(null);
const mouthRef = ref(null);
const gameW = ref(400);
const gameH = ref(600);
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
    };

    activeEnd = () => {
        if (draggingId.value !== id) return;
        removeDragListeners();
        draggingId.value = null;

        if (pointInMouth(s.x, s.y)) {
            s.eaten = true;
            playChomp();
            if (slicesLeft.value === 0) {
                startIntestineRun();
            }
        } else {
            s.x = s.startX;
            s.y = s.startY;
        }
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
    await initAudio();
    phase.value = "pizza";
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
    line-height: 1;
    cursor: grab;
    touch-action: none;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35));
    transition: transform 0.12s ease;
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

.person-eye {
    position: absolute;
    top: 34%;
    width: 14%;
    height: 8%;
    border-radius: 999px;
    background: #2d130e;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.25);
}

.person-eye-left {
    left: 24%;
    transform: rotate(-7deg);
}

.person-eye-right {
    right: 24%;
    transform: rotate(7deg);
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

.win-sub {
    margin-top: 0.25rem;
}
</style>
