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
                <span class="person-emoji">🧑</span>
                <div ref="mouthRef" class="mouth-hitbox" />
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
            @move="movePoop"
        />
        <div v-if="intestineIntroActive" class="intestine-intro-overlay" aria-hidden="true">
            <p class="digest-sub">Digesting in progress...</p>
            <div class="morph-stage">
                <span class="morph-impact-ring"></span>
                <span class="morph-slice">🍕</span>
                <span class="morph-poop">💩</span>
            </div>
        </div>
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

const SLICE_COUNT = 6;
const SLICE_SIZE = 66;
const INTESTINE_INTRO_MS = 2300;
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
const { initAudio, playFart, playChomp, playVictory } = useSound(fartSoundUrl);
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
    const baseY = Math.min(175, w * 0.3);
    const margin = 20;
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
    width: min(260px, 56vw);
    height: min(280px, 58vmin);
    display: flex;
    align-items: center;
    justify-content: center;
}

.person-emoji {
    font-size: clamp(5.75rem, 28vmin, 9rem);
    line-height: 1;
    filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.35));
}

.mouth-hitbox {
    position: absolute;
    left: 50%;
    top: 58%;
    transform: translate(-50%, -50%);
    width: min(104px, 26vw);
    height: min(52px, 13vw);
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

.digest-sub {
    margin: 0 0 0.65rem;
    text-align: center;
    color: #fde68a;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
    font-size: clamp(0.85rem, 2.8vmin, 1rem);
}

.intestine-intro-overlay {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding-top: clamp(3.2rem, 12vmin, 5.5rem);
    pointer-events: none;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.26), rgba(0, 0, 0, 0.02) 36%);
}

.morph-stage {
    position: relative;
    width: clamp(5rem, 15vmin, 7.5rem);
    height: clamp(5rem, 15vmin, 7.5rem);
}

.morph-impact-ring,
.morph-slice,
.morph-poop {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-size: clamp(3rem, 10.8vmin, 5rem);
    line-height: 1;
}

.morph-impact-ring {
    border-radius: 999px;
    border: 3px solid rgba(255, 232, 178, 0.75);
    opacity: 0;
    transform: scale(0.2);
    animation: intestineImpactRing 0.72s ease-out 1.12s forwards;
}

.morph-slice {
    transform-origin: 50% 70%;
    animation: intestineSliceMorph 1.85s cubic-bezier(0.23, 0.71, 0.25, 0.99) forwards;
}

.morph-poop {
    opacity: 0;
    transform: scale(0.35);
    filter: drop-shadow(0 0 0 rgba(78, 37, 23, 0));
    animation: intestinePoopMorph 1.15s cubic-bezier(0.2, 0.72, 0.25, 1) 1.42s forwards;
}

@keyframes intestineSliceMorph {
    0% {
        opacity: 1;
        transform: translateY(-0.9rem) rotate(-8deg) scale(1.26);
    }
    46% {
        opacity: 1;
        transform: translateY(0.9rem) rotate(88deg) scale(1.02);
    }
    56% {
        opacity: 1;
        transform: translateY(1.75rem) rotate(116deg) scale(0.92, 0.72);
    }
    65% {
        opacity: 1;
        transform: translateY(1.42rem) rotate(132deg) scale(0.96, 0.78);
    }
    86% {
        opacity: 1;
        transform: translateY(1.95rem) rotate(150deg) scale(0.66);
    }
    100% {
        opacity: 0;
        transform: translateY(2.8rem) rotate(255deg) scale(0.42);
    }
}

@keyframes intestinePoopMorph {
    0% {
        opacity: 0;
        transform: translateY(0.45rem) scale(0.32);
        filter: drop-shadow(0 0 0 rgba(78, 37, 23, 0));
    }
    52% {
        opacity: 1;
        transform: translateY(0) scale(1.12, 0.82);
        filter: drop-shadow(0 0 14px rgba(78, 37, 23, 0.34));
    }
    72% {
        opacity: 1;
        transform: translateY(-0.18rem) scale(0.9, 1.12);
        filter: drop-shadow(0 0 8px rgba(78, 37, 23, 0.25));
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: drop-shadow(0 0 0 rgba(78, 37, 23, 0));
    }
}

@keyframes intestineImpactRing {
    0% {
        opacity: 0;
        transform: scale(0.2);
    }
    15% {
        opacity: 0.9;
    }
    100% {
        opacity: 0;
        transform: scale(1.3);
    }
}

.win-sub {
    margin-top: 0.25rem;
}
</style>
