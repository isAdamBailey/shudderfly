<template>
    <div
        v-if="phase === 'pizza'"
        ref="gameEl"
        class="game-container"
        tabindex="-1"
    >
        <div class="hud">
            <span class="hud-label">{{
                t("games.costco_pizza_poop.hud_food_left")
            }}</span>
            <span class="hud-value">{{ slicesLeft }}</span>
        </div>

        <transition name="pizza-hint-fade">
            <div v-if="showPizzaHint" class="pizza-hint" aria-hidden="true">
                {{ t("games.costco_pizza_poop.pizza_hint") }}
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
            :aria-label="
                t('games.costco_pizza_poop.slice_aria', {
                    item: t(
                        s.kind === 'pepperoni'
                            ? 'games.costco_pizza_poop.pepperoni_stick'
                            : 'games.costco_pizza_poop.pizza_slice'
                    ),
                })
            "
            @pointerdown.prevent="startDrag(s.id, $event)"
            @keydown.enter.prevent="feedSlice(s.id)"
            @keydown.space.prevent="feedSlice(s.id)"
        >
            <PepperoniStick v-if="s.kind === 'pepperoni'" class="food-svg" />
            <template v-else>{{ PIZZA }}</template>
        </button>

        <div class="person-wrap">
            <PersonFace
                ref="faceRef"
                :gaze-x="gazeX"
                :gaze-y="gazeY"
                :anticipating="anticipating"
                :gulping="gulping"
                :chomp-count="chompCount"
            />
        </div>
    </div>

    <div
        v-else-if="phase === 'intestine'"
        ref="intestineEl"
        class="intestine-wrap"
        tabindex="-1"
    >
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
</template>

<script setup>
import { useResizeObserver } from "@vueuse/core";
import PersonFace from "@/Components/Games/PersonFace.vue";
import GameBoard from "@/Pages/Games/CostcoPizzaPoop/components/GameBoard.vue";
import PepperoniStick from "@/Pages/Games/CostcoPizzaPoop/components/PepperoniStick.vue";
import { PIZZA } from "@/constants/characters.js";
import { useGameState } from "@/Pages/Games/CostcoPizzaPoop/composables/useGameState.js";
import { useTranslations } from "@/composables/useTranslations";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

// Over the world, in the kitchen (GameHost). The kit is the only way it
// reaches the world: the chomp, the wall bonk, the poop's toot and the score.
const props = defineProps({
    kit: { type: Object, required: true },
});

const { t } = useTranslations();

const PIZZA_COUNT = 3;
const PEPPERONI_COUNT = 2;
const SLICE_MAX = 96;
const INTESTINE_INTRO_MS = 2600;

const phase = ref("pizza");
const gameEl = ref(null);
const intestineEl = ref(null);
// PersonFace exposes its own element refs; these read through to them.
const faceRef = ref(null);
const mouthEl = computed(() => faceRef.value?.mouthEl ?? null);
const faceEl = computed(() => faceRef.value?.faceEl ?? null);
// Shrinks so the five foods fit across a narrow window without overlapping.
const sliceSize = ref(SLICE_MAX);
const gameW = ref(400);
const gameH = ref(600);

const gazeX = ref(0);
const gazeY = ref(0);
const anticipating = ref(false);
const gulping = ref(false);
const chompCount = ref(0);
let gulpTimer = null;
function createFoodList() {
    const pizza = Array.from({ length: PIZZA_COUNT }, (_, i) => ({
        kind: "pizza",
        id: i,
    }));
    const pepperoni = Array.from({ length: PEPPERONI_COUNT }, (_, i) => ({
        kind: "pepperoni",
        id: PIZZA_COUNT + i,
    }));
    return [...pizza, ...pepperoni].map((f) => ({
        ...f,
        eaten: false,
        x: 0,
        y: 0,
        startX: 0,
        startY: 0,
    }));
}

const sliceList = ref(createFoodList());
const draggingId = ref(null);
const showPizzaHint = ref(true);
let dragOffsetX = 0;
let dragOffsetY = 0;
let activeMove = null;
let activeEnd = null;

const intestineIntroActive = ref(false);
let intestineIntroTimer = null;

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
    () => sliceList.value.filter((s) => !s.eaten).length
);

watch(
    () => intestineState.phase,
    (newPhase) => {
        if (phase.value !== "intestine" || newPhase !== "win") {
            return;
        }

        props.kit.toot("poop");
        props.kit.finish({ score: intestineState.score });
    }
);

watch(
    () => intestineState.collisions,
    (newCollisions, oldCollisions) => {
        if (phase.value !== "intestine" || intestineIntroActive.value) {
            return;
        }
        if (newCollisions > oldCollisions) {
            props.kit.playSound("bonk");
        }
    }
);

function sliceStyle(s) {
    return {
        left: `${s.x - sliceSize.value / 2}px`,
        top: `${s.y - sliceSize.value / 2}px`,
        width: `${sliceSize.value}px`,
        height: `${sliceSize.value}px`,
        fontSize: `${Math.floor(sliceSize.value * 0.85)}px`,
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
    const step = usable / (sliceList.value.length + 1);
    sliceSize.value = Math.min(SLICE_MAX, Math.floor(step));
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
    if (!mouthEl.value || !gameEl.value) return false;
    const mouth = mouthEl.value.getBoundingClientRect();
    const game = gameEl.value.getBoundingClientRect();
    const cx = game.left + px;
    const cy = game.top + py;
    return (
        cx >= mouth.left &&
        cx <= mouth.right &&
        cy >= mouth.top &&
        cy <= mouth.bottom
    );
}

function mouthCenterLocal() {
    if (!mouthEl.value || !gameEl.value) return null;
    const m = mouthEl.value.getBoundingClientRect();
    const g = gameEl.value.getBoundingClientRect();
    return {
        x: m.left + m.width / 2 - g.left,
        y: m.top + m.height / 2 - g.top,
    };
}

function faceCenterLocal() {
    if (!faceEl.value || !gameEl.value) return null;
    const f = faceEl.value.getBoundingClientRect();
    const g = gameEl.value.getBoundingClientRect();
    return {
        x: f.left + f.width / 2 - g.left,
        y: f.top + f.height / 2 - g.top,
    };
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
    props.kit.playSound("chomp");
    // The fed food's button goes away; focus holds in the game, inside the
    // host's dialog, where Escape and Tab still work.
    if (slicesLeft.value === 0) {
        startIntestineRun();
        nextTick(() => intestineEl.value?.focus());
    } else {
        gameEl.value?.focus();
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
            sliceSize.value / 2,
            Math.min(gameW.value - sliceSize.value / 2, p.x - dragOffsetX)
        );
        s.y = Math.max(
            sliceSize.value / 2,
            Math.min(gameH.value - sliceSize.value / 2, p.y - dragOffsetY)
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

// The host's window can change size without the browser window doing so.
useResizeObserver(gameEl, updateSize);

onMounted(() => {
    updateSize();
});

onUnmounted(() => {
    removeDragListeners();
    clearTimeout(intestineIntroTimer);
    clearTimeout(gulpTimer);
});
</script>

<style scoped>
.game-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 12px;
    background: radial-gradient(
            circle at 20% 15%,
            rgba(255, 220, 180, 0.35),
            transparent 40%
        ),
        radial-gradient(
            circle at 80% 90%,
            rgba(80, 60, 40, 0.2),
            transparent 45%
        ),
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

.food-svg {
    width: 100%;
    height: 100%;
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

.intestine-wrap {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: 12px;
    border: 3px solid #6b5344;
    box-shadow: 0 0 48px rgba(0, 0, 0, 0.45);
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
    .slice {
        transition: none;
    }

    .pizza-hint-fade-enter-active,
    .pizza-hint-fade-leave-active {
        transition: opacity 0.2s ease;
    }
}
</style>
