<script setup>
import GameStartScreen from "@/Components/Games/GameStartScreen.vue";
import ShareToChatButton from "@/Components/ShareToChatButton.vue";
import { POOP_BOOM_INTRO_SCRIPT } from "@/Pages/Games/shared/introScripts.js";
import { useGameViewportLock } from "@/composables/useGameViewportLock";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout.vue";
import { Head } from "@inertiajs/vue3";
import { ref, computed, onMounted, onUnmounted } from "vue";

useGameViewportLock();

// ─── constants ────────────────────────────────────────────────────────────────
const TOILET_W      = 90;   // px
const TOILET_H      = 90;   // px
const POOP_SIZE     = 64;   // px
const TOILET_BOTTOM = 24;   // px from bottom of game container
const TOILET_SPEED  = 2;    // px per frame
const GRAVITY       = 0.45; // px/frame²
const MAX_MISSES    = 5;

// ─── game state ──────────────────────────────────────────────────────────────
const score       = ref(0);
const misses      = ref(0);
const gameOver    = ref(false);
const gameStarted = ref(false);

// toilet
const toiletX   = ref(300); // center-x
let   toiletDir = 1;

// poop
const poopX          = ref(0);
const poopY          = ref(120);
const poopVelY       = ref(0);
const isDragging     = ref(false);
const isPoopFalling  = ref(false);
const poopVisible    = ref(true);

// effects
const showSplash = ref(false);
const splashX    = ref(0);
const splashY    = ref(0);
const showMiss   = ref(false);
const missX      = ref(0);
const missY      = ref(0);

// dimensions
const gameW = ref(600);
const gameH = ref(600);

const gameEl = ref(null);

// ─── computed styles ─────────────────────────────────────────────────────────
const toiletStyle = computed(() => ({
    left:   `${toiletX.value - TOILET_W / 2}px`,
    bottom: `${TOILET_BOTTOM}px`,
}));

const poopStyle = computed(() => ({
    left:   `${poopX.value - POOP_SIZE / 2}px`,
    top:    `${poopY.value - POOP_SIZE / 2}px`,
    cursor: isDragging.value ? "grabbing" : "grab",
    filter: isDragging.value
        ? "drop-shadow(0 8px 16px rgba(0,0,0,0.5))"
        : "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
}));

const splashStyle = computed(() => ({
    left: `${splashX.value - 40}px`,
    top:  `${splashY.value - 40}px`,
}));

const missStyle = computed(() => ({
    left: `${missX.value - 40}px`,
    top:  `${missY.value - 40}px`,
}));

// ─── helpers ─────────────────────────────────────────────────────────────────
function resetPoop() {
    poopX.value         = gameW.value / 2;
    poopY.value         = 120;
    poopVelY.value      = 0;
    poopVisible.value   = true;
    isPoopFalling.value = false;
}

function handleHit() {
    isPoopFalling.value = false;
    poopVisible.value   = false;
    score.value++;
    splashX.value    = toiletX.value;
    splashY.value    = gameH.value - TOILET_BOTTOM - TOILET_H;
    showSplash.value = true;
    playHitSound();
    setTimeout(() => {
        showSplash.value = false;
        if (!gameOver.value) {
            resetPoop();
            queueNextTick();
        }
    }, 1200);
}

function handleMiss() {
    isPoopFalling.value = false;
    poopVisible.value   = false;
    misses.value++;
    missX.value    = poopX.value;
    missY.value    = Math.min(poopY.value, gameH.value - 60);
    showMiss.value = true;
    playMissSound();
    setTimeout(() => {
        showMiss.value = false;
        if (misses.value >= MAX_MISSES) {
            gameOver.value = true;
            cancelAnimationFrame(rafId);
            playGameOverSound();
        } else {
            resetPoop();
            queueNextTick();
        }
    }, 1200);
}

// ─── game loop ────────────────────────────────────────────────────────────────
let rafId = null;

function queueNextTick() {
    if (!gameOver.value) {
        rafId = requestAnimationFrame(tick);
    }
}

function tick() {
    // Move toilet
    toiletX.value += TOILET_SPEED * toiletDir;
    const minX = TOILET_W / 2 + 4;
    const maxX = gameW.value - TOILET_W / 2 - 4;
    if (toiletX.value >= maxX) { toiletX.value = maxX; toiletDir = -1; }
    if (toiletX.value <= minX) { toiletX.value = minX; toiletDir =  1; }

    // Falling poop physics
    if (isPoopFalling.value) {
        poopVelY.value += GRAVITY;
        poopY.value    += poopVelY.value;

        const toiletTopY = gameH.value - TOILET_BOTTOM - TOILET_H;

        if (poopY.value + POOP_SIZE / 2 >= toiletTopY) {
            const bowlLeft  = toiletX.value - TOILET_W * 0.38;
            const bowlRight = toiletX.value + TOILET_W * 0.38;
            if (poopX.value >= bowlLeft && poopX.value <= bowlRight) {
                handleHit();
            } else {
                handleMiss();
            }
            return;
        }

        if (poopY.value - POOP_SIZE / 2 > gameH.value) {
            handleMiss();
            return;
        }
    }

    queueNextTick();
}

// ─── drag handling ────────────────────────────────────────────────────────────
function getEventPos(e) {
    const rect = gameEl.value.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
        x: src.clientX - rect.left,
        y: src.clientY - rect.top,
    };
}

let activeMoveHandler = null;
let activeEndHandler  = null;

function removeDragListeners() {
    if (activeMoveHandler) {
        document.removeEventListener("mousemove", activeMoveHandler);
        document.removeEventListener("touchmove", activeMoveHandler);
        activeMoveHandler = null;
    }
    if (activeEndHandler) {
        document.removeEventListener("mouseup",  activeEndHandler);
        document.removeEventListener("touchend", activeEndHandler);
        activeEndHandler = null;
    }
}

function startDrag(e) {
    if (isPoopFalling.value || gameOver.value || !gameStarted.value) return;
    e.preventDefault();
    isDragging.value = true;

    activeMoveHandler = (ev) => {
        if (!isDragging.value) return;
        const pos = getEventPos(ev);
        poopX.value = Math.max(POOP_SIZE / 2, Math.min(gameW.value - POOP_SIZE / 2, pos.x));
        poopY.value = Math.max(POOP_SIZE / 2, Math.min(gameH.value - TOILET_H - TOILET_BOTTOM - POOP_SIZE, pos.y));
    };

    activeEndHandler = () => {
        if (!isDragging.value) return;
        isDragging.value = false;
        removeDragListeners();
        isPoopFalling.value = true;
        poopVelY.value = 1;
    };

    document.addEventListener("mousemove", activeMoveHandler, { passive: false });
    document.addEventListener("touchmove", activeMoveHandler, { passive: false });
    document.addEventListener("mouseup",  activeEndHandler);
    document.addEventListener("touchend", activeEndHandler);
}

// ─── sounds (Web Audio API) ───────────────────────────────────────────────────
function makeCtx() {
    return new (window.AudioContext || window.webkitAudioContext)();
}

const fartSound = new Audio("/fart.mp3");
fartSound.preload = "auto";
fartSound.volume  = 0.9;
let fartSoundReady = false;
fartSound.addEventListener("canplaythrough", () => { fartSoundReady = true; });
fartSound.addEventListener("error",          () => { fartSoundReady = false; });

function playHitSound() {
    if (!fartSoundReady) { playSynthFartSound(); return; }
    const sound = fartSound.cloneNode();
    sound.volume = fartSound.volume;
    sound.play().catch(() => playSynthFartSound());
}

function playSynthFartSound() {
    try {
        const ctx = makeCtx();
        const now = ctx.currentTime;

        const osc       = ctx.createOscillator();
        const oscFilter = ctx.createBiquadFilter();
        const oscGain   = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
        oscFilter.type = "lowpass";
        oscFilter.frequency.setValueAtTime(900, now);
        oscFilter.frequency.exponentialRampToValueAtTime(180, now + 0.25);
        oscGain.gain.setValueAtTime(0.22, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        const sr   = ctx.sampleRate;
        const len  = Math.floor(sr * 0.3);
        const buf  = ctx.createBuffer(1, len, sr);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
            const t = i / len;
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
        }
        const noise       = ctx.createBufferSource();
        const noiseFilter = ctx.createBiquadFilter();
        const noiseGain   = ctx.createGain();
        noise.buffer = buf;
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(420, now);
        noiseFilter.Q.value = 0.7;
        noiseGain.gain.setValueAtTime(0.14, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(oscFilter);
        oscFilter.connect(oscGain);
        oscGain.connect(ctx.destination);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.28);
        noise.start(now);
        noise.stop(now + 0.22);

        setTimeout(() => ctx.close(), 1000);
    } catch (_) { /* silently ignore */ }
}

function playMissSound() {
    try {
        const ctx  = makeCtx();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        setTimeout(() => ctx.close(), 1000);
    } catch (_) { /* silently ignore */ }
}

function playGameOverSound() {
    try {
        const ctx   = makeCtx();
        const notes = [400, 350, 300, 250, 200];
        notes.forEach((freq, i) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            const t    = ctx.currentTime + i * 0.15;
            osc.type   = "triangle";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.14);
        });
        setTimeout(() => ctx.close(), 2000);
    } catch (_) { /* silently ignore */ }
}

// ─── lifecycle ────────────────────────────────────────────────────────────────
function updateSize() {
    if (!gameEl.value) return;
    const rect  = gameEl.value.getBoundingClientRect();
    gameW.value = rect.width;
    gameH.value = rect.height;
    resetPoop();
    toiletX.value = gameW.value / 2;
}

function startGame() {
    gameStarted.value = true;
    resetPoop();
    toiletX.value = gameW.value / 2;
    queueNextTick();
}

function restartGame() {
    cancelAnimationFrame(rafId);
    score.value    = 0;
    misses.value   = 0;
    gameOver.value = false;
    toiletDir      = 1;
    resetPoop();
    toiletX.value = gameW.value / 2;
    queueNextTick();
}

onMounted(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
});

onUnmounted(() => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", updateSize);
    removeDragListeners();
});
</script>

<template>
    <Head title="Poop Boom" />

    <AuthenticatedLayout>
        <div class="boom-wrapper">
            <div class="game-container" ref="gameEl">

                <!-- ── start screen ─────────────────────────────── -->
                <Transition name="fade">
                    <GameStartScreen
                        v-if="!gameStarted"
                        title="Poop Boom"
                        :intro-script="POOP_BOOM_INTRO_SCRIPT"
                        play-label="▶ Play"
                        @play="startGame"
                    >
                        <template #media>💩</template>
                        <p>
                            Drag the poop and drop it into the toilet.<br />
                            5 misses and it's game over!
                        </p>
                    </GameStartScreen>
                </Transition>

                <!-- ── game over screen ──────────────────────────── -->
                <Transition name="fade">
                    <div v-if="gameOver" class="overlay gameover-screen">
                        <div class="overlay-card">
                            <div class="big-emoji">😱</div>
                            <h1>Game Over!</h1>
                            <p>You scored <strong>{{ score }}</strong> point{{ score !== 1 ? "s" : "" }}!</p>
                            <button class="btn" @click="restartGame">🔄 Play Again</button>
                            <div class="gameover-share">
                                <ShareToChatButton game-slug="boom" :score="score" />
                            </div>
                        </div>
                    </div>
                </Transition>

                <!-- ── HUD ────────────────────────────────────────── -->
                <div class="hud">
                    <div class="hud-item">
                        <span class="hud-label">Score</span>
                        <span class="hud-value">{{ score }}</span>
                    </div>
                    <div class="hud-instruction">🖱 Drag 💩 and release to drop!</div>
                    <div class="hud-item">
                        <span class="hud-label">Misses</span>
                        <span class="hud-value misses-value">
                            <span v-for="n in MAX_MISSES" :key="n" class="miss-pip" :class="{ used: n <= misses }">💔</span>
                        </span>
                    </div>
                </div>

                <!-- ── draggable poop ─────────────────────────────── -->
                <div
                    v-if="poopVisible && gameStarted && !gameOver"
                    class="poop"
                    :class="{ dragging: isDragging, falling: isPoopFalling }"
                    :style="poopStyle"
                    @mousedown="startDrag"
                    @touchstart.prevent="startDrag"
                    role="img"
                    aria-label="poop"
                >💩</div>

                <!-- ── splash effect ─────────────────────────────── -->
                <Transition name="splash-anim">
                    <div v-if="showSplash" class="splash-effect" :style="splashStyle">
                        <span>💦</span><span>💧</span><span>💦</span>
                        <div class="splash-score">+1</div>
                    </div>
                </Transition>

                <!-- ── miss effect ────────────────────────────────── -->
                <Transition name="miss-anim">
                    <div v-if="showMiss" class="miss-effect" :style="missStyle">
                        <span>💢</span>
                        <div class="miss-label">Miss!</div>
                    </div>
                </Transition>

                <!-- ── toilet ────────────────────────────────────── -->
                <div class="toilet-wrap" :style="toiletStyle">
                    <div class="toilet-emoji" role="img" aria-label="toilet">🚽</div>
                </div>

                <!-- ── floor line ─────────────────────────────────── -->
                <div class="floor"></div>
            </div>
        </div>
    </AuthenticatedLayout>
</template>

<style scoped>
/* ── outer wrapper fills space below the nav bar ─────────── */
.boom-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    padding: 24px 24px 20px;
    background:
        radial-gradient(circle at 15% 20%, rgba(255, 245, 224, 0.2), transparent 35%),
        radial-gradient(circle at 85% 80%, rgba(96, 70, 42, 0.25), transparent 45%),
        linear-gradient(145deg, #2f2318, #1e160f);
    min-height: calc(100dvh - 4rem);
}

/* ── game container ─────────────────────────────────────── */
.game-container {
    position: relative;
    width: min(100%, 700px);
    height: min(calc(100dvh - 4rem - 88px), 700px);
    overflow: hidden;
    border-radius: 16px;
    background-color: #efe6d6;
    background-image:
        linear-gradient(rgba(125, 102, 76, 0.24) 1px, transparent 1px),
        linear-gradient(90deg, rgba(125, 102, 76, 0.24) 1px, transparent 1px),
        radial-gradient(circle at 20% 10%, rgba(255, 255, 255, 0.38), transparent 32%),
        radial-gradient(circle at 80% 85%, rgba(96, 70, 42, 0.1), transparent 42%);
    background-size: 56px 56px, 56px 56px, 100% 100%, 100% 100%;
    box-shadow: 0 0 60px rgba(0,0,0,.6);
    border: 3px solid #9d8263;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
}

/* ── HUD ─────────────────────────────────────────────────── */
.hud {
    position: absolute;
    top: 0; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: rgba(63, 45, 28, 0.72);
    backdrop-filter: blur(6px);
    color: #fff5e7;
    font-weight: 700;
    z-index: 10;
    border-bottom: 2px solid rgba(188, 155, 113, 0.7);
}

.hud-label {
    font-size: .65rem;
    letter-spacing: .08em;
    text-transform: uppercase;
    opacity: .7;
    display: block;
    text-align: center;
}

.hud-value {
    font-size: 1.4rem;
    display: block;
    text-align: center;
}

.hud-instruction {
    font-size: .75rem;
    color: #e6d4bb;
    text-align: center;
}

.miss-pip { font-size: .95rem; filter: grayscale(1) opacity(.4); transition: filter .2s; }
.miss-pip.used { filter: grayscale(0) opacity(1); }

/* ── poop ────────────────────────────────────────────────── */
.poop {
    position: absolute;
    font-size: 52px;
    line-height: 1;
    user-select: none;
    -webkit-user-select: none;
    transition: filter .15s;
    z-index: 20;
    will-change: transform;
}

.poop:not(.falling):not(.dragging):hover {
    filter: drop-shadow(0 0 12px rgba(145, 112, 55, 0.95)) !important;
    transform: scale(1.08);
}

.poop.dragging { transform: scale(1.15); z-index: 30; }

@keyframes breathe {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.06); }
}
.poop:not(.falling):not(.dragging) { animation: breathe 1.8s ease-in-out infinite; }

/* ── toilet ──────────────────────────────────────────────── */
.toilet-wrap {
    position: absolute;
    width: 90px;
    height: 90px;
    z-index: 5;
}

.toilet-emoji {
    font-size: 80px;
    line-height: 1;
    filter: drop-shadow(0 4px 6px rgba(30, 20, 12, 0.45));
}

/* ── floor ───────────────────────────────────────────────── */
.floor {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 24px;
    background:
        repeating-linear-gradient(
            90deg,
            #b6a085 0 28px,
            #a88f71 28px 30px
        ),
        linear-gradient(#c8b59a, #9f896e);
    border-top: 3px solid #81684b;
}

/* ── splash ──────────────────────────────────────────────── */
.splash-effect {
    position: absolute;
    width: 80px;
    height: 80px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    font-size: 1.8rem;
    z-index: 25;
    pointer-events: none;
}

.splash-score {
    width: 100%;
    text-align: center;
    font-weight: 900;
    font-size: 1.5rem;
    color: #8f6a34;
    text-shadow: 0 0 8px rgba(143, 106, 52, 0.75);
}

/* ── miss ────────────────────────────────────────────────── */
.miss-effect {
    position: absolute;
    width: 80px;
    text-align: center;
    z-index: 25;
    pointer-events: none;
    font-size: 2rem;
}

.miss-label {
    font-size: 1.1rem;
    font-weight: 900;
    color: #f44;
    text-shadow: 0 0 8px #f44;
}

/* ── overlays ────────────────────────────────────────────── */
.overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(34, 23, 14, 0.6);
    backdrop-filter: blur(4px);
    z-index: 50;
}

.overlay-card {
    background: rgba(112, 88, 58, 0.36);
    border: 2px solid rgba(236, 208, 171, 0.4);
    border-radius: 20px;
    padding: 36px 44px;
    text-align: center;
    color: #fff7eb;
    backdrop-filter: blur(8px);
}

.big-emoji { font-size: 5rem; margin-bottom: 8px; }
.overlay-card h1 { font-size: 2.4rem; margin-bottom: 8px; }
.overlay-card p  { font-size: 1rem; opacity: .9; margin-bottom: 20px; line-height: 1.5; }

.gameover-share {
    margin-top: 16px;
    max-width: 28rem;
    margin-left: auto;
    margin-right: auto;
    touch-action: manipulation;
}

.btn {
    display: inline-block;
    padding: 12px 32px;
    font-size: 1.1rem;
    font-weight: 700;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    background: linear-gradient(135deg, #8f6a34, #5c4528);
    color: #fff5e5;
    box-shadow: 0 4px 20px rgba(92, 69, 40, 0.55);
    transition: transform .1s, box-shadow .1s;
}
.btn:hover  { transform: scale(1.05); box-shadow: 0 6px 24px rgba(168, 132, 83, 0.72); }
.btn:active { transform: scale(.97); }

/* ── transitions ─────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }

.splash-anim-enter-active { animation: splashIn .4s ease-out; }
.splash-anim-leave-active { animation: splashOut .8s ease-in forwards; }

@keyframes splashIn  { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes splashOut { to   { transform: scale(1.5) translateY(-30px); opacity: 0; } }

.miss-anim-enter-active { animation: missIn .3s ease-out; }
.miss-anim-leave-active { animation: missOut .9s ease-in forwards; }

@keyframes missIn  { from { transform: scale(0) rotate(-20deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
@keyframes missOut { to   { transform: translateY(-40px); opacity: 0; } }
</style>
