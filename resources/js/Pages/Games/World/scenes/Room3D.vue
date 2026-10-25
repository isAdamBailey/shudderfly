<script setup>
import { usePage } from "@inertiajs/vue3";
import axios from "axios";
import CastMember from "@/Components/Games/Cast/CastMember.vue";
import TootPuff from "@/Components/Games/Cast/TootPuff.vue";
import { castInDom } from "@/constants/characters.js";
import { useDarkMode } from "@/composables/useDarkMode";
import { useToot } from "@/composables/useToot";
import { useTranslations } from "@/composables/useTranslations";
import { audioRunning } from "@/composables/useAudioContext";
import { usePreferredReducedMotion } from "@vueuse/core";
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    reactive,
    ref,
    shallowRef,
    watch,
} from "vue";
import InteractableButton from "../components/InteractableButton.vue";
import FollowBox from "../components/FollowBox.vue";
import TvScreen from "../components/TvScreen.vue";
import { boxStyle, onButton, pastTap } from "../components/overlay.js";
import LandmarkTitle from "../components/LandmarkTitle.vue";
import OtherButton from "../components/OtherButton.vue";
import {
    screenToGround,
    screenToPlane,
    spanAt,
    worldToScreen,
} from "../composables/projection.js";
import { toView, WALLS, wallTurned } from "../composables/views.js";
import { bobLift, useOthers } from "../composables/useGamesWorld.js";
import { arrivalSpot, useRoom } from "../composables/useRoom.js";
import { useThrowables } from "../composables/useThrowables.js";
import { useShelves } from "../composables/useShelves.js";
import { useTvChannels } from "../composables/useTvChannels.js";
import { MOVE_EVERY_MS } from "../composables/useWorldPresence.js";
import { autoTriggers } from "../interactions/index.js";
import {
    chimesBetween,
    dongLevel,
    playChime,
    playTick,
    tickLevel,
} from "../clockSounds.js";
import { BOOKCASE, bookcaseHeight, shelfEnd, slotsIn } from "./bookshelf.js";
import { createRoomScene } from "./RoomScene.js";
import { BASS_DRUM, headPoint, hitEdge } from "./drumLayout.js";
import { isInstrument } from "./instruments.js";
import {
    crossed,
    gapAt,
    HARP,
    nearestString,
    stringCorners,
    stringEnds,
    stringX,
} from "./harpLayout.js";
import { convexHull, keyAt, ORGAN, zoneCorners } from "./organLayout.js";
import { stairsBounds } from "./staircase.js";
import {
    inView,
    itemBox,
    itemPoint,
    itemPose,
    ROOM_SIZES,
    roomCamera,
    roomLayout,
    roomLook,
    wallFacing,
} from "./roomLayout.js";

// The `kind: "room"` renderer on the stage's WebGL canvas (issue #130): the
// room's scene graph (RoomScene.js) and a DOM overlay over it with a
// <button> per door and toy, a hit box for dragging the Butt, and the toot
// puffs. The room's behaviour is useRoom's: tap the floor or drag the Butt
// to walk, arrow keys walk four ways, Tab stands the Butt at each thing in
// turn and Enter uses it. A swipe across the room, Q / E or the stage's
// buttons turn it to face the next wall round (issue #183), and the Butt
// walks the floor in front of that wall; sent to something out of view, it
// turns to face it first. Rooms need
// WebGL; the stage doesn't send a browser without it into one. Loaded only
// when a door is first used.
const props = defineProps({
    scene: { type: Object, required: true },
    // { beginGesture(handlers) -> stage rect, resetScroll(), renderer }
    stage: { type: Object, required: true },
    // How the room was reached (useSceneRouter's `arrival`).
    arrival: { type: Object, default: () => ({}) },
});

// `activate`: the Butt has reached something and uses it (the room is
// frozen until the stage lets go). `play`: an organ key was pressed or a
// harp string plucked, at once, wherever the Butt is: nothing is frozen,
// and nothing is let go. `turned`: the camera turned to face a wall (its
// name), to say so.
const emit = defineEmits(["activate", "play", "turned"]);

const { t } = useTranslations();
const page = usePage();
const dark = useDarkMode();

// Pictures and photos are <img>s over the canvas, out of the scene's light:
// dimmed at night to sit in the dark room rather than glow in it.
const pictureLight = computed(() => (dark.value ? 0.6 : 1));

const prefersReducedMotion = usePreferredReducedMotion();
const reduced = computed(() => prefersReducedMotion.value === "reduce");

// The wall the camera faces, a quarter turn at a time (turn()): the back
// on the way in, or whichever was faced when the place was saved (the
// stage keeps it with the Butt's spot, position()).
const restored = props.arrival.position?.view;
const faced = ref(WALLS.includes(restored) ? restored : "back");

const bounds = reactive({ w: 0, h: 0 });
const layout = computed(() =>
    bounds.w ? roomLayout(props.scene, bounds, faced.value) : null
);

// The interactable last used, to put focus back on.
let lastUsed = null;

const start = arrivalSpot(props.scene, props.arrival);
// Where the camera looks along the wall it faces. A wall longer than the
// frame scrolls to keep the Butt in view; anything else stays put.
const lookX = ref(
    toView({ wall: faced.value, size: props.scene.size }, start).x
);
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

// The fruit you can pick up and throw about the room. One that comes to
// rest at the Butt's feet feeds it, and it toots at the fruit's pitch, as
// on the road.
const throwables = useThrowables(props.scene, {
    isReducedMotion: () => reduced.value,
    toward: () => wallFacing(faced.value),
    onLand: feedIfAtButt,
});

const room = useRoom(props.scene, {
    start,
    wall: faced.value,
    onTurn: swingTo,
    autoTriggers,
    extras: () => shelves.items.value,
    // A thrown thing is where it landed: the Butt walks there to use it.
    placed: throwables.placed,
    isReducedMotion: () => reduced.value,
    onArrive(item) {
        lastUsed = item.id;
        emit("activate", item);
    },
});
const { butt } = room;

// --- Other people ------------------------------------------------------------

// Who else is standing in the room (issue #174), walking to where they last
// said, kept inside its walls. `stage.together` hears where the Butt is.
const visitors = useOthers({
    every: MOVE_EVERY_MS / 1000,
    isReducedMotion: () => reduced.value,
});
const together = props.stage.together;
if (together) {
    // Whole units, each its own source, so a frame that changes none of
    // them sends nothing. A room has no lanes.
    watch(
        [
            () => Math.round(butt.x),
            () => Math.round(butt.z),
            () => butt.facing,
            () => (butt.walking ? 1 : 0),
        ],
        ([x, z, facing, moving]) =>
            together.move({ x, z, lane: 0, facing, moving }),
        { immediate: true }
    );
    watch(
        together.others,
        (list) =>
            visitors.set(
                list.map((o) => ({ ...o, ...room.inside(o.x, o.z), lane: 0 }))
            ),
        { immediate: true }
    );
}

/** The player is steering the Butt: any follow stops (useFollow). */
const steered = () => props.stage.steered?.();

/** Follows the Butt down a long room, and leaves a short one alone. */
function follow() {
    if (!layout.value) return;
    lookX.value = roomLook(
        layout.value.pan,
        lookX.value,
        toView(layout.value.camera.view, butt).x
    );
}

/** The laid-out room with the camera aimed where `follow` left it. */
function framed() {
    follow();
    return layout.value && { ...layout.value, camera: view.value };
}

// The walking bob, as height above the floor, as on the road.
const buttLift = computed(() => bobLift(butt.bob));

// The recordings this room's things toot (a toy's `clip`), loaded up front.
const {
    puffs,
    toot: tootAt,
    unlock: unlockToot,
} = useToot(
    page.props,
    props.scene.interactables.map((item) => item.clip).filter(Boolean)
);

// How close to the Butt a thrown thing must come to rest to feed it, and
// how low (units).
const FEED_REACH = 90;
const FEED_HEIGHT = 60;

/** Throwable `id` came to rest: at the Butt's feet, it's eaten (a toot). */
function feedIfAtButt(id) {
    const p = throwables.at[id];
    if (
        p.y > FEED_HEIGHT ||
        Math.hypot(p.x - butt.x, p.z - butt.z) > FEED_REACH
    ) {
        return;
    }
    const item = props.scene.interactables.find((i) => i.id === id);
    const spot = buttSpot();
    if (spot)
        tootAt(item.toot ?? item.cast, { x: spot.x, y: spot.y - spot.size });
    graph?.animateButt("toot");
}

// --- Scene graph -----------------------------------------------------------

let graph = null;
let stopFrames = null;
// The room's clock, s: its pendulums swing to it, each ticks at the end
// of every swing, and one with a chime dongs every `chime` s, playing its
// tune first every `tune`th dong. The clocks that swing, where they
// stand: [{ x, z, beat, chime, tune }].
let time = 0;
let clocks = [];

/** Whether a `every` s period ended between `from` s and now. */
function passed(from, every) {
    return Math.floor(from / every) !== Math.floor(time / every);
}

/** Ticks each clock whose swing ended between `from` s and now, and
 * strikes whatever of its dong or tune came round, as loud as the Butt is
 * close to it, once audio's running (a tick nobody asked for). */
function tickClocks(from) {
    if (!audioRunning()) return;
    for (const clock of clocks) {
        const tick = passed(from, clock.beat);
        const strikes = clock.chime ? chimesBetween(from, time, clock) : [];
        if (!tick && strikes.length === 0) continue;
        const distance = Math.hypot(clock.x - butt.x, clock.z - butt.z);
        if (tick) playTick(tickLevel(distance));
        for (const strike of strikes) playChime(strike, dongLevel(distance));
    }
}

onMounted(() => {
    const { renderer } = props.stage;
    graph = createRoomScene(renderer.three, renderer.kit, {
        room: props.scene,
        butt,
        theme: page.props.theme,
        night: dark.value,
        exitWord: t("games.world.exit_sign"),
    });
    clocks = graph.swinging;
    showRadios(radiosOn.value);
    const frame = framed();
    if (frame) graph.layout(frame);
    renderer.show(graph.scene, graph.camera);
    stopFrames = renderer.onFrame((dt) => {
        room.step(dt);
        // Other people carry on behind a card: it's only your room frozen.
        visitors.step(dt);
        // A throw waits, mid-air, while a card is up.
        const flew = !room.state.frozen && throwables.step(dt);
        follow();
        const swung = Boolean(turning.value);
        if (swung) stepTurn(dt);
        const from = time;
        time += dt;
        tickClocks(from);
        const changed = graph.sync(
            {
                butt,
                buttLift: buttLift.value,
                others: visitors.others,
                reduced: reduced.value,
                time,
                // Mid-turn, the camera is the turn's (stepTurn).
                camera: turning.value ? null : view.value,
                thrown: throwables.changed(),
            },
            dt
        );
        return changed || flew || swung;
    });
});

watch(dark, (on) => graph?.setNight(on));

// Each radio's dial is lit while one of its songs plays (the world's own
// radio says, through the stage).
const radiosOn = computed(() =>
    props.scene.interactables
        .filter((item) => item.type === "radio")
        .map((item) => [item.id, props.stage.radioOn?.(item.songs) ?? false])
);
function showRadios(radios) {
    if (!graph) return;
    for (const [id, on] of radios) graph.setOn(id, on);
    props.stage.renderer.invalidate();
}
watch(radiosOn, showRadios);

onBeforeUnmount(() => {
    stopFrames?.();
    props.stage.renderer.show(null);
    graph?.dispose();
    graph = null;
    clocks = [];
});

function setBounds(w, h) {
    bounds.w = w;
    bounds.h = h;
    // A turn under way ends where it was going, laid out afresh.
    turning.value = null;
    const frame = framed();
    if (graph && frame) {
        graph.layout(frame);
        props.stage.renderer.invalidate();
    }
}

// --- Turning ---------------------------------------------------------------

// How long a quarter turn takes, s (at once under reduced motion).
const TURN_S = 0.4;
// The turn under way: how far round it is (0 to 1), and `pose(s)`, the
// scene's swing from the wall it turns from to the one it turns to. The
// overlay waits, hidden, for the view it ends on.
const turning = shallowRef(null);

/** Turns to face the next wall round, to the right (`quarters` 1) or the
 * left (-1). Not while a card is up, nor mid-turn. */
function turn(quarters) {
    if (!layout.value || turning.value || room.state.frozen) return;
    room.face(wallTurned(faced.value, quarters));
}

/** The room has turned to face `wall` (turn(), or the Butt sent to
 * something out of view): the camera swings round to it. */
function swingTo(wall) {
    // A focused button may be on the wall turned away from.
    if (rootEl.value?.contains(document.activeElement)) props.stage.focus();
    const from = layout.value && { ...layout.value, camera: view.value };
    faced.value = wall;
    lookX.value = toView({ wall, size: props.scene.size }, butt).x;
    emit("turned", wall);
    if (!from || !graph) return;
    const to = framed();
    // Turned again mid-turn (sent to something behind), it's round at once:
    // the camera is somewhere between, which the swing can't start from.
    if (reduced.value || turning.value) {
        turning.value = null;
        graph.layout(to);
    } else turning.value = { s: 0, pose: graph.swing(from, to) };
    props.stage.renderer.invalidate();
}

/** Carries the turn on by `dt` s, eased in and out, and lays the room out
 * facing its new wall once it's round. */
function stepTurn(dt) {
    const turn = turning.value;
    turn.s = Math.min(1, turn.s + dt / TURN_S);
    if (turn.s < 1) {
        turn.pose(turn.s * turn.s * (3 - 2 * turn.s));
        return;
    }
    turning.value = null;
    graph.layout(framed());
}

// --- Overlay ---------------------------------------------------------------

/** Screen px of world point { x, y, z }, through the camera that follows
 * the Butt. */
const project = (point) => worldToScreen(view.value, point);

/** Whether `thing` can be seen facing the wall the camera faces. */
const seen = (thing) =>
    inView(thing, layout.value.camera.view, layout.value.band);

// What can be seen facing the wall the camera faces: only that has a
// button, to tap, Tab to and hear. Its interactables run left to right
// along the wall, Tab's order, where each was put (a thrown thing is
// checked where it is as it flies, spotOf). Worked out again on a turn,
// not as a long hall scrolls.
const inSight = computed(() => {
    if (!layout.value) return { items: [], photos: [], shelves: new Set() };
    const { view } = layout.value.camera;
    const along = (thing) => toView(view, { x: thing.x, z: thing.z ?? 0 }).x;
    return {
        items: props.scene.interactables
            .filter((item) => item.throwable || seen(item))
            .sort((a, b) => along(a) - along(b)),
        photos: (props.scene.photos ?? []).filter(seen),
        // Bookcases stand against the back wall: their books are only
        // reached facing it (from the side, they're edge on).
        shelves: new Set(view.wall === "back" ? props.scene.shelves : []),
    };
});

// What each TV in the room is showing, if it's on.
const tvs = useTvChannels(props.scene.interactables);

/** Interactable `item`'s button, over what the canvas draws there: a
 * door's whole frame, a toy's square. A TV that's on carries its picture
 * (`tv`) and says what's on. */
function spotOf(item) {
    if (item.stairs) return stairsSpot(item);
    // An organ is played by its keys (organSpots), a harp by its strings
    // (harpSpots), a drum on its head (drumSpots).
    if (isInstrument(item)) return [];
    const placed = throwables.placed(item);
    if (item.throwable && !seen(placed)) return [];
    const p = project(itemPose(placed));
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
}

/** The buttons of the interactables in `items`, by id. */
const spotsOf = (items) =>
    new Map(view.value ? items.map((item) => [item.id, spotOf(item)]) : []);

// Every button moves when a long hall scrolls; a thrown thing's moves
// with it too, every frame of its flight, so it's worked out apart.
const fixedSpots = computed(() =>
    spotsOf(inSight.value.items.filter((item) => !item.throwable))
);
const thrownSpots = computed(() =>
    spotsOf(inSight.value.items.filter((item) => item.throwable))
);

/** Each interactable's button in view, in Tab's order (inSight). */
const spots = computed(() =>
    inSight.value.items.flatMap(
        (item) =>
            (item.throwable ? thrownSpots : fixedSpots).value.get(item.id) ?? []
    )
);

/** Each of the room's photos over its panel, where it hangs (a blank one
 * is just its panel). Decor, with nothing to tap, so not a button. */
const photoSpots = computed(() => {
    if (!view.value) return [];
    return inSight.value.photos.flatMap((photo) => {
        const p = photo.image.src && project(itemPose(photo));
        if (!p) return [];
        const { width, height } = itemBox(photo);
        return {
            photo,
            style: boxStyle({
                x: p.x,
                y: p.y,
                size: width * p.scale,
                height: height * p.scale,
            }),
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
    const { left, top, width, height } = screenRect(
        corners.map((p) => ({
            x: Math.min(bounds.w, Math.max(0, p.x)),
            y: Math.min(bounds.h, Math.max(0, p.y)),
        }))
    );
    return {
        item,
        label: item.label,
        x: left + width / 2,
        y: top + height,
        width,
        height,
        titled: false,
        overlay: false,
    };
}

/** The screen rectangle round screen points `points`. */
function screenRect(points) {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    return {
        left,
        top,
        width: Math.max(...xs) - left,
        height: Math.max(...ys) - top,
    };
}

/** The screen box round room points `corners` once projected, and the
 * outline of them in it (a clip-path polygon), so a button over them takes
 * only presses on what's drawn; null if any is off-camera. */
function hullSpot(corners) {
    const points = corners.map(project);
    if (points.some((p) => !p)) return null;
    const hull = convexHull(points);
    const rect = screenRect(hull);
    return {
        ...rect,
        outline: hull
            .map((p) => `${p.x - rect.left}px ${p.y - rect.top}px`)
            .join(", "),
    };
}

/** A button over each zone of an organ's keyboard: the outline of its keys
 * as drawn (on a side wall, they run off into the room at a slant), and the
 * line along them a press is placed on, to find its key. */
const organSpots = computed(() => {
    if (!view.value) return [];
    return inSight.value.items
        .filter((item) => item.type === "organ")
        .flatMap((item) =>
            item.zones.flatMap((label, zone) => {
                const spot = hullSpot(zoneCorners(item, zone));
                return spot ? { item, zone, label, ...spot } : [];
            })
        );
});

/** A button over each harp's strings, shaped to them as drawn. */
const harpSpots = computed(() => {
    if (!view.value) return [];
    return inSight.value.items
        .filter((item) => item.type === "harp")
        .flatMap((item) => {
            const spot = hullSpot(stringCorners(item));
            return spot ? { item, ...spot } : [];
        });
});

/** A round button over each bass drum's front head: its middle on screen,
 * and its radii across and up. */
const drumSpots = computed(() => {
    if (!view.value) return [];
    return inSight.value.items
        .filter((item) => item.type === "drum")
        .flatMap((item) => {
            const r = BASS_DRUM.radius;
            const [middle, across, up] = [
                headPoint(item),
                headPoint(item, r, 0),
                headPoint(item, 0, r),
            ].map(project);
            if (!middle || !across || !up) return [];
            const rx = Math.hypot(across.x - middle.x, across.y - middle.y);
            const ry = Math.hypot(up.x - middle.x, up.y - middle.y);
            return {
                item,
                middle,
                radii: { rx, ry },
                left: middle.x - rx,
                top: middle.y - ry,
                width: rx * 2,
                height: ry * 2,
            };
        });
});

// The stretch of back wall the overlay keeps books' buttons up for: what's
// in view, and half as much again either side, so Tab can step to the next
// book before the camera follows. None facing any other wall.
const near = computed(() => {
    if (!view.value || inSight.value.shelves.size === 0) return null;
    const { from, to } = spanAt(view.value, { x: 0, z: 0 });
    const pad = (to.x - from.x) / 2;
    return { x0: from.x - pad, x1: to.x + pad };
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
    return (props.scene.shelves ?? []).flatMap((shelf, s) => {
        if (!inSight.value.shelves.has(shelf)) return [];
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
    return view.value && buttSpotAt({ ...butt, lift: buttLift.value });
}

/** The screen box of a butt standing at { x, z }, `lift` units up, or
 * null off camera. */
function buttSpotAt({ x, z, lift }) {
    const p = project({ x, y: lift, z });
    return p && { x: p.x, y: p.y, size: ROOM_SIZES.butt * p.scale };
}

// Each other person on screen: a box over them to tap and follow, their
// name over it. Someone behind the camera (in your room, facing another
// way) has neither.
const visitorSpots = computed(() =>
    view.value
        ? visitors.others.flatMap((other) => {
              const spot = seen(other) && buttSpotAt(other);
              return spot ? { id: other.id, name: other.name, ...spot } : [];
          })
        : []
);

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
        if (!placedFocus) steered();
        room.standBy(item);
        follow();
    }
    pointerFocus = false;
    props.stage.resetScroll();
}

/** A click (or Enter) on a thing: walk there and use it. Clears the
 * pointer flag too, for browsers that don't focus a clicked button. A
 * throwable's press decides for itself (onThrowablePointerDown), so its
 * click only counts from the keyboard. */
function onItemClick(item, event) {
    pointerFocus = false;
    if (item.throwable && event.detail !== 0) return;
    steered();
    room.goUse(item);
}

/** A press on a throwable: a tap uses it, but past a tap it's picked up
 * and carried at its depth under the finger, and letting go throws it as
 * fast as it was carried (useThrowables). */
function onThrowablePointerDown(item, event) {
    // The press may still focus it: the Butt walks there on a tap, it
    // doesn't jump.
    pointerFocus = true;
    if (room.state.frozen || event.button > 0 || !layout.value) return;
    event.preventDefault();
    const { id } = item;
    const start = { clientX: event.clientX, clientY: event.clientY };
    // Where the finger holds it, from where it stands.
    let held = null;
    const rect = props.stage.beginGesture({
        move(e) {
            if (!held && !pastTap(start, e)) return;
            e.preventDefault();
            const p = throwables.at[id];
            const plane = (point) =>
                screenToPlane(
                    view.value,
                    point.clientX - rect.left,
                    point.clientY - rect.top,
                    p
                );
            if (!held) {
                const from = plane(start);
                if (!from) return;
                held = { x: p.x - from.x, y: p.y - from.y, z: p.z - from.z };
                throwables.grab(id);
            }
            const to = plane(e);
            if (to) {
                throwables.carry(id, {
                    x: to.x + held.x,
                    y: to.y + held.y,
                    z: to.z + held.z,
                });
            }
        },
        end() {
            if (held) throwables.release(id);
            // One still in the air has nowhere yet to walk to.
            else if (!throwables.at[id].flying) {
                steered();
                room.goUse(item);
            }
        },
        cancel() {
            if (held) throwables.drop();
        },
    });
}

const rootEl = ref(null);

/** Plays organ zone `s`'s key `key` (the handler presses it and sounds
 * it). Nothing walks: the organ answers at once, however far the Butt is,
 * and a walk or held arrow key carries on. */
function playZone(s, key) {
    if (room.state.frozen) return;
    emit("play", { ...s.item, zone: s.zone, key });
}

/** A press on a zone plays the key under it straight away, not on the
 * click a press only makes once it's let go: the point on the keys' plane
 * under the pointer, read along the keyboard. */
function onZonePointerDown(s, event) {
    pointerFocus = true;
    if (event.button > 0) return;
    const rect = rootEl.value.getBoundingClientRect();
    const cam = view.value;
    const at = screenToGround(
        { ...cam, y: cam.y - ORGAN.keys.y },
        event.clientX - rect.left,
        event.clientY - rect.top
    );
    playZone(s, at ? keyAt(s.item, s.zone, at) : 0);
}

/** Plucks harp `item`'s `strings` (the handler rings and sounds them). */
function pluck(item, strings) {
    if (room.state.frozen || strings.length === 0) return;
    emit("play", { ...item, strings });
}

/** Each of harp `item`'s strings' screen x, halfway up it, in order. */
function stringXs(item) {
    return Array.from({ length: HARP.strings.count }, (_, n) => {
        const { bottom, top } = stringEnds(n);
        return project(
            itemPoint(item, [stringX(n), (bottom + top) / 2, HARP.z])
        )?.x;
    });
}

/** A press on the strings plucks the one under it; dragging on across them,
 * a strum, plucks every string it crosses, as it crosses it, however fast
 * it goes. */
function onHarpPointerDown(item, event) {
    if (room.state.frozen || event.button > 0) return;
    // Not focused by it either (no pointerFocus), so a strum's finger
    // can't scroll the page or select.
    event.preventDefault();
    const xs = stringXs(item);
    if (xs.some((x) => x === undefined)) return;
    const left = rootEl.value.getBoundingClientRect().left;
    const at = (e) => e.clientX - left;
    const first = nearestString(xs, at(event));
    pluck(item, [first]);
    let gap = gapAt(xs, at(event));
    // The string the press plucked, until the strum has crossed it: it
    // was just played, so crossing it straight after doesn't play it again.
    let played = first;
    props.stage.beginGesture({
        move(e) {
            // Only the finger that began it: another's moves would jump
            // the strum back and forth between them.
            if (e.pointerId !== event.pointerId) return;
            e.preventDefault();
            // Where the strings are now: the camera may be following the
            // Butt down the room.
            const now = stringXs(item);
            if (now.some((x) => x === undefined)) return;
            const to = gapAt(now, at(e));
            if (to === gap) return;
            const strings = crossed(gap, to);
            pluck(
                item,
                strings.filter((n) => n !== played)
            );
            played = null;
            gap = to;
        },
        end() {},
        cancel() {},
    });
}

/** Whether a press on an instrument's button focuses it: not if it has
 * focus already, when no focus event comes to clear the flag (onItemFocus)
 * and the next Tab would leave the Butt where it is. */
function focusesOnPress(event) {
    return document.activeElement !== event.currentTarget;
}

/** Enter or Space on a harp's strings or a drum's head (a click with no
 * pointer): the instrument played as a whole, a glissando up the harp, a
 * hit in the middle of the drum. */
function onInstrumentClick(item, event) {
    pointerFocus = false;
    if (event.detail !== 0 || room.state.frozen) return;
    emit("play", item);
}

/** A press on a drum's head hits it there, at once: harder, deeper and
 * longer the nearer the middle. */
function onDrumPointerDown(s, event) {
    pointerFocus = focusesOnPress(event);
    if (room.state.frozen || event.button > 0) return;
    const rect = rootEl.value.getBoundingClientRect();
    const at = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    emit("play", { ...s.item, edge: hitEdge(s.middle, s.radii, at) });
}

// The key Enter or Space last played in each zone: each press plays the
// next, up the scale and round again, so every key can be reached.
const keyboardKeys = new Map();

/** Enter or Space on a zone (a click with no pointer). */
function onZoneClick(s, event) {
    pointerFocus = false;
    if (event.detail !== 0) return;
    const id = `${s.item.id}-${s.zone}`;
    const key = keyboardKeys.has(id)
        ? (keyboardKeys.get(id) + 1) % ORGAN.whiteKeys
        : 0;
    keyboardKeys.set(id, key);
    playZone(s, key);
}

// Set while focus is put somewhere by the world (the door you came in by),
// not moved by the player: that isn't steering.
let placedFocus = false;

function focusItem(id) {
    placedFocus = true;
    buttons[id]?.focus({ preventScroll: true });
    placedFocus = false;
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

/** Toots as `castId` at thing `id`, recording `clip` for its sound if
 * given (ctx.toot). */
function toot(castId, id, clip) {
    tootAt(castId, pointOf(id), clip);
}

/** Presses organ `id`'s key `key` in zone `zone` (ctx.pressKey). */
function pressKey(id, zone, key) {
    graph?.pressKey(id, zone, key);
    props.stage.renderer.invalidate();
}

/** Plucks string `n` of harp `id`, `delay` s from now (ctx.pluckString). */
function pluckString(id, n, delay) {
    graph?.pluckString(id, n, delay);
    props.stage.renderer.invalidate();
}

/** Hits drum `id` `edge` out from its head's middle (ctx.hitDrum). */
function hitDrum(id, edge) {
    graph?.hitDrum(id, edge);
    props.stage.renderer.invalidate();
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
    steered();
    room.startDrag();
}

/** A tap on the bare floor walks the Butt there; a swipe across the room
 * turns it, the way the finger goes (dragged left, the wall on the right
 * comes round). */
function onBackgroundPointerDown(event) {
    if (
        room.state.frozen ||
        turning.value ||
        event.button > 0 ||
        !layout.value
    ) {
        return;
    }
    const start = { clientX: event.clientX, clientY: event.clientY };
    let tap = true;
    let last = start;
    const rect = props.stage.beginGesture({
        move(e) {
            // Only the finger that began it.
            if (e.pointerId !== event.pointerId) return;
            last = e;
            if (pastTap(start, e)) tap = false;
        },
        end() {
            const dx = last.clientX - start.clientX;
            const dy = last.clientY - start.clientY;
            if (!tap && Math.abs(dx) > Math.abs(dy)) turn(dx < 0 ? 1 : -1);
            const floor = tap && floorAt(start, rect);
            if (!floor) return;
            steered();
            room.walkTo(floor.x, floor.z);
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

// Q turns left, E right: a quarter turn a press, not repeated while held.
const TURN_KEYS = { q: -1, e: 1 };

function onKeydown(event) {
    const quarters = TURN_KEYS[event.key?.toLowerCase()];
    if (quarters && !(event.ctrlKey || event.metaKey || event.altKey)) {
        event.preventDefault();
        if (!event.repeat) turn(quarters);
        return;
    }
    const key = KEYS[event.key];
    if (!key) return;
    event.preventDefault();
    // Walking off leaves whatever button was focused behind: Enter should
    // use what the Butt is standing at, not that.
    if (event.target !== event.currentTarget) props.stage.focus();
    steered();
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
        throwables.drop();
    },
    resume() {
        paused.value = false;
    },
    interrupt() {
        room.halt();
        throwables.drop();
    },
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
    position: () => ({ x: butt.x, z: butt.z, view: faced.value }),
    turn,
    animate,
    toot,
    toggleLight,
    pressKey,
    pluckString,
    hitDrum,
    changeChannel: tvs.changeChannel,
    // Following someone (useFollow): up to them, or through a door.
    walkUpTo: (other) => room.walkUpTo(other.x, other.z),
    walkThrough: (door) => room.goUse(door),
});
</script>

<template>
    <div
        ref="rootEl"
        class="room-3d"
        :class="{ turning: Boolean(turning) }"
        :style="{ '--picture-light': pictureLight }"
        @pointerdown.self="onBackgroundPointerDown"
        @pointerup="unlockToot"
    >
        <template v-if="layout">
            <!-- Under the buttons: nothing to tap. -->
            <img
                v-for="s in photoSpots"
                :key="`photo-${s.photo.id}`"
                class="room-photo"
                :class="{ framed: s.photo.image.frame }"
                :src="s.photo.image.src"
                alt=""
                draggable="false"
                :style="s.style"
            />
            <InteractableButton
                v-for="s in spots"
                :key="s.item.id"
                :ref="(el) => setButton(s.item.id, el)"
                class="room-item"
                :class="{
                    used: used.has(s.item.id),
                    throwable: s.item.throwable,
                }"
                :x="s.x"
                :y="s.y"
                :size="s.width"
                :height="s.height"
                :label="s.label"
                @pointerdown="
                    s.item.throwable
                        ? onThrowablePointerDown(s.item, $event)
                        : (pointerFocus = true)
                "
                @focus="onItemFocus(s.item)"
                @click="onItemClick(s.item, $event)"
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
                    :class="{ framed: s.item.image.frame }"
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

            <!-- Someone else: a tap follows them. Under your own Butt. -->
            <OtherButton
                v-for="s in visitorSpots"
                :key="`visitor-${s.id}`"
                class="visitor"
                :name="s.name"
                :style="boxStyle(s)"
                @click="stage.follow?.(s.id)"
            />

            <!-- Over the buttons, so the Butt can be dragged off whatever
                 it's standing at. -->
            <FollowBox
                class="butt"
                role="img"
                :aria-label="t('games.world.butt_aria')"
                :at="buttSpot"
                @pointerdown.prevent="onButtPointerDown"
            />

            <!-- Over the Butt too: standing at the organ, it mustn't
                 cover the keys. -->
            <button
                v-for="s in organSpots"
                :key="`${s.item.id}-${s.zone}`"
                type="button"
                class="organ-zone"
                :aria-label="s.label"
                :style="{
                    width: `${s.width}px`,
                    height: `${s.height}px`,
                    transform: `translate3d(${s.left}px, ${s.top}px, 0)`,
                    clipPath: `polygon(${s.outline})`,
                }"
                @pointerdown="onZonePointerDown(s, $event)"
                @focus="onItemFocus(s.item)"
                @click="onZoneClick(s, $event)"
            />

            <!-- Over the Butt too, as the organ's keys are. -->
            <button
                v-for="s in harpSpots"
                :key="s.item.id"
                type="button"
                class="harp-strings"
                :aria-label="s.item.label"
                :style="{
                    width: `${s.width}px`,
                    height: `${s.height}px`,
                    transform: `translate3d(${s.left}px, ${s.top}px, 0)`,
                    clipPath: `polygon(${s.outline})`,
                }"
                @pointerdown="onHarpPointerDown(s.item, $event)"
                @focus="onItemFocus(s.item)"
                @click="onInstrumentClick(s.item, $event)"
            />

            <button
                v-for="s in drumSpots"
                :key="s.item.id"
                type="button"
                class="drum-head"
                :aria-label="s.item.label"
                :style="{
                    width: `${s.width}px`,
                    height: `${s.height}px`,
                    transform: `translate3d(${s.left}px, ${s.top}px, 0)`,
                }"
                @pointerdown="onDrumPointerDown(s, $event)"
                @focus="onItemFocus(s.item)"
                @click="onInstrumentClick(s.item, $event)"
            />

            <TootPuff
                v-for="puff in puffs"
                :key="puff.id"
                :cast-id="puff.castId"
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

/* Mid-turn, nothing over the room is where it's drawn: it waits, hidden,
   for the view the turn ends on. */
.room-3d.turning > * {
    visibility: hidden;
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

/* Someone else's box over what the canvas draws of them. */
.visitor {
    position: absolute;
    left: 0;
    top: 0;
    will-change: transform;
}

/* Stands on the button's floor, as the canvas would draw it. */
.room-overlay {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    pointer-events: none;
}

/* A picture over its panel, the way a book's cover sits on its face, and
   a room's photo over its panel; both dimmed to the room's light. A
   picture keeps its whole shape; a photo, or a picture in a frame, fills
   it (the frame is drawn round it, so needs no edge of its own). */
.room-picture,
.room-photo {
    object-fit: contain;
    box-shadow: inset 0 0 0 3px #78350f;
    filter: brightness(var(--picture-light, 1));
    pointer-events: none;
}

.room-picture {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

.room-photo {
    position: absolute;
    left: 0;
    top: 0;
    object-fit: cover;
    will-change: transform;
}

.room-picture.framed,
.room-photo.framed {
    object-fit: cover;
    box-shadow: none;
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

/* A zone of an organ's keyboard, a harp's strings or a drum's head: shaped
   to them as drawn, so it takes only presses on them. Focus shades the
   whole of it, since an outline would be clipped away. */
.organ-zone,
.harp-strings,
.drum-head {
    position: absolute;
    left: 0;
    top: 0;
    padding: 0;
    border: 0;
    background: none;
    pointer-events: auto;
    /* Not manipulation: that still lets a chord of fingers pinch-zoom or
       pan, which cancels the presses (and the tap that unlocks sound). */
    touch-action: none;
    /* A held key mustn't bring up iOS's magnifier or callout. */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    cursor: pointer;
    will-change: transform;
}

.organ-zone:focus-visible,
.harp-strings:focus-visible,
.drum-head:focus-visible {
    outline: none;
    background: rgb(29 78 216 / 0.45);
}

.drum-head {
    border-radius: 50%;
}

/* Fruit to pick up and throw: a drag mustn't scroll the page or select. */
.room-item.throwable {
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    cursor: grab;
}

.room-item.throwable:active {
    cursor: grabbing;
}

/* Under reduced motion, a toy that was used rings rather than moves. */
.room-item.used {
    border-radius: 0.75rem;
    box-shadow: 0 0 0 4px #facc15;
}
</style>
