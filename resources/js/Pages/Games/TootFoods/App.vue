<script setup>
import { useResizeObserver } from "@vueuse/core";
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import { useTootGame } from "./composables/useTootGame.js";
import { useTranslations } from "@/composables/useTranslations";

// Over the world, in the kitchen (GameHost). The kit is the only way it
// reaches the world: each food's toot (every food is a cast member with its
// own pitch) and the score.
const props = defineProps({
    kit: { type: Object, required: true },
});

const { t } = useTranslations();

const game = useTootGame({
    onToot: (food) => props.kit.toot(food.type),
    onEnd: (score) => props.kit.finish({ score }),
});
const { state, timeLeft, butt, buttSize, foods, bursts, popups } = game;

const stageEl = ref(null);

function measure() {
    if (!stageEl.value) return;
    const rect = stageEl.value.getBoundingClientRect();
    game.setBounds(rect.width, rect.height);
}

// The host's window can change size without the browser window doing so.
useResizeObserver(stageEl, measure);

onBeforeUnmount(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
});

async function startRound() {
    // Render the stage first so it has real dimensions, measure it, then
    // start — otherwise the butt and foods spawn into a stale 0-size box and
    // cluster in one corner instead of using the whole screen.
    state.phase = "playing";
    await nextTick();
    measure();
    game.start();
}

// --- Drag handling ---------------------------------------------------------
const activeDrag = ref(null); // { id, offsetX, offsetY, pointerId }

function pointerToStage(event) {
    const rect = stageEl.value.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function startDrag(food, event) {
    if (state.phase !== "playing" || food.leaving) return;
    const p = pointerToStage(event);
    activeDrag.value = {
        id: food.id,
        offsetX: food.x - p.x,
        offsetY: food.y - p.y,
        pointerId: event.pointerId,
    };
    game.startDrag(food.id);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
}

function onPointerMove(event) {
    if (!activeDrag.value) return;
    event.preventDefault();
    const p = pointerToStage(event);
    game.updateDrag(
        activeDrag.value.id,
        p.x + activeDrag.value.offsetX,
        p.y + activeDrag.value.offsetY
    );
}

function onPointerUp(event) {
    if (!activeDrag.value) return;
    const p = pointerToStage(event);
    game.endDrag(
        activeDrag.value.id,
        p.x + activeDrag.value.offsetX,
        p.y + activeDrag.value.offsetY
    );
    activeDrag.value = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
}

// Keyboard players: Enter/Space tosses the focused food straight to the butt.
// That food's button goes away, so focus holds on the stage, inside the
// host's dialog, where Escape and Tab still work.
function tossToButt(food) {
    if (state.phase !== "playing" || food.leaving) return;
    game.startDrag(food.id);
    game.endDrag(food.id, butt.x, butt.y);
    stageEl.value?.focus();
}

function foodStyle(food) {
    return {
        left: `${food.x}px`,
        top: `${food.y}px`,
        fontSize: `${Math.max(34, buttSize.value * 0.42)}px`,
    };
}

function buttStyle() {
    const squash = butt.squash;
    return {
        left: `${butt.x}px`,
        top: `${butt.y}px`,
        width: `${buttSize.value}px`,
        height: `${buttSize.value}px`,
        transform: `translate(-50%, -50%) scaleX(${
            butt.facing * (1 + squash * 0.18)
        }) scaleY(${1 - squash * 0.16})`,
    };
}

onMounted(startRound);
</script>

<template>
    <div
        v-if="state.phase === 'playing'"
        ref="stageEl"
        class="toot-stage"
        tabindex="-1"
    >
        <div class="hud">
            <div class="hud-stat">
                <span class="hud-label">{{
                    t("games.toot_foods.hud_score")
                }}</span>
                <span class="hud-value tabular-nums">{{ state.score }}</span>
            </div>
            <transition name="combo-pop">
                <div
                    v-if="state.combo >= 2"
                    class="hud-combo"
                    aria-hidden="true"
                >
                    🔥
                    {{
                        t("games.toot_foods.hud_combo", { count: state.combo })
                    }}
                </div>
            </transition>
            <div class="hud-stat hud-stat-right">
                <span class="hud-label">{{
                    t("games.toot_foods.hud_time")
                }}</span>
                <span
                    class="hud-value tabular-nums"
                    :class="{ urgent: timeLeft <= 5 }"
                    >{{ timeLeft }}s</span
                >
            </div>
        </div>

        <!-- The wandering butt -->
        <div
            class="butt"
            :style="buttStyle()"
            :aria-label="t('games.toot_foods.butt_aria')"
        >
            <CastMember
                id="butt"
                :move="null"
                :size="`${buttSize}px`"
                :facing="butt.facing < 0 ? 'left' : 'right'"
            />
        </div>

        <!-- Toot puffs -->
        <TootPuff
            v-for="b in bursts"
            :key="`burst-${b.id}`"
            class="toot-burst"
            :style="{ left: `${b.x}px`, top: `${b.y}px` }"
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

        <!-- Draggable foods -->
        <button
            v-for="food in foods"
            :key="food.id"
            type="button"
            class="food"
            :class="{ dragging: food.dragging, leaving: food.leaving }"
            :style="foodStyle(food)"
            :aria-label="t('games.toot_foods.food_aria', { food: food.type })"
            @pointerdown.prevent="startDrag(food, $event)"
            @keydown.enter.prevent="tossToButt(food)"
            @keydown.space.prevent="tossToButt(food)"
        >
            {{ food.emoji }}
        </button>
    </div>
</template>

<style scoped>
.toot-stage {
    position: absolute;
    inset: 0;
    overflow: hidden;
    touch-action: none;
    background: radial-gradient(
            120% 80% at 50% -10%,
            rgba(251, 191, 36, 0.12),
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
    font-size: clamp(1.5rem, 6vmin, 2.25rem);
    font-weight: 800;
    color: #fbbf24;
}

.hud-value.urgent {
    color: #f87171;
    animation: pulse 0.6s ease-in-out infinite;
}

.hud-combo {
    font-size: clamp(1rem, 4vmin, 1.4rem);
    font-weight: 800;
    color: #fb923c;
    text-shadow: 0 1px 6px rgba(251, 146, 60, 0.5);
}

@keyframes pulse {
    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.14);
        opacity: 0.8;
    }
}

.combo-pop-enter-active,
.combo-pop-leave-active {
    transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1),
        opacity 0.18s ease-out;
}
.combo-pop-enter-from,
.combo-pop-leave-to {
    transform: scale(0.6);
    opacity: 0;
}

/* Butt --------------------------------------------------------------------- */
.butt {
    position: absolute;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    user-select: none;
    pointer-events: none;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
    animation: buttWiggle 1.6s ease-in-out infinite;
    will-change: transform;
}

@keyframes buttWiggle {
    0%,
    100% {
        margin-top: 0;
    }
    50% {
        margin-top: -4px;
    }
}

/* Foods -------------------------------------------------------------------- */
.food {
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
    transition: transform 0.12s ease-out, opacity 0.18s ease-out;
    animation: foodBob 2.4s ease-in-out infinite;
}

.food:focus-visible {
    outline: 3px solid #fbbf24;
    outline-offset: 4px;
    border-radius: 9999px;
}

.food.dragging {
    z-index: 18;
    cursor: grabbing;
    transform: translate(-50%, -50%) scale(1.25);
    filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.5));
    animation: none;
}

.food.leaving {
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.4);
    animation: none;
}

@keyframes foodBob {
    0%,
    100% {
        margin-top: 0;
    }
    50% {
        margin-top: -5px;
    }
}

/* Toot burst --------------------------------------------------------------- */
.toot-burst {
    z-index: 16;
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
    .butt,
    .food {
        animation: none;
    }
    .food {
        transition: opacity 0.18s ease-out;
    }
    .hud-value.urgent {
        animation: none;
    }
    .score-popup {
        animation: tootFade 0.7s ease-out forwards;
    }
    @keyframes tootFade {
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
