<template>
    <GameStartScreen
        v-if="phase === 'start'"
        title="Costco Pizza Poop"
        subtitle="Feed the slices. Wait for the miracle."
        :intro-script="COSTCO_PIZZA_POOP_INTRO_SCRIPT"
        @play="handlePlayFromStart"
    >
        <template #media>🍕</template>
        <p>
            Drag each slice from the pizza into the mouth.<br />
            When the last slice is eaten, digestion runs — you win when they poop!
        </p>
    </GameStartScreen>

    <div
        v-else-if="phase === 'playing' || phase === 'digesting'"
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

        <div v-if="phase === 'digesting'" class="digest-overlay">
            <p v-if="!showPoop" class="digest-text">Digesting…</p>
            <div v-else class="poop-drop" :class="{ 'poop-drop-visible': showPoop }">💩</div>
        </div>
    </div>

    <GameEndScreen
        v-else-if="phase === 'win'"
        title="Costco Complete!"
        emoji="💩"
        :score="winScore"
        game-slug="costco-pizza-poop"
        @play-again="handlePlayAgain"
    >
        <p class="win-sub text-[clamp(0.85rem,2.4vmin,1rem)] text-gray-400">
            Time: {{ winElapsed }}s
        </p>
    </GameEndScreen>
</template>

<script setup>
import GameStartScreen from "@/Components/Games/GameStartScreen.vue";
import GameEndScreen from "@/Components/Games/GameEndScreen.vue";
import { COSTCO_PIZZA_POOP_INTRO_SCRIPT } from "@/Pages/Games/shared/introScripts.js";
import { useSound } from "@/Pages/Games/BigPoop/composables/useSound.js";
import { useSpeechSynthesis } from "@/composables/useSpeechSynthesis";
import { usePage } from "@inertiajs/vue3";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";

const SLICE_COUNT = 6;
const SLICE_SIZE = 66;
const POOP_VISIBLE_BEFORE_WIN_MS = 2000;
const POOP_SPEECH = "You made a big giant guster.";

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

const playStartMs = ref(0);
const winScore = ref(0);
const winElapsed = ref(0);
const showPoop = ref(false);
let digestTimer = null;
let poopTimer = null;

const fartSoundUrl = usePage().props.fartSoundUrl ?? "/fart.m4a";
const { initAudio, playFart, playChomp } = useSound(fartSoundUrl);
const { speak, stopSpeech } = useSpeechSynthesis();

const slicesLeft = computed(
    () => sliceList.value.filter((s) => !s.eaten).length,
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
    if (phase.value !== "playing") return;
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
                beginDigest();
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

function beginDigest() {
    const elapsed = (Date.now() - playStartMs.value) / 1000;
    winElapsed.value = Math.round(elapsed * 10) / 10;
    winScore.value = Math.max(1, 200 - Math.floor(elapsed * 3));

    phase.value = "digesting";
    showPoop.value = false;
    digestTimer = window.setTimeout(() => {
        showPoop.value = true;
        playFart();
        speak(POOP_SPEECH);
        poopTimer = window.setTimeout(() => {
            phase.value = "win";
        }, POOP_VISIBLE_BEFORE_WIN_MS);
    }, 1200);
}

async function handlePlayFromStart() {
    await initAudio();
    phase.value = "playing";
    await nextTick();
    updateSize();
    playStartMs.value = Date.now();
}

async function handlePlayAgain() {
    clearTimers();
    sliceList.value.forEach((s) => {
        s.eaten = false;
    });
    showPoop.value = false;
    await initAudio();
    phase.value = "playing";
    await nextTick();
    updateSize();
    draggingId.value = null;
    playStartMs.value = Date.now();
}

function clearTimers() {
    if (digestTimer) {
        clearTimeout(digestTimer);
        digestTimer = null;
    }
    if (poopTimer) {
        clearTimeout(poopTimer);
        poopTimer = null;
    }
}

onMounted(() => {
    window.addEventListener("resize", updateSize);
});

onUnmounted(() => {
    window.removeEventListener("resize", updateSize);
    removeDragListeners();
    clearTimers();
    stopSpeech();
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

.digest-overlay {
    position: absolute;
    inset: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    padding-bottom: 18%;
    background: rgba(0, 0, 0, 0.25);
    pointer-events: none;
}

.digest-text {
    font-size: clamp(1.25rem, 5vmin, 1.75rem);
    font-weight: 900;
    color: #fde68a;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
}

.poop-drop {
    font-size: clamp(3rem, 15vmin, 5rem);
    line-height: 1;
    opacity: 0;
    transform: translateY(-20px) scale(0.5);
}

.poop-drop-visible {
    animation: poopPlop 0.55s ease-out forwards;
}

@keyframes poopPlop {
    0% {
        opacity: 0;
        transform: translateY(-30px) scale(0.4);
    }
    55% {
        opacity: 1;
        transform: translateY(8px) scale(1.1);
    }
    100% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

.win-sub {
    margin-top: 0.25rem;
}
</style>
