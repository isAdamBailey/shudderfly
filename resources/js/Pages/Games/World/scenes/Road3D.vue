<script setup>
import { usePage } from "@inertiajs/vue3";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import TiltPermissionButton from "@/Components/TiltPermissionButton.vue";
import { useTranslations } from "@/composables/useTranslations";
import {
    computed,
    onBeforeUnmount,
    onMounted,
    reactive,
    shallowRef,
    watch,
} from "vue";
import InteractableButton from "../components/InteractableButton.vue";
import LandmarkTitle from "../components/LandmarkTitle.vue";
import SkyLogo from "../components/SkyLogo.vue";
import { screenToPlane, worldToScreen } from "../composables/projection.js";
import { useRoad } from "../composables/useRoad.js";
import { worldTheme } from "../three/themes.js";
import { createRoadScene } from "./RoadScene.js";
import { roadCamera, roadLayout } from "./roadLayout.js";

// The `kind: "road"` renderer on the stage's WebGL canvas (issue #130): the
// road's scene graph (RoadScene.js) on the stage's renderer, and a DOM
// overlay over it for everything you can touch: a <button> per landmark
// (with its gold title), hit boxes for the Butt and the idlers, and the toot
// puffs. The road's behaviour is useRoad's, shared with the DOM fallback
// (RoadScene.vue); the stage drives this through the same exposed API.
const props = defineProps({
    scene: { type: Object, required: true },
    // { beginGesture(handlers) -> stage left px, resetScroll(), renderer }
    stage: { type: Object, required: true },
});

const emit = defineEmits(["activate"]);

const { t } = useTranslations();
const page = usePage();

const sceneEl = shallowRef(null);
const bounds = reactive({ w: 0, h: 0, vmin: 0 });
const layout = computed(() => (bounds.w ? roadLayout(bounds) : null));

const {
    world,
    landmarks,
    peach,
    camera,
    nearestLandmark,
    reduced,
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
    // The Butt walks the plane z = 0, so that is where a drag lands. On that
    // plane the camera draws 1 px per unit: the same x the flat road gave.
    toWorldX: (event, left) =>
        screenToPlane(view.value, event.clientX - left, 0).x,
    // At the middle of the Butt, in world units; the overlay projects it.
    buttPuffAt: () => ({
        x: peach.x,
        y: (layout.value?.sizes.butt ?? 0) / 2 + peachLift.value,
    }),
    // Idlers stand further back, where a screen px is more than a unit.
    idlerDxToWorld: (idler, dx) => dx / idlerScale(idler),
    ownLoop: false,
    peekTarget: sceneEl,
});

/** The projection.js camera for this frame. */
const view = computed(() =>
    layout.value
        ? roadCamera(layout.value, camera.x, peekX.value, peekY.value)
        : null
);

function idlerScale(idler) {
    const L = layout.value;
    return L ? L.scaleAt(L.z.idlers[idler.row]) : 1;
}

// --- Scene graph -----------------------------------------------------------

let graph = null;
let stopFrames = null;

// A landmark hovered by a pointer grows like the one the Butt is at.
const hovered = shallowRef(null);

function onFrame(dt) {
    world.step(dt);
    if (!view.value) return false;
    return graph.sync(
        {
            camera: view.value,
            peach,
            peachLift: peachLift.value,
            idlers: idlers.value,
            near: nearestLandmark.value?.slug ?? null,
            hovered: hovered.value,
            reduced: reduced.value,
        },
        dt
    );
}

onMounted(() => {
    const { renderer } = props.stage;
    graph = createRoadScene(renderer.three, renderer.kit, {
        theme: worldTheme(page.props.theme),
        landmarks: landmarks.value,
        idlers: idlers.value,
    });
    for (const landmark of landmarks.value) {
        if (landmark.cast) {
            setLandmarkCast(landmark.slug, graph.landmarkPuppet(landmark.slug));
        }
    }
    buttCast.value = graph.butt;
    if (layout.value) graph.layout(layout.value, world.worldWidth.value);
    renderer.show(graph.scene, graph.camera);
    stopFrames = renderer.onFrame(onFrame);
});

watch([layout, world.worldWidth], ([L, worldWidth]) => {
    if (L && graph) {
        graph.layout(L, worldWidth);
        props.stage.renderer.invalidate();
    }
});

onBeforeUnmount(() => {
    stopFrames?.();
    props.stage.renderer.show(null);
    for (const landmark of landmarks.value)
        setLandmarkCast(landmark.slug, null);
    buttCast.value = null;
    graph?.dispose();
    graph = null;
});

function setBounds(w, h) {
    bounds.w = w;
    bounds.h = h;
    // The flat road sized things in CSS vmin, which is the viewport's.
    bounds.vmin = Math.min(window.innerWidth, window.innerHeight);
    world.setBounds(w, h);
}

// --- Overlay ---------------------------------------------------------------

/** Screen box of something drawn at world (x, z), `size` units tall, its
 * feet `lift` units up. */
function spot(x, z, size, lift = 0) {
    const p = worldToScreen(view.value, { x, y: lift, z });
    return { x: p.x, y: p.y, size: size * p.scale };
}

const landmarkSpots = computed(() => {
    const L = layout.value;
    if (!view.value) return {};
    return Object.fromEntries(
        landmarks.value.map((landmark) => [
            landmark.slug,
            spot(landmark.x, L.z.landmark, L.sizes.landmark),
        ])
    );
});

const idlerSpots = computed(() => {
    const L = layout.value;
    if (!view.value) return [];
    return idlers.value.map((idler) => {
        const perPx = 1 / idlerScale(idler);
        return {
            idler,
            ...spot(
                idler.x + idler.dx * perPx,
                L.z.idlers[idler.row],
                L.sizes.idlers[idler.row],
                idler.lift * perPx
            ),
        };
    });
});

const peachSpot = computed(() =>
    view.value
        ? spot(peach.x, 0, layout.value.sizes.butt, peachLift.value)
        : null
);

const puffSpots = computed(() =>
    view.value
        ? puffs.value.map((puff) => ({
              id: puff.id,
              ...worldToScreen(view.value, { x: puff.x, y: puff.y, z: 0 }),
          }))
        : []
);

function boxStyle({ x, y, size }) {
    return {
        width: `${size}px`,
        height: `${size}px`,
        transform: `translate3d(${x - size / 2}px, ${y - size}px, 0)`,
    };
}

// Moves with the peek like the flat road's sky, and stays centred.
const skyLogoStyle = computed(() => ({
    transform: `translateX(-50%) translate3d(${peekX.value * 4}px, ${
        peekY.value * 3
    }px, 0)`,
}));

defineExpose({ ...api, setBounds });
</script>

<template>
    <div
        ref="sceneEl"
        class="road-3d"
        @pointerdown.self="onBackgroundPointerDown"
        @pointerup="unlockToot"
    >
        <SkyLogo :style="skyLogoStyle" />

        <template v-if="view">
            <span
                v-for="s in idlerSpots"
                :key="s.idler.slug"
                class="idler"
                :style="boxStyle(s)"
                aria-hidden="true"
                @pointerdown.prevent="onIdlerPointerDown(s.idler.slug, $event)"
            ></span>

            <InteractableButton
                v-for="landmark in landmarks"
                :key="landmark.slug"
                :ref="(el) => setLandmarkEl(landmark.slug, el)"
                class="landmark"
                :x="landmarkSpots[landmark.slug].x"
                :y="landmarkSpots[landmark.slug].y"
                :width="landmarkSpots[landmark.slug].size"
                :height="landmarkSpots[landmark.slug].size"
                :label="t('games.world.landmark_aria', { game: landmark.name })"
                @focus="onLandmarkFocus(landmark.slug)"
                @click="world.openConfirm(landmark.slug)"
                @pointerenter="hovered = landmark.slug"
                @pointerleave="hovered = null"
            >
                <LandmarkTitle :id="landmark.slug" :name="landmark.name" />
            </InteractableButton>

            <div
                class="peach"
                role="img"
                :aria-label="t('games.world.peach_aria')"
                :style="boxStyle(peachSpot)"
                @pointerdown.prevent="onPeachPointerDown"
            ></div>

            <TootPuff
                v-for="puff in puffSpots"
                :key="puff.id"
                :style="{ left: `${puff.x}px`, top: `${puff.y}px` }"
            />
        </template>

        <TiltPermissionButton />
    </div>
</template>

<style scoped>
.road-3d {
    position: absolute;
    inset: 0;
}

/* Hit boxes over what the canvas draws: invisible, but they take the
   pointer, as the flat road's elements did. */
.idler,
.peach {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: auto;
    touch-action: none;
    will-change: transform;
}

.idler {
    /* Draggable and throwable for fun; dropping one has no effect on the
       game, hence aria-hidden despite being interactive. */
    cursor: grab;
}

.idler:active,
.peach:active {
    cursor: grabbing;
}

.peach {
    cursor: grab;
}
</style>
