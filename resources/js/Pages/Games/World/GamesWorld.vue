<script setup>
import { usePage } from "@inertiajs/vue3";
import { useTranslations } from "@/composables/useTranslations";
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    shallowRef,
    watch,
} from "vue";
import Road3D from "./scenes/Road3D.vue";
import RoadScene from "./scenes/RoadScene.vue";
import { useSceneRouter } from "./composables/useSceneRouter.js";
import { activate } from "./interactions/index.js";
import { worldTheme } from "./three/themes.js";
import { supportsWebGL, useWorldRenderer } from "./three/useWorldRenderer.js";

// The stage: the box the world is drawn in, and everything that isn't any one
// scene's business — the WebGL canvas and its renderer, sizing, window
// pointer listeners, keyboard routing, pausing when the tab hides, and the
// cards interactions open. Whatever scene is current is mounted over the
// canvas and driven through the API it exposes (see useRoad's `api`).
const props = defineProps({
    scenes: { type: Object, required: true },
});

const { t } = useTranslations();
const page = usePage();

// The road's sky and grass behind the stage while three loads.
const loadingBackground = computed(() => {
    const look = worldTheme(page.props.theme);
    return `linear-gradient(${look.skyTop}, ${look.skyBottom} 60%, ${look.grass} 60%)`;
});

// Scene kind → its renderer, on the WebGL canvas or, where WebGL can't run,
// in the DOM. Every kind needs a WebGL one; the DOM one is the fallback.
const SCENE_RENDERERS = {
    road: { webgl: Road3D, dom: RoadScene },
};

// "loading" while three downloads, then "webgl", or "dom" for the fallback
// when there is no WebGL or the renderer can't be made.
const mode = ref(supportsWebGL() ? "loading" : "dom");
const renderer = useWorldRenderer();

const router = useSceneRouter(computed(() => props.scenes));
const sceneRenderer = computed(() =>
    mode.value === "loading"
        ? null
        : SCENE_RENDERERS[router.current.value?.kind]?.[mode.value] ?? null
);

const stageEl = ref(null);
const canvasEl = ref(null);
const stageHeight = ref(null);
const sceneRef = ref(null);
let resizeObserver = null;

// --- Interactions -----------------------------------------------------------

// The open card, if any: { component, props }. Only one at a time.
const card = shallowRef(null);

/** Everything an interaction handler may touch (interactions/index.js). */
const ctx = {
    openCard(component, cardProps = {}) {
        card.value = { component, props: cardProps };
    },
};

function onActivate(item) {
    activate(item, ctx);
    // A handler that didn't open a card is finished, so the scene mustn't
    // stay frozen waiting for a card that never comes.
    if (!card.value) sceneRef.value?.unfreeze();
}

function closeCard() {
    card.value = null;
    sceneRef.value?.release();
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
// still needs the stage's size.
watch(sceneRef, (scene) => {
    if (scene) measure();
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

    if (mode.value === "loading") {
        const ready = await renderer.init(canvasEl.value);
        // Unmounted while three was loading: nothing left to draw on.
        if (!stageEl.value) return renderer.dispose();
        mode.value = ready ? "webgl" : "dom";
    }
});

onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("blur", onWindowBlur);
    detachPointerListeners();
    renderer.dispose();
});

function onVisibilityChange() {
    if (document.hidden) {
        sceneRef.value?.pause();
        renderer.pause();
    } else {
        renderer.resume();
        sceneRef.value?.resume();
    }
}

function onWindowBlur() {
    sceneRef.value?.interrupt();
}

// --- Pointer ----------------------------------------------------------------

// The scene's handlers for the gesture in progress: { move, end, cancel }.
let gesture = null;

/** Called by a scene when a press starts a drag or pan: routes the rest of
 * the gesture to its handlers and returns the stage's left edge, measured
 * once here rather than as a layout read on every pointermove. */
function beginGesture(handlers) {
    gesture = handlers;
    attachPointerListeners();
    return stageEl.value.getBoundingClientRect().left;
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

function onKeydown(event) {
    // With the stage focused and nothing in it focused, Enter visits whatever
    // the peach is standing at. A focused button fires its own click.
    if (event.key === "Enter") {
        if (!card.value && event.target === event.currentTarget) {
            sceneRef.value?.activateNearest();
        }
        return;
    }
    sceneRef.value?.onKeydown(event);
}

function onKeyup(event) {
    sceneRef.value?.onKeyup(event);
}

// The WebGL scenes draw with `renderer`; the DOM ones ignore it.
const stage = { beginGesture, resetScroll, renderer };
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
        :aria-label="t('games.world.stage_aria')"
        @keydown="onKeydown"
        @keyup="onKeyup"
    >
        <canvas
            v-if="mode !== 'dom'"
            ref="canvasEl"
            class="world-canvas"
            aria-hidden="true"
        ></canvas>

        <component
            :is="sceneRenderer"
            v-if="sceneRenderer"
            ref="sceneRef"
            :scene="router.current.value"
            :stage="stage"
            @activate="onActivate"
        />

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
    /* Narrower than useGameViewportLock(): drags must not fight page scroll,
       but this is a navigation hub, so pinch-zoom stays available elsewhere. */
    touch-action: none;
    user-select: none;
    outline: none;
}

.world-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
}
</style>
