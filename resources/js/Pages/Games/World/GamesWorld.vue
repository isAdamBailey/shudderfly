<script setup>
import { usePage } from "@inertiajs/vue3";
import { BUTT, TOOT_FOODS } from "@/constants/characters.js";
import { useTranslations } from "@/composables/useTranslations";
import {
    useParallax,
    usePreferredReducedMotion,
    useTransition,
} from "@vueuse/core";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import GameConfirmCard from "./components/GameConfirmCard.vue";
import TiltPermissionButton from "@/Components/TiltPermissionButton.vue";
import { clamp, useGamesWorld } from "./composables/useGamesWorld.js";
import { deadband } from "@/utils/math";
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

const prefersReducedMotion = usePreferredReducedMotion();
const reduced = computed(() => prefersReducedMotion.value === "reduce");

const world = useGamesWorld(
    computed(() => props.games),
    {
        isReducedMotion: () => reduced.value,
    }
);
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
    isReducedMotion: () => reduced.value,
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
                      transform: `translate(-50%, -50%) translate(${p.dx}px, ${
                          p.dy
                      }px) rotate(${
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

// --- Peek -----------------------------------------------------------------

// The same useParallax the book cover uses, but pointed only at the scenery.
// The pointer here already belongs to gameplay — dragging the peach, panning
// the stage, throwing the idlers — and pointerToWorld() derives world
// coordinates from clientX, so anything inside .world must stay untransformed
// or drags and SNAP_RADIUS arrivals desync. Only the three pointer-events:none
// backdrop layers move.
const PEEK = {
    // px of travel at full deflection. Graded by depth: the ridge sits far
    // away and barely shifts, the clouds are overhead and shift most.
    sky: { x: 4, y: 3 },
    hills: { x: 8, y: 4 },
    clouds: { x: 22, y: 14 },
};

const { tilt, roll } = useParallax(stageEl, {
    // Doubled so tilt/roll span [-1, 1] and the PEEK numbers above are the
    // actual px maxima rather than half of them.
    mouseTiltAdjust: (i) => i * 2,
    mouseRollAdjust: (i) => i * 2,
    deviceOrientationTiltAdjust: (i) => i * 2,
    deviceOrientationRollAdjust: (i) => i * 2,
});

// Deadband first: raw deviceorientation jitters by fractions of a degree even
// on a stationary table, and without this the backdrop never fully settles.
// It also screens out the NaN useParallax emits before the stage has been
// measured, which would otherwise latch inside useTransition — see deadband().
const PEEK_DEADBAND = 0.005;
// Clamped because the device-orientation path is unbounded in a way the mouse
// path is not: gamma runs to 90deg, which the doubling above turns into 2, and
// a phone held sideways would otherwise swing the clouds twice as far as the
// PEEK maxima promise.
// useParallax names its outputs for a device's axes, not the screen's: `tilt`
// is the horizontal source ((x - w/2)/w) and `roll` the vertical one. Mapping
// them the other way round makes the backdrop peek 90deg off-axis. `roll` is
// negated so both axes carry the backdrop the same way the pointer moves.
//
// Kept as two scalar tweens rather than one array source: a computed returning
// a fresh array is never Object.is-equal to the last, so useTransition's watch
// would refire on every jittering deviceorientation event and restart a 150ms
// rAF chain forever — exactly the settling the deadband exists to produce.
const rawPeekX = computed(() =>
    reduced.value ? 0 : clamp(deadband(tilt.value, PEEK_DEADBAND), -1, 1)
);
const rawPeekY = computed(() =>
    reduced.value ? 0 : clamp(deadband(-roll.value, PEEK_DEADBAND), -1, 1)
);
const peekX = useTransition(rawPeekX, { duration: 150 });
const peekY = useTransition(rawPeekY, { duration: 150 });

function peekTranslate({ x, y }) {
    return `translate3d(${peekX.value * x}px, ${peekY.value * y}px, 0)`;
}

// --- Styles ---------------------------------------------------------------

const skyStyle = computed(() => ({ transform: peekTranslate(PEEK.sky) }));

// Centered independently of the peek shift: the sky itself is a full-bleed
// layer that doesn't need centering, but the logo has an intrinsic width and
// has to stay anchored to the horizontal middle regardless of tilt.
const skyLogoStyle = computed(() => ({
    transform: `translateX(-50%) ${peekTranslate(PEEK.sky)}`,
}));

// Per-landmark arc geometry for the title, keyed by slug. The viewBox widens
// with name length and the <svg> is left unsized in CSS, so it renders at its
// intrinsic viewBox-to-px size (1 user unit = 1px) — every name gets the same
// font size, and a long one simply produces a wider arc that overflows past
// the icon rather than being squeezed to fit a fixed-width box.
const TITLE_CHAR_WIDTH = 17;
const TITLE_MIN_WIDTH = 150;
const TITLE_HEIGHT = 70;
const landmarkTitleGeom = computed(() =>
    Object.fromEntries(
        landmarks.value.map((landmark) => {
            const width = Math.max(
                TITLE_MIN_WIDTH,
                Math.round(landmark.name.length * TITLE_CHAR_WIDTH + 40)
            );
            const path = `M 12 ${TITLE_HEIGHT - 8} Q ${width / 2} 4 ${
                width - 12
            } ${TITLE_HEIGHT - 8}`;
            return [landmark.slug, { width, path }];
        })
    )
);

const cloudsStyle = computed(() => ({ transform: peekTranslate(PEEK.clouds) }));

const worldStyle = computed(() => ({
    width: `${worldWidth.value}px`,
    transform: `translate3d(${-camera.x}px, 0, 0)`,
}));

// The ridge is a repeating tile, so shifting it by the parallax offset modulo
// one tile width scrolls forever without ever exposing a bare edge. The peek
// rides in the same transform string — it's one element, so the two offsets
// can't be declared separately.
const hillStyle = computed(() => ({
    transform: `translate3d(${
        -((camera.x * 0.25) % HILL_TILE) + peekX.value * PEEK.hills.x
    }px, ${peekY.value * PEEK.hills.y}px, 0)`,
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
        <div class="sky" :style="skyStyle" aria-hidden="true"></div>

        <div class="sky-logo" :style="skyLogoStyle" aria-hidden="true">
            <svg
                class="sky-logo-svg"
                viewBox="0 0 400 120"
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <path
                        id="skyLogoArc"
                        d="M 24 100 Q 200 4 376 100"
                        fill="none"
                    />
                    <linearGradient
                        id="skyLogoFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop offset="0" stop-color="#fff7c2" />
                        <stop offset="0.45" stop-color="#ffd23f" />
                        <stop offset="1" stop-color="#f7931e" />
                    </linearGradient>
                </defs>
                <text
                    v-for="depth in 6"
                    :key="depth"
                    class="sky-logo-depth"
                    :dx="depth"
                    :dy="depth"
                >
                    <textPath href="#skyLogoArc" startOffset="50%">
                        {{ t("games.world.title") }}
                    </textPath>
                </text>
                <text class="sky-logo-face">
                    <textPath href="#skyLogoArc" startOffset="50%">
                        {{ t("games.world.title") }}
                    </textPath>
                </text>
            </svg>
        </div>

        <div class="hills-far" :style="hillStyle" aria-hidden="true"></div>
        <div class="clouds" :style="cloudsStyle" aria-hidden="true">
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
                <div class="landmark-title" aria-hidden="true">
                    <svg
                        :width="landmarkTitleGeom[landmark.slug].width"
                        :height="TITLE_HEIGHT"
                        :viewBox="`0 0 ${landmarkTitleGeom[landmark.slug].width} ${TITLE_HEIGHT}`"
                        preserveAspectRatio="xMidYMid meet"
                    >
                        <defs>
                            <path
                                :id="`titleArc-${landmark.slug}`"
                                :d="landmarkTitleGeom[landmark.slug].path"
                                fill="none"
                            />
                            <linearGradient
                                :id="`titleFill-${landmark.slug}`"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0" stop-color="#fff7c2" />
                                <stop offset="0.45" stop-color="#ffd23f" />
                                <stop offset="1" stop-color="#f7931e" />
                            </linearGradient>
                        </defs>
                        <text
                            v-for="depth in 4"
                            :key="depth"
                            class="landmark-title-depth"
                            :dx="depth"
                            :dy="depth"
                        >
                            <textPath
                                :href="`#titleArc-${landmark.slug}`"
                                startOffset="50%"
                                >{{ landmark.name }}</textPath
                            >
                        </text>
                        <text
                            class="landmark-title-face"
                            :style="{
                                fill: `url(#titleFill-${landmark.slug})`,
                            }"
                        >
                            <textPath
                                :href="`#titleArc-${landmark.slug}`"
                                startOffset="50%"
                                >{{ landmark.name }}</textPath
                            >
                        </text>
                    </svg>
                </div>
                <span class="landmark-emoji" aria-hidden="true">{{
                    landmark.landmark
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

        <!-- Outside .world so the camera never carries it off-screen. -->
        <TiltPermissionButton />

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
    /* Overscanned: the peek shifts this layer, and a flush inset would bare an
       edge of the page behind it at full deflection. */
    inset: -12px;
    pointer-events: none;
    will-change: transform;
    background: linear-gradient(
        to bottom,
        var(--sky-top) 0%,
        var(--sky-bottom) var(--horizon),
        var(--grass) var(--horizon),
        var(--grass) 100%
    );
}

.sky-logo {
    /* Anchored to the top edge and clear of the tallest landmark (translated
       up from the horizon by its own emoji height plus its signpost), so a
       landmark spawning early in the world can never render over the logo —
       both live in normal document order with no z-index between them. */
    position: absolute;
    top: 2%;
    left: 50%;
    width: min(60%, 380px);
    pointer-events: none;
    will-change: transform;
}

.sky-logo-svg {
    width: 100%;
    height: auto;
    display: block;
    filter: drop-shadow(0 6px 10px rgb(0 0 0 / 0.18));
}

/* Same glyphs stamped repeatedly, each nudged a pixel further down-right and
   darkened — the classic layered-text trick for a solid extruded edge under
   the curve, since SVG has no real 3D text primitive. */
.sky-logo-depth {
    font-family: "Spicy Rice", ui-rounded, system-ui, sans-serif;
    font-weight: 800;
    font-size: 40px;
    text-anchor: middle;
    fill: #b5590f;
}

.sky-logo-face {
    font-family: "Spicy Rice", ui-rounded, system-ui, sans-serif;
    font-weight: 800;
    font-size: 40px;
    text-anchor: middle;
    fill: url(#skyLogoFill);
    stroke: #7a3b00;
    stroke-width: 3px;
    stroke-linejoin: round;
    paint-order: stroke fill;
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
       ridges rest ON the horizon and the parallax shift never bares an edge.
       The 8px skirt past the horizon does the same for the peek's vertical
       travel: flush against the horizon, an upward peek would open a sliver
       of sky beneath the ridge. */
    inset: 0 -1500px calc(100% - var(--horizon) - 8px) -1500px;
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

/* Same gilded-extrusion look as the sky logo (SVG textPath on an arc, layered
   depth copies, gradient face) rather than a straight line of CSS text — the
   arc bows over the icon's shoulders so a long game name has room to fit
   without truncating. Positioned absolutely and centered so it can freely
   overflow past the icon's own width on either side instead of being
   confined (and shrunk) to it; .landmark's own position:absolute is what
   this is positioned against. */
.landmark-title {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: -0.5rem;
    pointer-events: none;
}

/* No width/height here: left at its intrinsic size, the <svg> renders its
   viewBox 1 user unit = 1px, so every title gets the same font size — a
   longer name widens the arc instead of shrinking to fit a fixed box. */
.landmark-title svg {
    display: block;
    overflow: visible;
}

.landmark-title-depth {
    font-family: "Spicy Rice", ui-rounded, system-ui, sans-serif;
    font-size: 28px;
    text-anchor: middle;
    fill: #b5590f;
}

.landmark-title-face {
    font-family: "Spicy Rice", ui-rounded, system-ui, sans-serif;
    font-size: 28px;
    text-anchor: middle;
    stroke: #7a3b00;
    stroke-width: 2px;
    stroke-linejoin: round;
    paint-order: stroke fill;
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
