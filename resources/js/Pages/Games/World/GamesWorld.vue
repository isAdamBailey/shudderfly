<script setup>
/* global route */
import { router as inertia, usePage } from "@inertiajs/vue3";
import { audioRunning, unlockAudio } from "@/composables/useAudioContext";
import { useFlashMessage } from "@/composables/useFlashMessage";
import { speakGameIntro } from "@/composables/useGameIntroSpeech";
import { primeSpeech } from "@/composables/speechPlayback";
import { useSiteSetting } from "@/composables/useSiteSetting";
import { useTranslations } from "@/composables/useTranslations";
import { sameId } from "@/utils/object";
import { usePreferredReducedMotion } from "@vueuse/core";
import {
    computed,
    defineAsyncComponent,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    reactive,
    shallowRef,
    watch,
} from "vue";
import Road3D from "./scenes/Road3D.vue";
import RoadScene from "./scenes/RoadScene.vue";
import { ROWS } from "./scenes/roadLayout.js";
import { useRadio } from "./composables/useRadio.js";
import { useFollow } from "./composables/useFollow.js";
import { useSceneRouter } from "./composables/useSceneRouter.js";
import { useWorldPresence } from "./composables/useWorldPresence.js";
import WorldRoster from "./components/WorldRoster.vue";
import { activate, noteOf, playedFrom } from "./interactions/index.js";
import { playDrum } from "./drumSounds.js";
import { playHarp } from "./harpSounds.js";
import { playOrgan } from "./organSounds.js";
import { playSound } from "./sounds.js";
import { worldTheme } from "./three/themes.js";
import { supportsWebGL, useWorldRenderer } from "./three/useWorldRenderer.js";

// The stage: the box the world is drawn in, and everything that isn't any one
// scene's business — the WebGL canvas and its renderer, sizing, window
// pointer listeners, keyboard routing, pausing when the tab hides, and the
// cards interactions open, moving between scenes and remembering where the
// player was. Whatever scene is current is mounted over the canvas and driven
// through the API it exposes (see useRoad's `api`).
const props = defineProps({
    scenes: { type: Object, required: true },
    // A shared link's { scene, spot?, with?, visit }, to open in
    // (useSceneRouter).
    link: { type: Object, default: null },
});

const { t } = useTranslations();
const page = usePage();

// The road's sky and grass behind the stage while three loads.
const loadingBackground = computed(() => {
    const look = worldTheme(page.props.theme);
    const horizon = `${ROWS.horizon * 100}%`;
    return `linear-gradient(${look.skyTop}, ${look.skyBottom} ${horizon}, ${look.grass} ${horizon})`;
});

// Scene kind → its renderer, on the WebGL canvas or, where WebGL can't run,
// in the DOM. Every kind needs a WebGL one; the DOM one is the fallback, and
// a kind without one (a room) can't be gone into without WebGL. Rooms load
// when a door is first used: `load` fetches a kind's code, so a door can fail
// before the world fades out rather than leave it dark.
const loadRoom = () => import("./scenes/Room3D.vue");
const SCENE_RENDERERS = {
    road: { webgl: Road3D, dom: RoadScene },
    room: { webgl: defineAsyncComponent(loadRoom), load: loadRoom },
};

// Going through a door: the camera dollies toward it, then the world fades
// out and the next scene fades in. Under reduced motion, only the fade.
const DOLLY_MS = 400;
const DOLLY_SCALE = 1.6;
const FADE_MS = 150;

// "loading" while three downloads, then "webgl", or "dom" for the fallback
// when there is no WebGL or the renderer can't be made.
const mode = ref(supportsWebGL() ? "loading" : "dom");
const renderer = useWorldRenderer();

const router = useSceneRouter(
    computed(() => props.scenes),
    { link: props.link }
);
const rendererFor = (scene) =>
    SCENE_RENDERERS[scene?.kind]?.[mode.value] ?? null;
const sceneRenderer = computed(() =>
    mode.value === "loading" ? null : rendererFor(router.current.value)
);
const inRoom = computed(() => router.current.value?.kind === "room");

// A scene this browser can't draw (a room, restored or linked to, without
// WebGL, or after the context was lost in one): out through its door.
watch(
    [mode, router.current],
    () => {
        if (mode.value === "loading" || !router.current.value) return;
        if (sceneRenderer.value) return;
        const door = router.exitDoor();
        router.goTo(door?.to ?? "road", { spot: door?.toSpot });
    },
    { immediate: true }
);

const prefersReducedMotion = usePreferredReducedMotion();

const stageEl = ref(null);
const canvasEl = ref(null);
const stageHeight = ref(null);
const sceneRef = ref(null);
let resizeObserver = null;

// --- Interactions -----------------------------------------------------------

// The open card, if any: { component, props }. Only one at a time.
const card = shallowRef(null);

const radio = useRadio();

const thingsHere = () => router.current.value?.interactables ?? [];

/** The radios in the scene you're in. */
const radiosHere = () =>
    thingsHere().filter((item) => item.type === "radio" && item.songs?.length);

// Other people in the world (issue #174): logged-in visitors only, and only
// while the site has it switched on. Off, nothing is joined at all.
const presence = useWorldPresence({
    enabled:
        useSiteSetting("world_together_enabled").value &&
        Boolean(page.props.auth?.user),
    me: page.props.auth?.user?.id ?? null,
    scenes: Object.keys(props.scenes),
    // What's on the radio here you tuned, for someone arriving.
    radioNow(id) {
        const item = radiosHere().find((r) => r.id === id);
        return item ? radio.nowPlaying(item.songs) : null;
    },
    // Someone here tuned a radio, or switched it off.
    hearRadio({ id, songId, startedAt }) {
        const item = radiosHere().find((r) => r.id === id);
        if (!item) return;
        if (songId === null) radio.stop(item.songs);
        else radio.join(item.songs, songId, startedAt);
    },
    // Someone here played an instrument: it plays here too, and moves, but
    // says nothing and opens nothing. Not over a card or a scene change,
    // where your own taps don't play either.
    hearNote({ id, which }) {
        if (card.value || transition.active) return;
        const item = thingsHere().find((t) => t.id === id);
        const played = item && playedFrom(item, which);
        if (played) activate(played, instrumentCtx);
    },
});

/** Tunes a radio, and once the song is playing, tells everyone in the
 * room so theirs plays it too. */
async function tuneRadio(item) {
    const song = radio.tune(item.songs);
    if (song === undefined || !presence.enabled) return;
    if (song === null) {
        presence.radio({ id: item.id, songId: null });
        return;
    }
    const scene = router.currentId.value;
    const startedAt = await radio.started(song);
    // Gone through a door meanwhile: that room's radio isn't on.
    if (startedAt !== null && router.currentId.value === scene) {
        presence.radio({ id: item.id, songId: song.id, startedAt });
    }
}

// Whichever scene you're in, its channel: the people standing in it.
watch(
    router.currentId,
    (id) => {
        if (router.current.value) presence.enterScene(id);
    },
    { immediate: true }
);

/** Everything an interaction handler may touch (interactions/index.js). */
const ctx = {
    openCard(component, cardProps = {}) {
        card.value = { component, props: cardProps };
    },
    goToScene,
    // On the scene's things, by id: whichever scene draws them does it.
    animate: (id, move) => sceneRef.value?.animate?.(id, move),
    toot: (castId, id, clip) => sceneRef.value?.toot?.(castId, id, clip),
    toggleLight: (id) => sceneRef.value?.toggleLight?.(id),
    pressKey: (id, zone, key) => sceneRef.value?.pressKey?.(id, zone, key),
    pluckString: (id, n, delay) => sceneRef.value?.pluckString?.(id, n, delay),
    hitDrum: (id, edge) => sceneRef.value?.hitDrum?.(id, edge),
    changeChannel: (id) => sceneRef.value?.changeChannel?.(id),
    // Through the site's music player, so it plays on in its flyout.
    tuneRadio,
    playSound,
    playOrgan,
    playHarp,
    playDrum,
    // Through the same voice as a game's intro (the AI voice when it's on).
    speak: (text) => speakGameIntro(text),
};

/** All an instrument someone else played may touch. */
const instrumentCtx = {
    pressKey: ctx.pressKey,
    pluckString: ctx.pluckString,
    hitDrum: ctx.hitDrum,
    playOrgan,
    playHarp,
    playDrum,
};

/** Uses `item`, and if it's an instrument, tells everyone in the room what
 * was played. It has played here whether or not that goes. */
function play(item) {
    activate(item, ctx);
    const which = noteOf(item);
    if (which) presence.note({ id: item.id, which });
}

function onActivate(item) {
    play(item);
    // A handler that didn't open a card or start a scene change is
    // finished, so the scene mustn't stay frozen waiting for one.
    if (!card.value && !transition.active) {
        sceneRef.value?.unfreeze();
        follow.nudge();
    }
}

// --- Scenes -----------------------------------------------------------------

// A scene change in progress: `dolly` is the point the camera moves toward,
// `veil` whether the world is faded out.
const transition = reactive({ active: false, dolly: null, veil: false });

// Following someone on the roster (WorldRoster) or tapped on (a scene's
// `stage.follow`): it walks through doors itself, and stops the moment you
// steer (a scene's `stage.steered`).
const follow = useFollow({
    presence,
    scenes: () => props.scenes,
    currentId: router.currentId,
    scene: () => sceneRef.value,
    busy: () => transition.active,
    canEnter: (id) => Boolean(rendererFor(props.scenes[id])),
});

// An invite's link (/games?scene=…&with=<id>): follow whoever sent it, if
// they're still in the world.
if (presence.enabled && router.invitedBy !== null) {
    follow.startWhenHere(router.invitedBy);
}

// What the aria-live region says: the place you've just arrived in, or why
// you couldn't go in.
const announcement = ref("");

function announce(text) {
    // Cleared first, so the same words twice are still read out.
    announcement.value = "";
    nextTick(() => {
        announcement.value = text;
    });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Resolves goToScene's wait for the next scene to mount (the sceneRef watch
// below calls it).
let sceneMounted = null;

/** Through a door to scene `id`, arriving at the interactable `spot`; the
 * camera dollies toward `from`, the interactable you went through. */
async function goToScene(id, { spot, from } = {}) {
    const scene = props.scenes[id];
    if (!scene || transition.active) return;
    if (!rendererFor(scene)) {
        announce(t("games.world.needs_webgl", { place: scene.label }));
        return;
    }

    transition.active = true;
    sceneRef.value?.interrupt();
    try {
        await SCENE_RENDERERS[scene.kind].load?.();
    } catch {
        // Offline, or a deploy since the page loaded: stay put and say so.
        transition.active = false;
        sceneRef.value?.unfreeze();
        announce(t("games.world.door_failed", { place: scene.label }));
        return;
    }
    const door = from && sceneRef.value?.pointOf?.(from);
    if (door && prefersReducedMotion.value !== "reduce") {
        transition.dolly = door;
        await wait(DOLLY_MS - FADE_MS);
    }
    transition.veil = true;
    await wait(FADE_MS);
    if (!stageEl.value) return;

    const arrived = new Promise((resolve) => {
        sceneMounted = resolve;
    });
    router.goTo(id, { spot });
    transition.dolly = null;
    await arrived;
    // The new scene has its size (the sceneRef watch) and buttons.
    await nextTick();
    transition.veil = false;
    // Where you really are: losing WebGL on the way in sends you back out.
    announce(router.current.value.label);
    if (spot && router.currentId.value === id) {
        sceneRef.value?.focusItem(spot);
    }
    await wait(FADE_MS);
    transition.active = false;
}

// The room's turn buttons: [quarter turns, label, glyph].
const TURNS = [
    [-1, "turn_left", "↺"],
    [1, "turn_right", "↻"],
];

/** Escape or the back button: out of the room the way you came, which is
 * steering, so it stops a follow. */
function leave() {
    const door = router.exitDoor();
    if (!door || card.value) return;
    follow.stop();
    onActivate(door);
}

/** Saves the scene and where the Butt is in it, to come back to after a
 * game or a reload. Nothing to save with no scene up (three still loading):
 * what was saved stands. */
function remember() {
    if (sceneRef.value) router.remember(sceneRef.value.position());
}

const layerStyle = computed(() =>
    transition.dolly
        ? {
              transform: `scale(${DOLLY_SCALE})`,
              transformOrigin: `${transition.dolly.x}px ${transition.dolly.y}px`,
              transition: `transform ${DOLLY_MS}ms ease-in`,
          }
        : null
);

const stageLabel = computed(() => {
    const title = t("games.world.title");
    if (inRoom.value) {
        return t("games.world.room_aria", {
            title,
            place: router.current.value.label,
        });
    }
    return t(
        mode.value === "dom"
            ? "games.world.stage_aria"
            : "games.world.stage_lanes_aria",
        { title }
    );
});

function closeCard() {
    card.value = null;
    sceneRef.value?.release();
    // A follow the card held up carries on.
    follow.nudge();
}

/** Follows user `id`, from the roster: focus back on the stage, so the
 * keys that steer (and stop it) still reach the world. */
function followFromRoster(id) {
    follow.start(id);
    focusStage();
}

// Who you can invite into the place you're in (WorldRoster): everyone the
// page knows but you, while messaging is on.
const messagingEnabled = useSiteSetting("messaging_enabled");
const invitees = computed(() =>
    messagingEnabled.value
        ? (page.props.users ?? []).filter(
              (user) => !sameId(user.id, page.props.auth?.user?.id)
          )
        : []
);
const { setFlashMessage } = useFlashMessage();

/** Invites users `ids` into the scene you're in: a chat message linking
 * them here (GameController::invite). You stay where you are. */
function invite(ids) {
    inertia.post(
        route("games.invite"),
        { scene: router.currentId.value, tagged_user_ids: ids },
        {
            preserveState: true,
            preserveScroll: true,
            only: ["flash"],
            onError: (errors) => {
                const text = Object.values(errors)[0];
                if (text) setFlashMessage("error", text);
            },
        }
    );
    focusStage();
}

// --- Layout -----------------------------------------------------------------

const MOBILE_NAV_HEIGHT = 80; // AuthenticatedLayout's pb-20 bottom nav

function measure() {
    if (!stageEl.value) return;
    const rect = stageEl.value.getBoundingClientRect();
    // The page header above the stage is not a fixed height (flash messages, title,
    // seasonal chrome), so the stage takes exactly what is left of the viewport
    // rather than guessing in CSS — otherwise the road hangs below the fold.
    const reserved = window.innerWidth < 640 ? MOBILE_NAV_HEIGHT : 0;
    const visibleHeight = Math.max(
        260,
        window.innerHeight - rect.top - reserved
    );
    stageHeight.value = visibleHeight;
    renderer.setSize(rect.width, visibleHeight);
    sceneRef.value?.setBounds(rect.width, visibleHeight);
}

// A scene mounted after the first measure (once three has loaded, say)
// still needs the stage's size, and to know whether the world is paused.
watch(sceneRef, (scene) => {
    if (!scene) return;
    measure();
    syncDrawing();
    sceneMounted?.();
    sceneMounted = null;
});

onMounted(async () => {
    // Measure after the stage has really been laid out; measuring a stale
    // 0-size box would put the camera deadzone at zero width.
    await nextTick();
    measure();
    resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(stageEl.value);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("pagehide", remember);
    presence.join();

    if (mode.value === "loading") {
        const ready = await renderer.init(canvasEl.value);
        // Unmounted while three was loading: nothing left to draw on.
        if (!stageEl.value) return renderer.dispose();
        mode.value = ready ? "webgl" : "dom";
    }
});

onBeforeUnmount(() => {
    // Leaving the world (for a book, say): come back to the same spot.
    remember();
    window.removeEventListener("pagehide", remember);
    resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onWindowBlur);
    detachPointerListeners();
    renderer.dispose();
    radio.dispose();
    presence.leave();
});

// A card that runs a game (`pausesWorld` in its options: GameHost,
// MinigameCard) covers the world, so the world stops drawing behind it
// rather than run a second animation loop under the game's.
const gameOpen = computed(() => Boolean(card.value?.component.pausesWorld));

/** The world draws only while it can be seen: the tab is showing and no
 * game covers it. */
function syncDrawing() {
    if (document.hidden || gameOpen.value) {
        sceneRef.value?.pause();
        renderer.pause();
    } else {
        renderer.resume();
        sceneRef.value?.resume();
    }
}

watch(gameOpen, syncDrawing);

const onVisibilityChange = syncDrawing;

/** The GPU took the context back (memory pressure, a backgrounded phone).
 * Rather than a blank canvas under live buttons, carry on in the DOM. */
function onContextLost() {
    // The DOM scene picks up where the Butt is, not where it came in.
    router.stay(sceneRef.value?.position() ?? null);
    renderer.dispose();
    mode.value = "dom";
}

function onWindowBlur() {
    sceneRef.value?.interrupt();
}

// --- Pointer ----------------------------------------------------------------

// The scene's handlers for the gesture in progress: { move, end, cancel }.
let gesture = null;

/** Called by a scene when a press starts a drag or pan: routes the rest of
 * the gesture to its handlers and returns the stage's box, measured once
 * here rather than as a layout read on every pointermove. */
function beginGesture(handlers) {
    gesture = handlers;
    attachPointerListeners();
    return stageEl.value.getBoundingClientRect();
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

function onPointerMove(event) {
    gesture?.move(event);
}

function endGesture(how) {
    const handlers = gesture;
    gesture = null;
    detachPointerListeners();
    handlers?.[how]();
}

const onPointerUp = () => endGesture("end");
const onPointerCancel = () => endGesture("cancel");

// --- Keyboard ---------------------------------------------------------------

function resetScroll() {
    if (stageEl.value) stageEl.value.scrollLeft = 0;
}

/** A key or a tap anywhere on the stage lets the world's sounds start (a
 * keyboard player never taps), and its voices: a line said once the Butt
 * has walked over, or a device voice standing in for an AI clip that was
 * slow, comes after the tap, and iOS keeps quiet unless one spoke in it. */
function unlockSounds() {
    if (!audioRunning()) unlockAudio();
    primeSpeech();
}

function onKeydown(event) {
    unlockSounds();
    // Mid-door, the scene's keys wait; Tab and the browser's own still work.
    if (transition.active) return;
    // A card closing on Escape has already used it.
    if (event.key === "Escape") {
        if (!event.defaultPrevented) leave();
        return;
    }
    // With the stage focused and nothing in it focused, Enter visits whatever
    // the butt is standing at. A focused button fires its own click.
    if (event.key === "Enter") {
        if (!card.value && event.target === event.currentTarget) {
            sceneRef.value?.activateNearest();
        }
        return;
    }
    // A card is modal: its keys (a minigame's arrows) are its own, and the
    // scene would take focus back to walk the Butt.
    if (card.value) return;
    sceneRef.value?.onKeydown(event);
}

function onKeyup(event) {
    if (transition.active) return;
    sceneRef.value?.onKeyup(event);
}

// The WebGL scenes draw with `renderer`; the DOM ones ignore it.
/** Focus back on the stage itself, e.g. once the arrow keys have walked
 * the Butt away from the focused button. */
function focusStage() {
    stageEl.value?.focus({ preventScroll: true });
}

// `radioOn(songs)`: whether a radio's songs are playing, for its dial.
const stage = {
    beginGesture,
    resetScroll,
    focus: focusStage,
    renderer,
    radioOn: radio.isOn,
    // Where the Butt is, and where everyone else is (useWorldPresence).
    together: presence.enabled ? presence : null,
    // Starts following user `id`, and stops when the player steers.
    follow: follow.start,
    steered: follow.stop,
};
</script>

<template>
    <div
        ref="stageEl"
        class="stage"
        :style="{
            height: stageHeight ? `${stageHeight}px` : null,
            background: loadingBackground,
        }"
        tabindex="0"
        :aria-label="stageLabel"
        @keydown="onKeydown"
        @keyup="onKeyup"
        @pointerup="unlockSounds"
    >
        <div class="world-layer" :style="layerStyle">
            <canvas
                v-if="mode !== 'dom'"
                ref="canvasEl"
                class="world-canvas"
                aria-hidden="true"
                @webglcontextlost="onContextLost"
            ></canvas>

            <component
                :is="sceneRenderer"
                v-if="sceneRenderer"
                :key="router.currentId.value"
                ref="sceneRef"
                :scene="router.current.value"
                :arrival="router.arrival.value"
                :stage="stage"
                @activate="onActivate"
                @play="play"
                @turned="(wall) => announce(t(`games.world.facing_${wall}`))"
            />
        </div>

        <div
            class="veil"
            :class="{ shown: transition.veil, blocking: transition.active }"
            aria-hidden="true"
        ></div>

        <button
            v-if="inRoom && !transition.active"
            type="button"
            class="world-back bg-theme-primary text-theme-button hover:bg-theme-button"
            :aria-label="t('games.world.back')"
            @click="leave"
        >
            <span aria-hidden="true">←</span>
        </button>

        <!-- Turning round in a room (issue #183), for anyone who doesn't
             find the swipe or Q / E. -->
        <div v-if="inRoom && !transition.active" class="world-turn">
            <button
                v-for="[quarters, name, glyph] in TURNS"
                :key="name"
                type="button"
                class="bg-theme-primary text-theme-button hover:bg-theme-button"
                :aria-label="t(`games.world.${name}`)"
                @click="sceneRef?.turn?.(quarters)"
            >
                <span aria-hidden="true">{{ glyph }}</span>
            </button>
        </div>

        <WorldRoster
            v-if="presence.enabled"
            :roster="presence.roster.value"
            :scenes="scenes"
            :leader="follow.leader.value"
            :invitees="invitees"
            :place="router.current.value?.label ?? ''"
            @follow="followFromRoster"
            @invite="invite"
            @stop="follow.stop"
        />

        <p class="sr-only" aria-live="polite">{{ announcement }}</p>

        <component
            :is="card.component"
            v-if="card"
            v-bind="card.props"
            @cancel="closeCard"
        />
    </div>
</template>

<style scoped>
.stage {
    position: relative;
    width: 100%;
    height: 60vh; /* replaced by the measured height on mount */
    overflow: hidden;
    /* Drags must not fight page scroll, but this is a navigation hub, so
       pinch-zoom stays available elsewhere. */
    touch-action: none;
    user-select: none;
    outline: none;
}

.world-layer {
    position: absolute;
    inset: 0;
}

/* Fades the world out and in as you go through a door, and eats taps
   meanwhile. */
.veil {
    position: absolute;
    inset: 0;
    z-index: 20;
    background: #0c0a09;
    opacity: 0;
    pointer-events: none;
    transition: opacity 150ms ease;
}

.veil.shown {
    opacity: 1;
}

.veil.blocking {
    pointer-events: auto;
}

.world-back {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 10;
    width: 3rem;
    height: 3rem;
    border-radius: 9999px;
    /* Coloured like the site's buttons (the classes), theme and all. */
    font-size: 1.5rem;
    line-height: 1;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.3);
}

.world-back:focus-visible,
.world-turn button:focus-visible {
    outline: 3px solid #1d4ed8;
    outline-offset: 3px;
}

/* Bottom left: clear of the back button above, the music tab on the right
   and the home indicator below. */
.world-turn {
    position: absolute;
    left: calc(0.75rem + env(safe-area-inset-left, 0px));
    bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
    z-index: 10;
    display: flex;
    gap: 0.5rem;
}

.world-turn button {
    width: 3rem;
    height: 3rem;
    border-radius: 9999px;
    font-size: 1.5rem;
    line-height: 1;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.3);
}

.world-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
}
</style>
