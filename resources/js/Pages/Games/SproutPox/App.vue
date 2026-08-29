<script setup>
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from "vue";
import { Link, usePage } from "@inertiajs/vue3";
import GameEndScreen from "@/Components/Games/GameEndScreen.vue";
import PersonFace from "@/Components/Games/PersonFace.vue";
import AimGuide from "./components/AimGuide.vue";
import {
    useSproutGame,
    MAX_DRAG,
    mouthWidthFrac,
    poxTarget,
} from "./composables/useSproutGame.js";
import { useSound } from "./composables/useSound.js";
import { SPROUT } from "@/constants/characters.js";
import { useAutoStartGame } from "@/composables/useAutoStartGame";
import { useTranslations } from "@/composables/useTranslations";

const { t } = useTranslations();

const page = usePage();
const fartSoundUrl = page.props.fartSoundUrl || "/fart.m4a";

const { initAudio, playLaunch, playHit, playMiss, playLevelUp } =
    useSound(fartSoundUrl);

const game = useSproutGame({
    onLaunch: () => playLaunch(),
    onHit: () => playHit(),
    onMiss: () => playMiss(),
    onLevelUp: () => playLevelUp(),
});
const { state, highScore, levelBanner, sprout, aim, aimVector, pox, popups } =
    game;

const stageEl = ref(null);
const faceRef = ref(null);
let resizeObserver = null;

function measure() {
    if (!stageEl.value) return;
    const rect = stageEl.value.getBoundingClientRect();
    // Cap at what's actually visible below the stage's current top offset,
    // not just its own CSS box height — the surrounding layout's chrome
    // (nav, header, bottom padding) can push that box partly below the
    // fold, and gameplay must never place the sprout past what the player
    // can actually see without scrolling.
    const visibleHeight = Math.max(
        200,
        Math.min(rect.height, window.innerHeight - rect.top)
    );
    game.setBounds(rect.width, visibleHeight);
}

// --- Gaze tracking: eyes follow the pull-back and the flying sprout,
// matching the "hungry person" behavior in Costco Food Poop. ---------------
const gazeX = ref(0);
const gazeY = ref(0);
const anticipating = ref(false);
const ANTICIPATE_DIST = 90;

function faceCenterLocal() {
    const faceEl = faceRef.value?.faceEl;
    if (!faceEl || !stageEl.value) return null;
    const f = faceEl.getBoundingClientRect();
    const s = stageEl.value.getBoundingClientRect();
    return {
        x: f.left + f.width / 2 - s.left,
        y: f.top + f.height / 2 - s.top,
    };
}

function updateFaceFocus(px, py) {
    const fc = faceCenterLocal();
    if (fc) {
        gazeX.value = Math.max(-9, Math.min(9, (px - fc.x) * 0.045));
        gazeY.value = Math.max(-5, Math.min(8, (py - fc.y) * 0.045));
    }
    const mc = game.mouthCenter.value;
    anticipating.value = Math.hypot(px - mc.x, py - mc.y) < ANTICIPATE_DIST;
}

function resetFaceFocus() {
    gazeX.value = 0;
    gazeY.value = 0;
    anticipating.value = false;
}

watch(
    () => state.shotState,
    (shotState) => {
        if (shotState === "ready") resetFaceFocus();
    }
);

watch(
    () => [sprout.x, sprout.y],
    ([x, y]) => {
        if (state.shotState === "rolling") updateFaceFocus(x, y);
    }
);

onMounted(() => {
    resizeObserver = new ResizeObserver(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    window.removeEventListener("resize", measure);
    window.removeEventListener("scroll", measure);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
});

async function startRound() {
    // The stage doesn't exist (phase !== "playing") until after this flips
    // and Vue flushes the DOM update, so measure and attach the resize
    // observer only once it's actually rendered.
    state.phase = "playing";
    await nextTick();
    if (stageEl.value) resizeObserver?.observe(stageEl.value);
    measure();
    game.start();
}

async function handlePlay() {
    await initAudio();
    await startRound();
}

function handlePlayAgain() {
    startRound();
}

// --- Aiming: pull back from the sprout, release to fling it ---------------

function pointerToStage(event) {
    const rect = stageEl.value.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function onSproutPointerDown(event) {
    if (state.shotState !== "ready") return;
    const p = pointerToStage(event);
    game.startAim(p.x, p.y);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
}

function onPointerMove(event) {
    if (state.shotState !== "aiming") return;
    event.preventDefault();
    const p = pointerToStage(event);
    game.updateAim(p.x, p.y);
    updateFaceFocus(p.x, p.y);
}

function onPointerUp() {
    if (state.shotState === "aiming") game.release();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
}

// Keyboard fallback: arrow keys steer the angle and power, Enter/Space fires.
const keyboardAngle = ref(-Math.PI / 2); // straight up
const keyboardPower = ref(0.75);
const ANGLE_STEP = 0.08;
const POWER_STEP = 0.08;

function nudgeAngle(delta) {
    if (state.shotState !== "ready") return;
    keyboardAngle.value = Math.max(
        -Math.PI + 0.15,
        Math.min(-0.15, keyboardAngle.value + delta)
    );
}

function nudgePower(delta) {
    if (state.shotState !== "ready") return;
    keyboardPower.value = Math.max(
        0.3,
        Math.min(1, keyboardPower.value + delta)
    );
}

function keyboardLaunch() {
    if (state.shotState !== "ready") return;
    const origin = game.launchOrigin.value;
    const dirX = Math.cos(keyboardAngle.value);
    const dirY = Math.sin(keyboardAngle.value);
    const pullX = origin.x - dirX * keyboardPower.value * MAX_DRAG;
    const pullY = origin.y - dirY * keyboardPower.value * MAX_DRAG;
    game.startAim(pullX, pullY);
    game.release();
}

// --- Display helpers ---------------------------------------------------

const sproutPos = computed(() => {
    if (state.shotState === "rolling") {
        return { x: sprout.x, y: sprout.y };
    }
    if (state.shotState === "aiming") {
        const origin = game.launchOrigin.value;
        const dx = aim.x - origin.x;
        const dy = aim.y - origin.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return origin;
        const clamped = Math.min(dist, MAX_DRAG);
        return {
            x: origin.x + (dx / dist) * clamped,
            y: origin.y + (dy / dist) * clamped,
        };
    }
    return game.launchOrigin.value;
});

// Sized from the sprout's actual collision radius (itself derived from the
// measured stage bounds), not viewport units — so it can never grow larger
// than the real playfield on a short or narrow screen.
const sproutFontSize = computed(() =>
    Math.max(28, Math.min(58, game.sproutRadius.value * 2.6))
);

const sproutStyle = computed(() => ({
    left: `${sproutPos.value.x}px`,
    top: `${sproutPos.value.y}px`,
    fontSize: `${sproutFontSize.value}px`,
    transform: `translate(-50%, -50%) rotate(${sprout.spin}rad)`,
}));

const mouthScale = computed(
    () => mouthWidthFrac(state.level) / mouthWidthFrac(1)
);

const sproutPips = computed(() =>
    Array.from({ length: state.sproutsLeft }, (_, i) => i)
);

useAutoStartGame(handlePlay);
</script>

<template>
    <div v-if="state.phase === 'playing'" ref="stageEl" class="sprout-stage">
        <div class="hud">
            <div class="hud-stat">
                <span class="hud-label">{{
                    t("games.sprout_pox.hud_level_label")
                }}</span>
                <span class="hud-value tabular-nums">{{ state.level }}</span>
            </div>
            <div class="hud-stat">
                <span class="hud-label">{{
                    t("games.sprout_pox.hud_pox_label")
                }}</span>
                <span class="hud-value tabular-nums"
                    >{{ state.levelPox }}/{{ poxTarget(state.level) }}</span
                >
            </div>
            <div class="hud-stat hud-stat-right">
                <span class="hud-label">{{
                    t("games.sprout_pox.hud_sprouts_label")
                }}</span>
                <span class="hud-pips" aria-hidden="true">
                    <span v-for="i in sproutPips" :key="i" class="hud-pip">{{
                        SPROUT
                    }}</span>
                </span>
            </div>
        </div>

        <transition name="level-banner-fade">
            <div v-if="levelBanner" class="level-banner" aria-live="polite">
                {{ t("games.sprout_pox.level_banner", { level: state.level }) }}
            </div>
        </transition>

        <Link
            :href="route('games.index')"
            class="game-quit"
            :aria-label="t('games.quit_aria')"
            >✕</Link
        >

        <div class="face-wrap">
            <PersonFace
                ref="faceRef"
                :gaze-x="gazeX"
                :gaze-y="gazeY"
                :anticipating="anticipating"
                :mouth-open="state.mouthOpen"
                :mouth-scale="mouthScale"
                :pox-dots="pox"
                :label="t('games.sprout_pox.face_aria')"
            />
        </div>

        <AimGuide
            :origin="game.launchOrigin.value"
            :aim-vector="aimVector"
            :visible="state.shotState === 'aiming'"
        />

        <!-- Score popups -->
        <div
            v-for="p in popups"
            :key="`pop-${p.id}`"
            class="score-popup"
            :class="{ big: p.big }"
            :style="{ left: `${p.x}px`, top: `${p.y}px` }"
            aria-hidden="true"
        >
            {{ p.text }}
        </div>

        <button
            type="button"
            class="sprout"
            :class="{
                aiming: state.shotState === 'aiming',
                rolling: state.shotState === 'rolling',
            }"
            :style="sproutStyle"
            :disabled="state.shotState !== 'ready'"
            :aria-label="t('games.sprout_pox.sprout_aria')"
            @pointerdown.prevent="onSproutPointerDown"
            @keydown.left.prevent="nudgeAngle(-ANGLE_STEP)"
            @keydown.right.prevent="nudgeAngle(ANGLE_STEP)"
            @keydown.up.prevent="nudgePower(POWER_STEP)"
            @keydown.down.prevent="nudgePower(-POWER_STEP)"
            @keydown.enter.prevent="keyboardLaunch"
            @keydown.space.prevent="keyboardLaunch"
        >
            {{ SPROUT }}
        </button>
    </div>

    <GameEndScreen
        v-else-if="state.phase === 'end'"
        :title="t('games.sprout_pox.end_title')"
        :emoji="SPROUT"
        :score="state.score"
        game-slug="sprout-pox"
        @play-again="handlePlayAgain"
    >
        <p class="text-[clamp(0.85rem,2.4vmin,1rem)] text-gray-400">
            {{
                t("games.sprout_pox.end_summary", {
                    count: state.poxCount,
                    level: state.level,
                })
            }}
        </p>
    </GameEndScreen>
</template>

<style scoped>
.sprout-stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
    touch-action: none;
    background: radial-gradient(
            120% 80% at 50% -10%,
            rgba(74, 222, 128, 0.14),
            transparent 60%
        ),
        #111827;
}

/* HUD ---------------------------------------------------------------------- */
.hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: clamp(0.6rem, 2.5vmin, 1rem) clamp(0.9rem, 3.5vmin, 1.5rem);
    pointer-events: none;
}

.hud-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
}

.hud-stat-right {
    align-items: flex-end;
}

.hud-label {
    font-size: clamp(0.6rem, 2vmin, 0.72rem);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #9ca3af;
}

.hud-value {
    font-size: clamp(1.3rem, 5vmin, 1.9rem);
    font-weight: 800;
    color: #4ade80;
}

.hud-pips {
    display: flex;
    gap: 0.15em;
    font-size: clamp(1rem, 3.5vmin, 1.35rem);
    max-width: 40vw;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.level-banner {
    position: absolute;
    top: clamp(3.4rem, 12vmin, 5rem);
    left: 50%;
    transform: translateX(-50%);
    z-index: 25;
    padding: 0.4rem 1.1rem;
    border-radius: 999px;
    background: rgba(74, 222, 128, 0.9);
    color: #052e16;
    font-weight: 800;
    font-size: clamp(1rem, 3.5vmin, 1.3rem);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}

.level-banner-fade-enter-active,
.level-banner-fade-leave-active {
    transition: opacity 0.3s ease, transform 0.3s ease;
}
.level-banner-fade-enter-from,
.level-banner-fade-leave-to {
    opacity: 0;
    transform: translate(-50%, -8px);
}

.game-quit {
    position: absolute;
    bottom: clamp(0.6rem, 3vmin, 1.1rem);
    left: clamp(0.6rem, 3vmin, 1.1rem);
    z-index: 21;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 9999px;
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
    outline: 2px solid #4ade80;
    outline-offset: 2px;
}

/* Face ----------------------------------------------------------------- */
.face-wrap {
    position: absolute;
    top: clamp(-1rem, -2vmin, 0.5rem);
    left: 0;
    right: 0;
    height: 42%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
}

/* Sprout ----------------------------------------------------------------- */
.sprout {
    /* font-size comes from the inline `sproutStyle` binding, computed from
     * the measured stage bounds (game.sproutRadius) so it scales with the
     * real playfield on any device instead of a fixed viewport-unit size. */
    position: absolute;
    z-index: 15;
    transform: translate(-50%, -50%);
    line-height: 1;
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: grab;
    user-select: none;
    touch-action: none;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
    transition: filter 0.15s ease;
}

.sprout:focus-visible {
    outline: 3px solid #4ade80;
    outline-offset: 4px;
    border-radius: 9999px;
}

.sprout.aiming {
    cursor: grabbing;
    filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5)) brightness(1.1);
}

.sprout.rolling {
    pointer-events: none;
}

/* Score popup -------------------------------------------------------------- */
.score-popup {
    position: absolute;
    z-index: 17;
    transform: translate(-50%, -50%);
    pointer-events: none;
    font-weight: 800;
    font-size: clamp(1rem, 4vmin, 1.5rem);
    color: #4ade80;
    text-shadow: 0 2px 5px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    animation: scoreRise 0.76s ease-out forwards;
}

.score-popup.big {
    color: #fb923c;
    font-size: clamp(1.2rem, 5vmin, 1.9rem);
}

@keyframes scoreRise {
    0% {
        transform: translate(-50%, -50%) scale(0.6);
        opacity: 0;
    }
    25% {
        transform: translate(-50%, -90%) scale(1.1);
        opacity: 1;
    }
    100% {
        transform: translate(-50%, -200%) scale(1);
        opacity: 0;
    }
}

/* Reduced motion ----------------------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
    .score-popup {
        animation: scoreFade 0.7s ease-out forwards;
    }
    .level-banner-fade-enter-active,
    .level-banner-fade-leave-active {
        transition: opacity 0.2s ease;
    }
    @keyframes scoreFade {
        0% {
            opacity: 0;
        }
        25% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }
}
</style>
