<script setup>
import { usePage } from "@inertiajs/vue3";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import { useTranslations } from "@/composables/useTranslations";
import { computed, ref } from "vue";
import TiltPermissionButton from "@/Components/TiltPermissionButton.vue";
import LandmarkTitle from "../components/LandmarkTitle.vue";
import SkyLogo from "../components/SkyLogo.vue";
import { useRoad } from "../composables/useRoad.js";

// The `kind: "road"` renderer for when WebGL isn't available (Road3D.vue is
// the WebGL one): the road drawn in the DOM, as it was before the 3D world.
// The road's behaviour lives in useRoad, shared with Road3D; this only draws
// it. The stage (GamesWorld.vue) owns the stage box, window pointer
// listeners, keyboard routing and cards, and drives this through the API
// exposed at the bottom.
const props = defineProps({
    scene: { type: Object, required: true },
    // { beginGesture(handlers) -> stage rect, resetScroll() }
    stage: { type: Object, required: true },
    // How the road was reached (useSceneRouter's `arrival`).
    arrival: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["activate"]);

const { t } = useTranslations();
const page = usePage();

// The road keeps its own sky/grass identity rather than the app's bg-theme-*
// tokens, so seasonal theming is a local class swap of custom properties
// rather than hooking into the global theme system.
const themeClass = computed(() =>
    page.props.theme ? `theme-${page.props.theme}` : null
);

const HILL_TILE = 1500; // px; must match the .hills-far background-size
const CLOUD_COUNT = 4;
const IDLER_DEPTHS = [2, 6, 10]; // % below the horizon, by idler row

const sceneEl = ref(null);
const buttEl = ref(null);

const {
    world,
    landmarks,
    peach,
    camera,
    nearestLandmark,
    idlers,
    puffs,
    unlockToot,
    buttCast,
    peachLift,
    peekX,
    peekY,
    onPeachPointerDown,
    onBackgroundPointerDown,
    onIdlerPointerDown,
    onLandmarkFocus,
    setLandmarkEl,
    setLandmarkCast,
    api,
} = useRoad(props, emit, {
    // The world layer is only ever translated by the camera, so a road x is
    // a screen x plus the camera.
    dragTo: (start, rect) => (event) => ({
        x: event.clientX - rect.left + camera.x,
    }),
    // At the middle of the Butt, as Toot Foods puts it.
    buttPuffAt: () => {
        const butt = buttEl.value;
        return {
            x: peach.x,
            y: butt ? butt.offsetTop + butt.offsetHeight / 2 : 0,
        };
    },
    peekTarget: sceneEl,
});

// --- Peek -----------------------------------------------------------------

// Pointed only at the scenery. dragTo above derives world
// coordinates from clientX, so anything inside .world must stay
// untransformed or drags and SNAP_RADIUS arrivals desync. Only the three
// pointer-events:none backdrop layers move.
const PEEK = {
    // px of travel at full deflection. Graded by depth: the ridge sits far
    // away and barely shifts, the clouds are overhead and shift most.
    sky: { x: 4, y: 3 },
    hills: { x: 8, y: 4 },
    clouds: { x: 22, y: 14 },
};

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

const cloudsStyle = computed(() => ({ transform: peekTranslate(PEEK.clouds) }));

const worldStyle = computed(() => ({
    width: `${world.worldWidth.value}px`,
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
    transform: `translate3d(${peach.x}px, 0, 0) translateX(-50%)`,
}));

defineExpose(api);
</script>

<template>
    <div
        ref="sceneEl"
        class="road-scene"
        :class="themeClass"
        @pointerdown.self="onBackgroundPointerDown"
        @pointerup="unlockToot"
    >
        <div class="sky" :style="skyStyle" aria-hidden="true"></div>

        <SkyLogo :style="skyLogoStyle" />

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
                v-for="idler in idlers"
                :key="idler.slug"
                class="idler"
                :style="{
                    left: `${idler.x}px`,
                    top: `calc(var(--horizon) + ${IDLER_DEPTHS[idler.row]}%)`,
                    transform: `translate(-50%, -50%) translate(${idler.dx}px, 0px)`,
                    '--cast-delay': `${-idler.phase}s`,
                }"
                aria-hidden="true"
                @pointerdown.prevent="onIdlerPointerDown(idler.slug, $event)"
            >
                <CastMember
                    :id="idler.cast"
                    class="idler-cast"
                    :move="idler.excited ? 'excited' : 'idle'"
                    :lift="idler.lift"
                    :tilt="idler.tilt"
                />
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
                <LandmarkTitle :id="landmark.slug" :name="landmark.name" />
                <span class="landmark-emoji" aria-hidden="true">
                    <CastMember
                        v-if="landmark.cast"
                        :id="landmark.cast"
                        :ref="(el) => setLandmarkCast(landmark.slug, el)"
                        :move="null"
                    />
                    <template v-else>{{ landmark.landmark }}</template>
                </span>
            </button>

            <div
                ref="buttEl"
                class="peach"
                role="img"
                :aria-label="t('games.world.peach_aria')"
                :style="peachStyle"
                @pointerdown.prevent="onPeachPointerDown"
            >
                <CastMember
                    id="butt"
                    ref="buttCast"
                    :move="null"
                    :facing="peach.facing < 0 ? 'left' : 'right'"
                    :lift="peachLift"
                />
            </div>

            <TootPuff
                v-for="puff in puffs"
                :key="puff.id"
                :style="{ left: `${puff.x}px`, top: `${puff.y}px` }"
            />
        </div>

        <!-- Outside .world so the camera never carries it off-screen. -->
        <TiltPermissionButton />
    </div>
</template>

<style scoped>
.road-scene {
    --horizon: 60%;
    --sky-top: #7dd3fc;
    --sky-bottom: #dff6ff;
    --hill: #34a06a;
    --grass: #4ade80;
    --road: #a8a29e;
    --drifter: "☁️";

    position: absolute;
    inset: 0;
}

/* Three custom-property overrides per season, nothing else — the road keeps
   its own identity, it doesn't reach into the app's bg-theme-* tokens. */
.road-scene.theme-christmas {
    --sky-top: #bfe6ff;
    --hill: #f8fbff;
    --drifter: "❄️";
}

.road-scene.theme-halloween {
    --sky-top: #4c1d6b;
    --hill: #3a1854;
}

.road-scene.theme-fireworks {
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

.road-scene.theme-christmas .hills-far::after,
.road-scene.theme-halloween .hills-far::after,
.road-scene.theme-fireworks .hills-far::after {
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
       empty sky and grass through to .road-scene's pan handler; only the peach
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

.idler-cast {
    font-size: clamp(2rem, 7vmin, 3.25rem);
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
}
</style>
