<script setup>
import { usePage } from "@inertiajs/vue3";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import { useToot } from "@/composables/useToot";
import { useTranslations } from "@/composables/useTranslations";
import { usePreferredReducedMotion } from "@vueuse/core";
import { computed, nextTick, onBeforeUnmount, onMounted, reactive } from "vue";
import InteractableButton from "../components/InteractableButton.vue";
import FollowBox from "../components/FollowBox.vue";
import { pastTap } from "../components/overlay.js";
import LandmarkTitle from "../components/LandmarkTitle.vue";
import { screenToGround, worldToScreen } from "../composables/projection.js";
import { bobLift } from "../composables/useGamesWorld.js";
import { arrivalSpot, useRoom } from "../composables/useRoom.js";
import { autoTriggers } from "../interactions/index.js";
import { createRoomScene } from "./RoomScene.js";
import { itemBox, ROOM_SIZES, roomLayout } from "./roomLayout.js";

// The `kind: "room"` renderer on the stage's WebGL canvas (issue #130): the
// room's scene graph (RoomScene.js) and a DOM overlay over it with a
// <button> per door and toy, a hit box for dragging the Butt, and the toot
// puffs. The room's behaviour is useRoom's: tap the floor or drag the Butt
// to walk, arrow keys walk four ways, Tab stands the Butt at each thing in
// turn and Enter uses it. Rooms need WebGL; the stage doesn't send a
// browser without it into one. Loaded only when a door is first used.
const props = defineProps({
    scene: { type: Object, required: true },
    // { beginGesture(handlers) -> stage rect, resetScroll(), renderer }
    stage: { type: Object, required: true },
    // How the room was reached (useSceneRouter's `arrival`).
    arrival: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["activate"]);

const { t } = useTranslations();
const page = usePage();

const prefersReducedMotion = usePreferredReducedMotion();
const reduced = computed(() => prefersReducedMotion.value === "reduce");

const bounds = reactive({ w: 0, h: 0 });
const layout = computed(() =>
    bounds.w ? roomLayout(props.scene, bounds) : null
);

// The interactable last used, to put focus back on.
let lastUsed = null;

const room = useRoom(props.scene, {
    start: arrivalSpot(props.scene, props.arrival),
    autoTriggers,
    isReducedMotion: () => reduced.value,
    onArrive(item) {
        lastUsed = item.id;
        emit("activate", item);
    },
});
const { butt } = room;

// The walking bob, as height above the floor, as on the road.
const buttLift = computed(() => bobLift(butt.bob));

const {
    puffs,
    toot: tootAt,
    unlock: unlockToot,
} = useToot(page.props.fartSoundUrl);

// --- Scene graph -----------------------------------------------------------

let graph = null;
let stopFrames = null;

onMounted(() => {
    const { renderer } = props.stage;
    graph = createRoomScene(renderer.three, renderer.kit, {
        room: props.scene,
        butt,
        theme: page.props.theme,
    });
    if (layout.value) graph.layout(layout.value);
    renderer.show(graph.scene, graph.camera);
    stopFrames = renderer.onFrame((dt) => {
        room.step(dt);
        return graph.sync(
            { butt, buttLift: buttLift.value, reduced: reduced.value },
            dt
        );
    });
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

/** Screen px of world point { x, y, z }. */
const project = (point) => worldToScreen(layout.value.camera, point);

/** Each interactable's button, over what the canvas draws there: a door's
 * whole frame, a toy's square. The camera only moves with the stage's size,
 * so neither do these. */
const spots = computed(() => {
    if (!layout.value) return [];
    return props.scene.interactables.map((item) => {
        const p = project({ x: item.x, y: item.y ?? 0, z: item.z ?? 0 });
        const box = itemBox(item);
        return {
            item,
            x: p.x,
            y: p.y,
            width: box.width * p.scale,
            height: box.height * p.scale,
            titled: box.titled,
        };
    });
});

/** Where the Butt's hit box goes: read by FollowBox, so the overlay
 * doesn't re-render as it walks. */
function buttSpot() {
    if (!layout.value) return null;
    const p = project({ x: butt.x, y: buttLift.value, z: butt.z });
    return { x: p.x, y: p.y, size: ROOM_SIZES.butt * p.scale };
}

const buttons = {};
function setButton(id, el) {
    if (el) buttons[id] = el;
    else delete buttons[id];
}

// A press on a button focuses it before its click: that focus came from a
// pointer, so the Butt should walk there (on the click), not jump.
let pointerFocus = false;

/** Keyboard focus stands the Butt at the thing, as on the road. */
function onItemFocus(item) {
    if (!pointerFocus) room.standBy(item);
    pointerFocus = false;
    props.stage.resetScroll();
}

/** A click (or Enter) on a thing: walk there and use it. Clears the
 * pointer flag too, for browsers that don't focus a clicked button. */
function onItemClick(item) {
    pointerFocus = false;
    room.goUse(item);
}

function focusItem(id) {
    buttons[id]?.focus({ preventScroll: true });
    props.stage.resetScroll();
}

// Things that just did something, under reduced motion: a ring on their
// button stands in for the move.
const used = reactive(new Set());
const USED_MS = 600;

/** Plays `move` on thing `id` (ctx.animate). */
function animate(id, move) {
    graph?.animate(id, move);
    if (!reduced.value) return;
    used.add(id);
    setTimeout(() => used.delete(id), USED_MS);
}

/** Toots as `castId` at thing `id` (ctx.toot). */
function toot(castId, id) {
    tootAt(castId, pointOf(id));
}

/** Switches room light `id` (ctx.toggleLight). */
function toggleLight(id) {
    graph?.toggleLight(id);
    props.stage.renderer.invalidate();
}

/** Where thing `id` is on the stage (its middle), for the dolly and puffs. */
function pointOf(id) {
    const s = spots.value.find((spot) => spot.item.id === id);
    return s ? { x: s.x, y: s.y - s.height / 2 } : null;
}

// --- Pointer ---------------------------------------------------------------

/** The floor under a pointer event in a gesture over `rect`, `grab` px
 * above where the feet would be. */
function floorAt(event, rect, grab = 0) {
    return screenToGround(
        layout.value.camera,
        event.clientX - rect.left,
        event.clientY - rect.top + grab
    );
}

function onButtPointerDown(event) {
    if (room.state.frozen || event.button > 0 || !layout.value) return;
    let grab = 0;
    const rect = props.stage.beginGesture({
        move(e) {
            e.preventDefault();
            const floor = floorAt(e, rect, grab);
            if (floor) room.updateDrag(floor.x, floor.z);
        },
        end: () => room.endDrag(),
        cancel: () => room.cancelDrag(),
    });
    // Held anywhere on the Butt, it's dragged by its feet.
    grab = buttSpot().y - (event.clientY - rect.top);
    room.startDrag();
}

/** A tap on the bare floor walks the Butt there. */
function onBackgroundPointerDown(event) {
    if (room.state.frozen || event.button > 0 || !layout.value) return;
    const start = { clientX: event.clientX, clientY: event.clientY };
    let tap = true;
    const rect = props.stage.beginGesture({
        move(e) {
            if (pastTap(start, e)) tap = false;
        },
        end() {
            const floor = tap && floorAt(start, rect);
            if (floor) room.walkTo(floor.x, floor.z);
        },
        cancel() {},
    });
}

// --- Keyboard ----------------------------------------------------------------

const KEYS = {
    ArrowLeft: ["x", -1],
    ArrowRight: ["x", 1],
    ArrowUp: ["z", -1],
    ArrowDown: ["z", 1],
};

function onKeydown(event) {
    const key = KEYS[event.key];
    if (!key) return;
    event.preventDefault();
    // Walking off leaves whatever button was focused behind: Enter should
    // use what the Butt is standing at, not that.
    if (event.target !== event.currentTarget) props.stage.focus();
    room.setKey(...key);
}

function onKeyup(event) {
    const key = KEYS[event.key];
    // Only the direction still held on that axis stops it.
    if (key && room.state.keys[key[0]] === key[1]) room.setKey(key[0], 0);
}

/** Enter on the stage: whatever the Butt is standing at. */
function activateNearest() {
    if (room.nearest.value) room.goUse(room.nearest.value);
}

defineExpose({
    setBounds,
    pause: room.halt,
    resume: () => {},
    interrupt: room.halt,
    onKeydown,
    onKeyup,
    activateNearest,
    unfreeze: room.unfreeze,
    release() {
        room.unfreeze();
        nextTick(() => lastUsed && focusItem(lastUsed));
    },
    focusItem,
    pointOf,
    position: () => ({ x: butt.x, z: butt.z }),
    animate,
    toot,
    toggleLight,
});
</script>

<template>
    <div
        class="room-3d"
        @pointerdown.self="onBackgroundPointerDown"
        @pointerup="unlockToot"
    >
        <template v-if="layout">
            <!-- Under the buttons: a toy in front of the Butt still takes
                 the tap. -->
            <FollowBox
                class="peach"
                role="img"
                :aria-label="t('games.world.peach_aria')"
                :at="buttSpot"
                @pointerdown.prevent="onButtPointerDown"
            />
            <InteractableButton
                v-for="s in spots"
                :key="s.item.id"
                :ref="(el) => setButton(s.item.id, el)"
                class="room-item"
                :class="{ used: used.has(s.item.id) }"
                :x="s.x"
                :y="s.y"
                :size="s.width"
                :height="s.height"
                :label="s.item.label"
                @pointerdown="pointerFocus = true"
                @focus="onItemFocus(s.item)"
                @click="onItemClick(s.item)"
            >
                <LandmarkTitle
                    v-if="s.titled"
                    :id="`room-${s.item.id}`"
                    :name="s.item.label"
                />
            </InteractableButton>

            <TootPuff
                v-for="puff in puffs"
                :key="puff.id"
                :style="{ left: `${puff.x}px`, top: `${puff.y}px` }"
            />
        </template>
    </div>
</template>

<style scoped>
.room-3d {
    position: absolute;
    inset: 0;
}

/* The Butt's hit box over what the canvas draws: invisible, but it takes
   the pointer. */
.peach {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: auto;
    touch-action: none;
    cursor: grab;
    will-change: transform;
}

.peach:active {
    cursor: grabbing;
}

/* Under reduced motion, a toy that was used rings rather than moves. */
.room-item.used {
    border-radius: 0.75rem;
    box-shadow: 0 0 0 4px #facc15;
}
</style>
