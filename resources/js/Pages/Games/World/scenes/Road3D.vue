<script setup>
import { usePage } from "@inertiajs/vue3";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import TiltPermissionButton from "@/Components/TiltPermissionButton.vue";
import { useDarkMode } from "@/composables/useDarkMode";
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
import { boxStyle } from "../components/overlay.js";
import LandmarkTitle from "../components/LandmarkTitle.vue";
import SkyLogo from "../components/SkyLogo.vue";
import { screenToGround, worldToScreen } from "../composables/projection.js";
import { useRoad } from "../composables/useRoad.js";
import { worldNight, worldTheme } from "../three/themes.js";
import { createRoadScene } from "./RoadScene.js";
import { buildingBox, roadCamera, roadLayout } from "./roadLayout.js";

// The `kind: "road"` renderer on the stage's WebGL canvas (issue #130): the
// road's scene graph (RoadScene.js) on the stage's renderer, and a DOM
// overlay over it for everything you can touch: a <button> per landmark
// (with its gold title), hit boxes for the Butt and the idlers, and the toot
// puffs. The road's behaviour is useRoad's, shared with the DOM fallback
// (RoadScene.vue); the stage drives this through the same exposed API.
const props = defineProps({
    scene: { type: Object, required: true },
    // { beginGesture(handlers) -> stage rect, resetScroll(), renderer }
    stage: { type: Object, required: true },
    // How the road was reached (useSceneRouter's `arrival`).
    arrival: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["activate"]);

const { t } = useTranslations();
const page = usePage();
const dark = useDarkMode();

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
    lanes: true,
    // A drag's x is the flat road's: the camera keeps the Butt at that
    // screen x on either lane (roadCamera), so a finger anywhere on it moves
    // it the same. Its side is where the Butt's feet would be under the
    // finger, on the ground.
    dragTo(start, rect) {
        const feet = peachSpot.value;
        const grab = feet ? feet.y - (start.clientY - rect.top) : 0;
        return (event) => {
            const sx = event.clientX - rect.left;
            const ground = screenToGround(
                view.value,
                sx,
                event.clientY - rect.top + grab
            );
            return {
                x: camera.x + sx,
                side: ground ? layout.value.sideAt(ground.z) : "far",
            };
        };
    },
    // A tap on the street sends the Butt to that spot, on that side; one on
    // the sky or the scenery behind the street, nowhere. Its x is the flat
    // road's, as a drag's, which is where the Butt will be drawn.
    tapTo(event, rect) {
        const sx = event.clientX - rect.left;
        const ground =
            view.value &&
            screenToGround(view.value, sx, event.clientY - rect.top);
        if (!ground || ground.z < layout.value.z.buildings) return null;
        return { x: camera.x + sx, side: layout.value.sideAt(ground.z) };
    },
    // At the middle of the Butt, in world units; the overlay projects it.
    buttPuffAt: () => ({
        x: peach.x,
        y: (layout.value?.sizes.butt ?? 0) / 2 + peachLift.value,
    }),
    // Idlers stand further back, where a screen px is more than a unit.
    idlerDxToWorld: (idler, dx) =>
        dx * (layout.value?.idlerPerPx(idler.row) ?? 1),
    ownLoop: false,
    peekTarget: sceneEl,
});

/** The depth the Butt walks at, between its lanes. */
const buttZ = computed(() => layout.value?.laneZ(peach.lane) ?? 0);

/** The projection.js camera for this frame. */
const view = computed(() =>
    layout.value
        ? roadCamera(
              layout.value,
              camera.x,
              peekX.value,
              peekY.value,
              // On the far lane the Butt needs no help, and leaving it out
              // keeps the view (and the overlay) still while it walks.
              peach.lane ? { x: peach.x, z: buttZ.value } : null
          )
        : null
);

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
        nightTheme: worldNight(page.props.theme),
        night: dark.value,
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

watch(dark, (on) => graph?.setNight(on));

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

// Along the road, the far side before the near side at the same x: the
// order Tab walks them in.
const landmarksInOrder = computed(() =>
    [...landmarks.value].sort(
        (a, b) => a.x - b.x || (a.side === "near") - (b.side === "near")
    )
);

// The landmarks' buildings, which change only with the stage's size.
const landmarkBoxes = computed(() =>
    layout.value
        ? landmarks.value.map((landmark) => buildingBox(layout.value, landmark))
        : []
);

/** Each landmark's button covers its building's front, roof and all. */
const landmarkSpots = computed(() => {
    if (!view.value) return {};
    return Object.fromEntries(
        landmarks.value.map((landmark, i) => {
            const box = landmarkBoxes.value[i];
            const p = worldToScreen(view.value, { x: box.x, z: box.z });
            return [
                landmark.slug,
                {
                    x: p.x,
                    y: p.y,
                    width: box.width * p.scale,
                    height: (box.height + box.roof) * p.scale,
                },
            ];
        })
    );
});

const idlerSpots = computed(() => {
    const L = layout.value;
    if (!view.value) return [];
    return idlers.value.map((idler) => {
        const perPx = L.idlerPerPx(idler.row);
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
        ? spot(peach.x, buttZ.value, layout.value.sizes.butt, peachLift.value)
        : null
);

const puffSpots = computed(() =>
    view.value
        ? puffs.value.map((puff) => ({
              id: puff.id,
              ...worldToScreen(view.value, {
                  x: puff.x,
                  y: puff.y,
                  z: buttZ.value,
              }),
          }))
        : []
);

// Moves with the peek like the flat road's sky, and stays centred.
const skyLogoStyle = computed(() => ({
    transform: `translateX(-50%) translate3d(${peekX.value * 4}px, ${
        peekY.value * 3
    }px, 0)`,
}));

/** Where a landmark is on the stage (the middle of its building), for the
 * stage to dolly toward. */
function pointOf(id) {
    const s = landmarkSpots.value[id];
    return s ? { x: s.x, y: s.y - s.height / 2 } : null;
}

defineExpose({ ...api, setBounds, pointOf });
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
                v-for="landmark in landmarksInOrder"
                :key="landmark.slug"
                :ref="(el) => setLandmarkEl(landmark.slug, el)"
                class="landmark"
                :x="landmarkSpots[landmark.slug].x"
                :y="landmarkSpots[landmark.slug].y"
                :size="landmarkSpots[landmark.slug].width"
                :height="landmarkSpots[landmark.slug].height"
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

/* The idlers are draggable and throwable for fun; dropping one has no
   effect on the game, hence aria-hidden despite being interactive. */
.idler,
.peach {
    cursor: grab;
}

.idler:active,
.peach:active {
    cursor: grabbing;
}
</style>
