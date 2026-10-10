<script setup>
import { usePage } from "@inertiajs/vue3";
import axios from "axios";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import { castInDom } from "@/constants/characters.js";
import { useDarkMode } from "@/composables/useDarkMode";
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
    watch,
} from "vue";
import InteractableButton from "../components/InteractableButton.vue";
import FollowBox from "../components/FollowBox.vue";
import TvScreen from "../components/TvScreen.vue";
import { onButton, pastTap } from "../components/overlay.js";
import LandmarkTitle from "../components/LandmarkTitle.vue";
import {
    screenToGround,
    spanAt,
    worldToScreen,
} from "../composables/projection.js";
import { bobLift } from "../composables/useGamesWorld.js";
import { arrivalSpot, useRoom } from "../composables/useRoom.js";
import { useShelves } from "../composables/useShelves.js";
import { useTvChannels } from "../composables/useTvChannels.js";
import { autoTriggers } from "../interactions/index.js";
import { BOOKCASE, bookcaseHeight, shelfEnd, slotsIn } from "./bookshelf.js";
import { createRoomScene } from "./RoomScene.js";
import { stairsBounds } from "./staircase.js";
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
const dark = useDarkMode();

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

// A Library room's books, fetched a page at a time from the Books pages'
// own lists as their stretch of shelf comes near the view.
const shelves = useShelves(props.scene.shelves, {
    async fetchPage(shelf, page) {
        const { data } = await axios.get(
            route("books.category", { categoryName: shelf.category, page })
        );
        return data.books.data;
    },
});

const room = useRoom(props.scene, {
    start,
    autoTriggers,
    extras: () => shelves.items.value,
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
        night: dark.value,
        exitWord: t("games.world.exit_sign"),
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

watch(dark, (on) => graph?.setNight(on));

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

// What each TV in the room is showing, if it's on.
const tvs = useTvChannels(props.scene.interactables);

/** Each interactable's button, over what the canvas draws there: a door's
 * whole frame, a toy's square. These move when a long hall scrolls. A TV
 * that's on carries its picture (`tv`) and says what's on. */
const spots = computed(() => {
    if (!view.value) return [];
    return props.scene.interactables.flatMap((item) => {
        if (item.stairs) return stairsSpot(item);
        const pose = itemPose(item);
        const p = project(pose);
        if (!p) return [];
        const box = itemBox(item);
        const tv = tvs.channelOf(item);
        return {
            item,
            label: tv
                ? t("games.world.tv_playing", { title: tv.channel.title })
                : item.label,
            tv,
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

/** A flight of stairs' button: over all of it as drawn (the steps up, or
 * the opening and rail going down), so it's as easy to hit as it looks. */
function stairsSpot(item) {
    const b = stairsBounds(item, layout.value.wallHeight);
    const corners = [];
    for (const x of [b.x0, b.x1]) {
        for (const y of [b.y0, b.y1]) {
            for (const z of [b.z0, b.z1]) {
                const p = project({ x, y, z });
                if (p) corners.push(p);
            }
        }
    }
    if (corners.length === 0) return [];
    // Kept on the stage, so its middle (and its arrow) can be seen.
    const xs = corners.map((p) => Math.min(bounds.w, Math.max(0, p.x)));
    const ys = corners.map((p) => Math.min(bounds.h, Math.max(0, p.y)));
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const width = Math.max(...xs) - left;
    return {
        item,
        label: item.label,
        x: left + width / 2,
        y: bottom,
        width,
        height: bottom - top,
        titled: false,
        overlay: false,
    };
}

// The stretch of back wall the overlay keeps books' buttons up for: what's
// in view, and half as much again either side, so Tab can step to the next
// book before the camera follows.
const near = computed(() => {
    if (!view.value) return null;
    const { x0, x1 } = spanAt(view.value, 0);
    const pad = (x1 - x0) / 2;
    return { x0: x0 - pad, x1: x1 + pad };
});

// Fetches books only when the pages in view change, not every frame.
watch(
    () => near.value && shelves.pagesNear(near.value.x0, near.value.x1),
    () => near.value && shelves.show(near.value.x0, near.value.x1),
    { immediate: true }
);

// A book's button lies over its face, at the front of the bookcase.
const BOOK_FRONT = BOOKCASE.depth - 4;

/** Each shelf in the overlay: its sign, if it has a name, over the top of
 * the bookcase, and a button with the title written on it over every book
 * near the view that has come in. */
const shelfSpots = computed(() => {
    if (!near.value) return [];
    const { x0, x1 } = near.value;
    return (props.scene.shelves ?? []).map((shelf, s) => {
        const sign =
            shelf.label &&
            project({
                x: (shelf.x + shelfEnd(shelf)) / 2,
                y: bookcaseHeight(shelf.rows),
            });
        const books = [];
        const range = slotsIn(shelf, x0, x1);
        const slots = shelves.slots.value[s];
        for (let i = range?.from ?? 0; range && i <= range.to; i += 1) {
            const item = slots[i];
            if (!item) continue;
            const p = project({ x: item.x, y: item.y, z: BOOK_FRONT });
            books.push({
                item,
                x: p.x,
                y: p.y,
                width: item.width * p.scale,
                height: item.height * p.scale,
                font: Math.min(16, Math.max(10, 15 * p.scale)),
            });
        }
        return { shelf, sign, books };
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

/** A tap on the Butt where it's drawn over the button of the thing it's
 * standing at uses that thing; anywhere else on it, it's only a grab. */
function tapButt(point, rect) {
    const item = room.nearest.value;
    if (!item) return;
    const spot = [
        ...spots.value,
        ...shelfSpots.value.flatMap((s) => s.books),
    ].find((s) => s.item === item);
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    if (spot && onButton(spot, x, y)) room.goUse(item);
}

/** Dragging the Butt walks it along; a tap on it may use what it's at. */
function onButtPointerDown(event) {
    if (room.state.frozen || event.button > 0 || !layout.value) return;
    const start = { clientX: event.clientX, clientY: event.clientY };
    let tap = true;
    let grab = 0;
    const rect = props.stage.beginGesture({
        move(e) {
            e.preventDefault();
            if (pastTap(start, e)) tap = false;
            const floor = floorAt(e, rect, grab);
            if (floor) room.updateDrag(floor.x, floor.z);
        },
        end() {
            room.endDrag();
            if (tap) tapButt(start, rect);
        },
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

// Set while the world is paused, so a TV's picture and sound wait. (Pausing
// also lets go of keys and drags, once; see room.halt.)
const paused = ref(false);

defineExpose({
    setBounds,
    pause() {
        paused.value = true;
        room.halt();
    },
    resume() {
        paused.value = false;
    },
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
    changeChannel: tvs.changeChannel,
});
</script>

<template>
    <div
        class="room-3d"
        @pointerdown.self="onBackgroundPointerDown"
        @pointerup="unlockToot"
    >
        <template v-if="layout">
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
                :label="s.label"
                @pointerdown="pointerFocus = true"
                @focus="onItemFocus(s.item)"
                @click="onItemClick(s.item)"
            >
                <!-- Keyed, so a new channel starts its video afresh. -->
                <TvScreen
                    v-if="s.tv"
                    :key="s.tv.channel.id"
                    :channel="s.tv.channel"
                    :number="s.tv.number"
                    :paused="paused"
                    @ended="tvs.changeChannel(s.item.id, { wrap: true })"
                />
                <CastMember
                    v-if="s.overlay"
                    :id="s.item.cast"
                    class="room-overlay"
                    :size="`${s.height}px`"
                />
                <img
                    v-if="s.item.image"
                    class="room-picture"
                    :src="s.item.image.src"
                    alt=""
                    draggable="false"
                />
                <!-- Which way a flight goes, plain to see. -->
                <span
                    v-if="s.item.stairs"
                    class="stairs-arrow bg-theme-primary text-theme-button"
                    :class="`stairs-${s.item.stairs}`"
                    aria-hidden="true"
                >
                    <svg viewBox="0 0 24 24" width="100%" height="100%">
                        <path
                            :d="
                                s.item.stairs === 'up'
                                    ? 'M12 4 L20 13 H15 V20 H9 V13 H4 Z'
                                    : 'M12 20 L20 11 H15 V4 H9 V11 H4 Z'
                            "
                        />
                    </svg>
                </span>
                <LandmarkTitle
                    v-if="s.titled"
                    :id="`room-${s.item.id}`"
                    :name="s.item.label"
                />
            </InteractableButton>

            <template v-for="s in shelfSpots" :key="`shelf-${s.shelf.id}`">
                <div
                    v-if="s.sign"
                    class="shelf-sign"
                    :style="{
                        transform: `translate3d(${s.sign.x}px, ${s.sign.y}px, 0)`,
                    }"
                >
                    <LandmarkTitle
                        :id="`shelf-${s.shelf.id}`"
                        :name="s.shelf.label"
                    />
                    <span class="sr-only">{{ s.shelf.label }}</span>
                </div>
                <InteractableButton
                    v-for="b in s.books"
                    :key="b.item.id"
                    :ref="(el) => setButton(b.item.id, el)"
                    class="shelf-book"
                    :x="b.x"
                    :y="b.y"
                    :size="b.width"
                    :height="b.height"
                    :label="b.item.label"
                    @pointerdown="pointerFocus = true"
                    @focus="onItemFocus(b.item)"
                    @click="onItemClick(b.item)"
                >
                    <img
                        v-if="b.item.cover"
                        class="shelf-book-cover"
                        :src="b.item.cover"
                        alt=""
                        loading="lazy"
                        draggable="false"
                    />
                    <span
                        class="shelf-book-title"
                        :class="{ 'over-cover': b.item.cover }"
                        aria-hidden="true"
                        :style="{ fontSize: `${b.font}px` }"
                        >{{ b.item.label }}</span
                    >
                </InteractableButton>
            </template>

            <!-- Over the buttons, so the Butt can be dragged off whatever
                 it's standing at. -->
            <FollowBox
                class="butt"
                role="img"
                :aria-label="t('games.world.butt_aria')"
                :at="buttSpot"
                @pointerdown.prevent="onButtPointerDown"
            />

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
.butt {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: auto;
    touch-action: none;
    cursor: grab;
    will-change: transform;
}

.butt:active {
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

/* A picture over its panel, the way a book's cover sits on its face. */
.room-picture {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    box-shadow: inset 0 0 0 3px #78350f;
    pointer-events: none;
}

/* A flight's arrow badge, in the middle of its button: up or down. */
.stairs-arrow {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 3.25rem;
    height: 3.25rem;
    padding: 0.45rem;
    border-radius: 9999px;
    /* Coloured like the site's buttons, theme and all (the classes). */
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.45);
    fill: currentColor;
    transform: translate(-50%, -50%);
    pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
    .stairs-arrow {
        animation: stairs-nudge 1.6s ease-in-out infinite;
    }
}

.stairs-arrow.stairs-down {
    animation-name: stairs-nudge-down;
}

@keyframes stairs-nudge {
    50% {
        transform: translate(-50%, -62%);
    }
}

@keyframes stairs-nudge-down {
    50% {
        transform: translate(-50%, -38%);
    }
}

/* A shelf's name, arched over the top of its bookcase. */
.shelf-sign {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
}

/* A book's cover over its face on the shelf: an <img> in the overlay, so
   CloudFront needn't allow WebGL to read it. The coloured book shows
   through until it loads, and for a book without one. */
.shelf-book-cover {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.3);
    pointer-events: none;
}

/* A book's title, written over its cover. */
.shelf-book-title {
    position: relative;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    overflow: hidden;
    height: 100%;
    padding: 0.35em 0.3em;
    color: #fff;
    font-weight: 800;
    line-height: 1.15;
    text-align: center;
    overflow-wrap: anywhere;
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.9), 0 0 4px rgb(0 0 0 / 0.6);
}

.shelf-book-title.over-cover {
    height: auto;
    background: linear-gradient(rgb(0 0 0 / 0.7), rgb(0 0 0 / 0.35));
}

/* Under reduced motion, a toy that was used rings rather than moves. */
.room-item.used {
    border-radius: 0.75rem;
    box-shadow: 0 0 0 4px #facc15;
}
</style>
