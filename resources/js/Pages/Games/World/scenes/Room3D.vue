<script setup>
import { usePage } from "@inertiajs/vue3";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import { castInDom } from "@/constants/characters.js";
import { useToot } from "@/composables/useToot";
import { useTranslations } from "@/composables/useTranslations";
import { usePreferredReducedMotion } from "@vueuse/core";
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref,
} from "vue";
import InteractableButton from "../components/InteractableButton.vue";
import FollowBox from "../components/FollowBox.vue";
import { pastTap } from "../components/overlay.js";
import LandmarkTitle from "../components/LandmarkTitle.vue";
import { screenToGround, worldToScreen } from "../composables/projection.js";
import { bobLift } from "../composables/useGamesWorld.js";
import { arrivalSpot, useRoom } from "../composables/useRoom.js";
import { autoTriggers } from "../interactions/index.js";
import { createRoomScene } from "./RoomScene.js";
import {
    itemBox,
    itemPose,
    ROOM_SIZES,
    roomCamera,
    roomLayout,
    roomLook,
} from "./roomLayout.js";

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

const start = arrivalSpot(props.scene, props.arrival);
// Where the camera looks along the room. A hall longer than the frame
// scrolls to keep the Butt in view; anything else stays put.
const lookX = ref(start.x);
const view = computed(() =>
    layout.value ? roomCamera(layout.value, lookX.value) : null
);

const room = useRoom(props.scene, {
    start,
    autoTriggers,
    isReducedMotion: () => reduced.value,
    onArrive(item) {
        lastUsed = item.id;
        emit("activate", item);
    },
});
const { butt } = room;

/** Follows the Butt down a long room, and leaves a short one alone. */
function follow() {
    if (!layout.value) return;
    lookX.value = roomLook(layout.value.pan, lookX.value, butt.x);
}

/** The laid-out room with the camera aimed where `follow` left it. */
function framed() {
    follow();
    return layout.value && { ...layout.value, camera: view.value };
}

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
    const frame = framed();
    if (frame) graph.layout(frame);
    renderer.show(graph.scene, graph.camera);
    stopFrames = renderer.onFrame((dt) => {
        room.step(dt);
        follow();
        return graph.sync(
            {
                butt,
                buttLift: buttLift.value,
                reduced: reduced.value,
                camera: view.value,
            },
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
    const frame = framed();
    if (graph && frame) {
        graph.layout(frame);
        props.stage.renderer.invalidate();
    }
}

// --- Overlay ---------------------------------------------------------------

/** Screen px of world point { x, y, z }, through the camera that follows
 * the Butt. */
const project = (point) => worldToScreen(view.value, point);

/** Each interactable's button, over what the canvas draws there: a door's
 * whole frame, a toy's square. These move when a long hall scrolls. */
const spots = computed(() => {
    if (!view.value) return [];
    return props.scene.interactables.flatMap((item) => {
        const pose = itemPose(item);
        const p = project(pose);
        if (!p) return [];
        const box = itemBox(item);
        return {
            item,
            x: p.x,
            y: p.y,
            width: box.width * p.scale,
            height: box.height * p.scale,
            titled: box.titled,
            // A cast member with no emoji (the Face) is drawn in the DOM,
            // over its anchor in the scene graph.
            overlay: castInDom(item.cast),
        };
    });
});

/** Where the Butt's hit box goes: read by FollowBox, so the overlay
 * doesn't re-render as it walks. */
function buttSpot() {
    if (!view.value) return null;
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
    if (!pointerFocus) {
        room.standBy(item);
        follow();
    }
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
        view.value,
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
                <CastMember
                    v-if="s.overlay"
                    :id="s.item.cast"
                    class="room-overlay"
                    :size="`${s.height}px`"
                />
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

/* Stands on the button's floor, as the canvas would draw it. */
.room-overlay {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    pointer-events: none;
}

/* Under reduced motion, a toy that was used rings rather than moves. */
.room-item.used {
    border-radius: 0.75rem;
    box-shadow: 0 0 0 4px #facc15;
}
</style>
