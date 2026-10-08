<script setup>
import { usePreferredReducedMotion } from "@vueuse/core";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive } from "vue";
import InteractableButton from "../components/InteractableButton.vue";
import LandmarkTitle from "../components/LandmarkTitle.vue";
import { worldToScreen } from "../composables/projection.js";
import { createRoomScene } from "./RoomScene.js";
import { arrivalSpot, ROOM_SIZES, roomLayout } from "./roomLayout.js";

// The `kind: "room"` renderer on the stage's WebGL canvas (issue #130): the
// room's scene graph (RoomScene.js) and a DOM overlay with a <button> per
// interactable. Rooms need WebGL; the stage doesn't send a browser without
// it into one. It's loaded only when a door is first used, and is a
// placeholder until the room engine (Phase 5) brings walking and toys: the
// Butt stands where it came in, and the doors are the only things to use.
const props = defineProps({
    scene: { type: Object, required: true },
    // { beginGesture(handlers) -> stage rect, resetScroll(), renderer }
    stage: { type: Object, required: true },
    // How the room was reached (useSceneRouter's `arrival`).
    arrival: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["activate"]);

const prefersReducedMotion = usePreferredReducedMotion();
const reduced = computed(() => prefersReducedMotion.value === "reduce");

const bounds = reactive({ w: 0, h: 0 });
const layout = computed(() =>
    bounds.w ? roomLayout(props.scene, bounds) : null
);

const butt = arrivalSpot(props.scene, props.arrival.spot);

// --- Scene graph -----------------------------------------------------------

let graph = null;
let stopFrames = null;

onMounted(() => {
    const { renderer } = props.stage;
    graph = createRoomScene(renderer.three, renderer.kit, {
        room: props.scene,
        butt,
    });
    if (layout.value) graph.layout(layout.value);
    renderer.show(graph.scene, graph.camera);
    stopFrames = renderer.onFrame((dt) =>
        graph.sync({ reduced: reduced.value }, dt)
    );
});

onBeforeUnmount(() => {
    stopFrames?.();
    props.stage.renderer.show(null);
    graph?.dispose();
    graph = null;
});

function setBounds(w, h) {
    bounds.w = w;
    bounds.h = h;
    if (graph && layout.value) {
        graph.layout(layout.value);
        props.stage.renderer.invalidate();
    }
}

// --- Overlay ---------------------------------------------------------------

/** Each interactable's button, over what the canvas draws there. */
const spots = computed(() => {
    if (!layout.value) return [];
    const { camera } = layout.value;
    return props.scene.interactables.map((item) => {
        const p = worldToScreen(camera, { x: item.x, z: item.z ?? 0 });
        return {
            item,
            x: p.x,
            y: p.y,
            width: ROOM_SIZES.door.width * p.scale,
            height: ROOM_SIZES.door.height * p.scale,
        };
    });
});

const buttons = {};
function setButton(id, el) {
    if (el) buttons[id] = el;
    else delete buttons[id];
}

// The interactable last used, to put focus back on.
let lastUsed = null;

function use(item) {
    lastUsed = item.id;
    emit("activate", item);
}

function focusItem(id) {
    buttons[id]?.focus({ preventScroll: true });
    props.stage.resetScroll();
}

/** Enter on the stage: the interactable nearest the Butt. */
function activateNearest() {
    const nearest = [...props.scene.interactables].sort(
        (a, b) =>
            Math.hypot(a.x - butt.x, (a.z ?? 0) - butt.z) -
            Math.hypot(b.x - butt.x, (b.z ?? 0) - butt.z)
    )[0];
    if (nearest) use(nearest);
}

function pointOf(id) {
    const s = spots.value.find((spot) => spot.item.id === id);
    return s ? { x: s.x, y: s.y - s.height / 2 } : null;
}

// Nothing walks yet, so there is nothing to pause, interrupt or unfreeze.
const idle = () => {};

defineExpose({
    setBounds,
    pause: idle,
    resume: idle,
    interrupt: idle,
    onKeydown: idle,
    onKeyup: idle,
    unfreeze: idle,
    activateNearest,
    release: () => nextTick(() => lastUsed && focusItem(lastUsed)),
    focusItem,
    pointOf,
    // Rooms start where you come in, so there is nothing to save yet.
    position: () => null,
});
</script>

<template>
    <div class="room-3d">
        <InteractableButton
            v-for="s in spots"
            :key="s.item.id"
            :ref="(el) => setButton(s.item.id, el)"
            class="room-item"
            :x="s.x"
            :y="s.y"
            :size="s.width"
            :height="s.height"
            :label="s.item.label"
            @click="use(s.item)"
        >
            <LandmarkTitle :id="`room-${s.item.id}`" :name="s.item.label" />
        </InteractableButton>
    </div>
</template>

<style scoped>
.room-3d {
    position: absolute;
    inset: 0;
}
</style>
