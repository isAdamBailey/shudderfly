<script setup>
import { usePage } from "@inertiajs/vue3";
import { BUTT, TOOT_FOODS } from "@/constants/characters.js";
import { useTranslations } from "@/composables/useTranslations";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import GameConfirmCard from "./components/GameConfirmCard.vue";
import { clamp, useGamesWorld } from "./composables/useGamesWorld.js";
import { useIdlerPhysics } from "./composables/useIdlerPhysics.js";

const props = defineProps({
    games: { type: Array, required: true },
});

const { t } = useTranslations();
const page = usePage();

// The stage keeps its own sky/grass identity rather than the app's bg-theme-*
// tokens, so seasonal theming is a local class swap of custom properties
// rather than hooking into the global theme system.
const themeClass = computed(() =>
    page.props.theme ? `theme-${page.props.theme}` : null
);

const HILL_TILE = 1500; // px; must match the .hills-far background-size
const CLOUD_COUNT = 4;

const stageEl = ref(null);
const stageHeight = ref(null);
const landmarkEls = ref({});
let resizeObserver = null;

const world = useGamesWorld(computed(() => props.games));
const { landmarks, worldWidth, peach, camera, state, nearestLandmark } = world;

const confirmGame = computed(() =>
    state.confirmSlug
        ? landmarks.value.find((lm) => lm.slug === state.confirmSlug) ?? null
        : null
);

// --- Roadside cast ---------------------------------------------------------

const IDLER_SETBACK = 260; // px before its neighbouring landmark
const IDLER_EXCITE_RADIUS = 180;
const IDLER_DEPTHS = [2, 6, 10]; // % below the horizon, varied for a layered feel
const IDLER_REST_STYLE = Object.freeze({
    transform: "translate(-50%, -50%) translate(0px, 0px) rotate(0deg)",
});

const idlerPhysicsCtl = useIdlerPhysics({
    isBlocked: () => Boolean(state.confirmSlug),
});
const { idlerPhysics } = idlerPhysicsCtl;

const idlers = computed(() =>
    landmarks.value.map((landmark, i) => {
        const x = landmark.x - IDLER_SETBACK;
        const p = idlerPhysics[landmark.slug];
        // Most idlers are at rest most of the time; skip building a new
        // style object (and string) for them every peach.x tick.
        const offsetStyle =
            p && (p.dx || p.dy || p.airborne)
                ? {
                      transform: `translate(-50%, -50%) translate(${
                          p.dx
                      }px, ${p.dy}px) rotate(${
                          // A little spin while airborne, driven by whatever
                          // horizontal speed the toss carried.
                          p.airborne ? clamp(p.vx / 15, -35, 35) : 0
                      }deg)`,
                  }
                : IDLER_REST_STYLE;
        return {
            slug: landmark.slug,
            emoji: TOOT_FOODS[i % TOOT_FOODS.length].emoji,
            x,
            top: `calc(var(--horizon) + ${
                IDLER_DEPTHS[i % IDLER_DEPTHS.length]
            }%)`,
            excited: Math.abs(peach.x - x) < IDLER_EXCITE_RADIUS,
            offsetStyle,
        };
    })
);

// --- Layout ---------------------------------------------------------------

const MOBILE_NAV_HEIGHT = 80; // AuthenticatedLayout's pb-20 bottom nav

function measure() {
    if (!stageEl.value) return;
    const rect = stageEl.value.getBoundingClientRect();
    // The page header above the stage is not a fixed height (search bar, title,
    // seasonal chrome), so the stage takes exactly what is left of the viewport
    // rather than guessing in CSS — otherwise the road hangs below the fold.
    const reserved = window.innerWidth < 640 ? MOBILE_NAV_HEIGHT : 0;
    const visibleHeight = Math.max(
        260,
        window.innerHeight - rect.top - reserved
    );
    stageHeight.value = visibleHeight;
    world.setBounds(rect.width, visibleHeight);
}

onMounted(async () => {
    // Measure after the stage has really been laid out; measuring a stale
    // 0-size box would put the camera deadzone at zero width.
    await nextTick();
    measure();
    resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(stageEl.value);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    world.start();
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onWindowBlur);
    detachPointerListeners();
    world.stop();
});

function onVisibilityChange() {
    // Restarting resets the frame clock, so returning to the tab can't land a
    // single giant dt and teleport the peach.
    if (document.hidden) {
        world.setWalk(0);
        world.stop();
        idlerPhysicsCtl.cancelActiveDrag();
    } else {
        world.start();
    }
}

function onWindowBlur() {
    // The keyup for a held arrow goes to whatever took focus, so without this
    // the peach keeps walking to the end of the road while we're away.
    world.setWalk(0);
    // Same reasoning as onVisibilityChange: a blur without a full
    // visibilitychange (e.g. devtools stealing focus) shouldn't leave a
    // toss's listeners attached or its rAF loop running unattended.
    idlerPhysicsCtl.cancelActiveDrag();
}

// --- Pointer --------------------------------------------------------------

// The stage can't move while a finger is down, so its left edge is measured
// once per gesture instead of forcing a layout read on every pointermove.
let gestureLeft = 0;

function beginGesture() {
    gestureLeft = stageEl.value.getBoundingClientRect().left;
}

function pointerToWorld(event) {
    return event.clientX - gestureLeft + camera.x;
}

function attachPointerListeners() {
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
}

function detachPointerListeners() {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
}

function onPeachPointerDown(event) {
    if (state.confirmSlug || event.button > 0) return;
    beginGesture();
    world.startDrag();
    attachPointerListeners();
}

function onStagePointerDown(event) {
    // Only the bare background pans; the peach drags and landmarks click.
    if (
        state.confirmSlug ||
        event.button > 0 ||
        event.target !== event.currentTarget
    ) {
        return;
    }
    beginGesture();
    world.startPan(event.clientX);
    attachPointerListeners();
}

function onPointerMove(event) {
    if (state.mode === "dragging") {
        event.preventDefault();
        world.updateDrag(pointerToWorld(event));
    } else if (state.mode === "panning") {
        event.preventDefault();
        world.updatePan(event.clientX);
    }
}

function onPointerUp() {
    world.endDrag();
    world.endPan();
    detachPointerListeners();
}

function onPointerCancel() {
    // Abandoned, not dropped: the peach stays put and no card opens.
    world.cancelDrag();
    world.endPan();
    detachPointerListeners();
}

// --- Keyboard -------------------------------------------------------------

function onLandmarkFocus(slug) {
    // Focus walks the peach there, so the keyboard route is a real equivalent
    // of dragging rather than a hidden list of links.
    if (state.confirmSlug) return;
    world.walkToLandmark(slug);
    // Focusing an off-screen button makes the browser scroll the (hidden)
    // overflow of the stage; the camera is the only thing allowed to move the
    // view, and a stray scrollLeft would offset every pointer coordinate.
    resetStageScroll();
}

function resetStageScroll() {
    if (stageEl.value) stageEl.value.scrollLeft = 0;
}

function onStageEnter(event) {
    // With the stage focused and no landmark focused, Enter visits whichever
    // landmark the peach is already standing at. A landmark button fires its
    // own click, so only a press on the stage itself is handled here.
    if (state.confirmSlug || event.target !== event.currentTarget) return;
    const landmark = nearestLandmark.value;
    if (landmark) world.openConfirm(landmark.slug);
}

function onCancel() {
    const slug = state.confirmSlug;
    world.closeConfirm();
    nextTick(() => {
        landmarkEls.value[slug]?.focus({ preventScroll: true });
        resetStageScroll();
    });
}

function setLandmarkEl(slug, el) {
    if (el) landmarkEls.value[slug] = el;
    else delete landmarkEls.value[slug];
}

// --- Styles ---------------------------------------------------------------

const worldStyle = computed(() => ({
    width: `${worldWidth.value}px`,
    transform: `translate3d(${-camera.x}px, 0, 0)`,
}));

// The ridge is a repeating tile, so shifting it by the parallax offset modulo
// one tile width scrolls forever without ever exposing a bare edge.
const hillStyle = computed(() => ({
    transform: `translate3d(${-((camera.x * 0.25) % HILL_TILE)}px, 0, 0)`,
}));

const peachStyle = computed(() => ({
    // translate rather than `left`: peach.x changes every frame, and `left`
    // would relayout the box each time.
    transform: `translate3d(${peach.x}px, 0, 0) translate(-50%, ${
        Math.sin(peach.bob * 6) * 6
    }px) scaleX(${peach.facing})`,
}));
</script>

<template>
    <div
        ref="stageEl"
        class="stage"
        :class="themeClass"
        :style="stageHeight ? { height: `${stageHeight}px` } : null"
        tabindex="0"
        :aria-label="t('games.world.stage_aria')"
        @pointerdown="onStagePointerDown"
        @keydown.left.prevent="world.setWalk(-1)"
        @keydown.right.prevent="world.setWalk(1)"
        @keyup.left="world.stopWalk(-1)"
        @keyup.right="world.stopWalk(1)"
        @keydown.enter="onStageEnter($event)"
    >
        <div class="sky" aria-hidden="true"></div>
        <div class="hills-far" :style="hillStyle" aria-hidden="true"></div>
        <div class="clouds" aria-hidden="true">
            <span
                v-for="i in CLOUD_COUNT"
                :key="i"
                class="cloud"
                :style="{ '--i': i }"
            ></span>
        </div>

        <div class="world" :style="worldStyle">
            <div class="road" aria-hidden="true"></div>

            <span
                v-for="(idler, i) in idlers"
                :key="idler.slug"
                class="idler"
                :style="{
                    left: `${idler.x}px`,
                    top: idler.top,
                    ...idler.offsetStyle,
                }"
                aria-hidden="true"
                @pointerdown.prevent="
                    idlerPhysicsCtl.onPointerDown(idler.slug, $event)
                "
            >
                <span
                    class="idler-emoji"
                    :class="{ excited: idler.excited }"
                    :style="{ '--i': i }"
                    >{{ idler.emoji }}</span
                >
            </span>

            <button
                v-for="landmark in landmarks"
                :key="landmark.slug"
                :ref="(el) => setLandmarkEl(landmark.slug, el)"
                type="button"
                class="landmark"
                :class="{ near: nearestLandmark?.slug === landmark.slug }"
                :style="{ left: `${landmark.x}px` }"
                :aria-label="
                    t('games.world.landmark_aria', { game: landmark.name })
                "
                @focus="onLandmarkFocus(landmark.slug)"
                @click="world.openConfirm(landmark.slug)"
            >
                <span class="landmark-emoji" aria-hidden="true">{{
                    landmark.landmark
                }}</span>
                <span class="signpost" aria-hidden="true">{{
                    landmark.name
                }}</span>
            </button>

            <div
                class="peach"
                role="img"
                :aria-label="t('games.world.peach_aria')"
                :style="peachStyle"
                @pointerdown.prevent="onPeachPointerDown"
            >
                {{ BUTT }}
            </div>
        </div>

        <p class="hint" aria-hidden="true">
            {{
                nearestLandmark
                    ? t("games.world.near_hint", { game: nearestLandmark.name })
                    : t("games.world.hint")
            }}
        </p>

        <GameConfirmCard
            v-if="confirmGame"
            :game="confirmGame"
            @cancel="onCancel"
        />
    </div>
</template>

<style scoped>
.stage {
    --horizon: 60%;
    --sky-top: #7dd3fc;
    --sky-bottom: #dff6ff;
    --hill: #34a06a;
    --grass: #4ade80;
    --road: #a8a29e;
    --drifter: "☁️";

    position: relative;
    width: 100%;
    height: 60vh; /* replaced by the measured height on mount */
    overflow: hidden;
    /* Narrower than useGameViewportLock(): drags must not fight page scroll,
       but this is a navigation hub, so pinch-zoom stays available elsewhere. */
    touch-action: none;
    user-select: none;
    outline: none;
}

/* Three custom-property overrides per season, nothing else — the stage keeps
   its own identity, it doesn't reach into the app's bg-theme-* tokens. */
.stage.theme-christmas {
    --sky-top: #bfe6ff;
    --hill: #f8fbff;
    --drifter: "❄️";
}

.stage.theme-halloween {
    --sky-top: #4c1d6b;
    --hill: #3a1854;
}

.stage.theme-fireworks {
    --sky-top: #0b1230;
    --hill: #1c2b52;
    --drifter: "✨";
}

.sky {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
        to bottom,
        var(--sky-top) 0%,
        var(--sky-bottom) var(--horizon),
        var(--grass) var(--horizon),
        var(--grass) 100%
    );
}

.hills-far,
.clouds {
    position: absolute;
    inset: 0;
    pointer-events: none;
    will-change: transform;
}

.hills-far {
    /* Only as tall as the sky and overhanging a tile on each side, so the
       ridges rest ON the horizon and the parallax shift never bares an edge. */
    inset: 0 -1500px calc(100% - var(--horizon)) -1500px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1500 240%22 preserveAspectRatio=%22none%22%3E%3Cpath d=%22M0%2C240 L0%2C180 C160%2C120 300%2C205 460%2C180 C620%2C155 720%2C105 880%2C150 C1050%2C198 1280%2C160 1500%2C180 L1500%2C240 Z%22 fill=%22%233f9a68%22/%3E%3C/svg%3E"),
        url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1500 240%22 preserveAspectRatio=%22none%22%3E%3Cpath d=%22M0%2C240 L0%2C130 C180%2C50 330%2C180 500%2C150 C660%2C122 760%2C40 920%2C80 C1080%2C120 1250%2C180 1500%2C130 L1500%2C240 Z%22 fill=%22%23b3e3ca%22/%3E%3C/svg%3E");
    background-repeat: repeat-x, repeat-x;
    background-size: 1500px 190px, 1500px 140px;
    background-position: 0 bottom, 420px bottom;
}

/* Invisible by default (background: transparent) — a theme turns this into a
   flat --hill tint masked to the same ridge silhouette, so recoloring the
   hills for a season never has to touch the baked SVG fills above. */
.hills-far::after {
    content: "";
    position: absolute;
    inset: 0;
    background: transparent;
    -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1500 240%22 preserveAspectRatio=%22none%22%3E%3Cpath d=%22M0%2C240 L0%2C180 C160%2C120 300%2C205 460%2C180 C620%2C155 720%2C105 880%2C150 C1050%2C198 1280%2C160 1500%2C180 L1500%2C240 Z%22 fill=%22%23000%22/%3E%3C/svg%3E"),
        url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1500 240%22 preserveAspectRatio=%22none%22%3E%3Cpath d=%22M0%2C240 L0%2C130 C180%2C50 330%2C180 500%2C150 C660%2C122 760%2C40 920%2C80 C1080%2C120 1250%2C180 1500%2C130 L1500%2C240 Z%22 fill=%22%23000%22/%3E%3C/svg%3E");
    mask-image: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1500 240%22 preserveAspectRatio=%22none%22%3E%3Cpath d=%22M0%2C240 L0%2C180 C160%2C120 300%2C205 460%2C180 C620%2C155 720%2C105 880%2C150 C1050%2C198 1280%2C160 1500%2C180 L1500%2C240 Z%22 fill=%22%23000%22/%3E%3C/svg%3E"),
        url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1500 240%22 preserveAspectRatio=%22none%22%3E%3Cpath d=%22M0%2C240 L0%2C130 C180%2C50 330%2C180 500%2C150 C660%2C122 760%2C40 920%2C80 C1080%2C120 1250%2C180 1500%2C130 L1500%2C240 Z%22 fill=%22%23000%22/%3E%3C/svg%3E");
    -webkit-mask-repeat: repeat-x, repeat-x;
    mask-repeat: repeat-x, repeat-x;
    -webkit-mask-size: 1500px 190px, 1500px 140px;
    mask-size: 1500px 190px, 1500px 140px;
    -webkit-mask-position: 0 bottom, 420px bottom;
    mask-position: 0 bottom, 420px bottom;
}

.stage.theme-christmas .hills-far::after,
.stage.theme-halloween .hills-far::after,
.stage.theme-fireworks .hills-far::after {
    background: var(--hill);
}

.cloud {
    position: absolute;
    top: calc(3% + var(--i) * 7%);
    left: calc(var(--i) * 23vw - 6vw);
    font-size: 2.4rem;
    animation: cloud-drift 18s ease-in-out infinite alternate;
    animation-delay: calc(var(--i) * -4s);
}

.cloud::before {
    content: var(--drifter);
}

@keyframes cloud-drift {
    from {
        transform: translateX(0);
    }
    to {
        transform: translateX(60px);
    }
}

.world {
    position: absolute;
    inset: 0 auto 0 0;
    /* The world layer covers the whole stage, so it has to let presses on
       empty sky and grass through to the stage's pan handler; only the peach
       and the landmarks take pointers back. */
    pointer-events: none;
    will-change: transform;
}

.road {
    position: absolute;
    left: 0;
    right: 0;
    top: var(--horizon);
    height: 26%;
    background: var(--road);
    border-top: 6px solid #78716c;
}

.road::after {
    content: "";
    position: absolute;
    inset: 45% 0 auto 0;
    height: 6px;
    background: repeating-linear-gradient(
        to right,
        #fef9c3 0 46px,
        transparent 46px 96px
    );
}

.idler {
    position: absolute;
    /* Draggable and throwable for fun; dropping one has no effect on the
       game, hence aria-hidden despite being interactive. */
    pointer-events: auto;
    cursor: grab;
    touch-action: none;
}

.idler:active {
    cursor: grabbing;
}

.idler-emoji {
    display: inline-block;
    font-size: clamp(2rem, 7vmin, 3.25rem);
    line-height: 1;
    animation: idle-bob 2.4s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.37s);
}

.idler-emoji.excited {
    animation: idler-hop 0.6s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.37s);
}

@keyframes idle-bob {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-6px);
    }
}

@keyframes idler-hop {
    0%,
    100% {
        transform: scale(1.15) translateY(0);
    }
    50% {
        transform: scale(1.15) translateY(-10px);
    }
}

.landmark {
    position: absolute;
    pointer-events: auto;
    top: var(--horizon);
    transform: translate(-50%, -100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: 0;
    padding: 0.25rem;
    cursor: pointer;
}

.landmark-emoji {
    font-size: clamp(5rem, 20vmin, 9rem);
    line-height: 1;
    transition: transform 0.18s ease-out;
}

.landmark.near .landmark-emoji,
.landmark:hover .landmark-emoji {
    transform: scale(1.12) translateY(-4px);
}

.signpost {
    max-width: 12rem;
    border-radius: 0.5rem;
    background: #78350f;
    padding: 0.25rem 0.7rem;
    font-size: 0.95rem;
    font-weight: 800;
    color: #fef3c7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.landmark:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 4px;
    border-radius: 0.75rem;
}

.peach {
    position: absolute;
    pointer-events: auto;
    top: calc(var(--horizon) + 5%);
    font-size: clamp(3.25rem, 13vmin, 5.5rem);
    line-height: 1;
    cursor: grab;
    touch-action: none;
    will-change: transform;
}

.hint {
    position: absolute;
    pointer-events: none;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    border-radius: 9999px;
    background: rgb(0 0 0 / 0.55);
    padding: 0.35rem 0.9rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    text-align: center;
}

@media (prefers-reduced-motion: reduce) {
    .cloud {
        animation: none;
    }

    .landmark-emoji {
        transition: none;
    }

    .idler-emoji {
        animation: none;
    }
}
</style>
