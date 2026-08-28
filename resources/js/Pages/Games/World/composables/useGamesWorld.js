import { reactive, computed, onUnmounted, unref } from "vue";

export const WALK_SPEED = 420; // px/s while an arrow key is held
export const END_PAD = 700; // road that keeps going past the last landmark
export const SNAP_RADIUS = 110; // drop this close to a landmark and its card opens
// Camera deadzone: the camera only moves once the peach leaves the middle band
// of the stage, expressed as fractions of stage width.
export const SOFT_LEFT = 0.35;
export const SOFT_RIGHT = 0.65;

const PEACH_START_X = 260;
const ROAD_MARGIN = 40; // the peach can't walk closer than this to either end

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * All state and math for the Games World stage: where the peach is, where the
 * camera is looking, and which landmark it is standing near. Deliberately
 * DOM-free — the component feeds it world coordinates and reads back numbers.
 */
export function useGamesWorld(games, callbacks = {}) {
    const { onArrive } = callbacks;

    const bounds = reactive({ w: 0, h: 0 });

    // Spread rather than whitelist, so a new key on the registry entry reaches
    // the stage without another edit here.
    const landmarks = computed(() =>
        (unref(games) ?? []).map((game) => ({ ...game, x: game.distance }))
    );

    const worldWidth = computed(() => {
        const furthest = landmarks.value.reduce(
            (max, lm) => Math.max(max, lm.x),
            0
        );
        return Math.max(bounds.w, furthest + END_PAD);
    });

    const peach = reactive({ x: PEACH_START_X, vx: 0, facing: 1, bob: 0 });
    const camera = reactive({ x: 0 });

    const state = reactive({
        mode: "idle", // idle | dragging | panning
        walkDir: 0, // -1 | 0 | 1
        confirmSlug: null,
    });

    const nearestLandmark = computed(() => {
        let best = null;
        let bestDistance = SNAP_RADIUS;
        for (const lm of landmarks.value) {
            const distance = Math.abs(lm.x - peach.x);
            if (distance <= bestDistance) {
                best = lm;
                bestDistance = distance;
            }
        }
        return best;
    });

    let rafId = null;
    let lastFrame = 0;
    let lastPanScreenX = 0;

    // `h` is stored for the stage's own layout maths; none of the world
    // simulation reads it.
    function setBounds(w, h) {
        bounds.w = w;
        bounds.h = h;
        updateCamera();
    }

    function findLandmark(slug) {
        return landmarks.value.find((lm) => lm.slug === slug) ?? null;
    }

    function clampCameraX(x) {
        return clamp(x, 0, Math.max(0, worldWidth.value - bounds.w));
    }

    /** Snap — not lerp. The peach is under a finger, and a lagging camera
     * reads as rubber-banding rather than as smoothing. */
    function updateCamera() {
        const screenX = peach.x - camera.x;
        if (screenX < bounds.w * SOFT_LEFT) {
            camera.x = peach.x - bounds.w * SOFT_LEFT;
        } else if (screenX > bounds.w * SOFT_RIGHT) {
            camera.x = peach.x - bounds.w * SOFT_RIGHT;
        }
        camera.x = clampCameraX(camera.x);
    }

    /** The one way the peach moves: clamped to the road, camera following. */
    function setPeachX(x) {
        peach.x = clamp(x, ROAD_MARGIN, worldWidth.value - ROAD_MARGIN);
        updateCamera();
    }

    /** Advances the world by dt seconds. Called every rAF tick; also exposed
     * directly so tests can drive it without faking rAF. */
    function step(dt) {
        if (state.confirmSlug) return; // the world freezes behind the card

        peach.vx = state.walkDir * WALK_SPEED;
        const dragging = state.mode === "dragging";
        // Nothing but walking and dragging moves the peach, and both of those
        // update the camera themselves, so an idle frame has no work to do.
        if (peach.vx === 0 && !dragging) return;

        if (peach.vx !== 0) {
            peach.facing = Math.sign(peach.vx);
            setPeachX(peach.x + peach.vx * dt);
        }
        // Wrapped, so a long session can't drift the bob phase into float mush.
        peach.bob = (peach.bob + dt) % (Math.PI * 2);
    }

    function frame(now) {
        if (!lastFrame) lastFrame = now;
        const dt = Math.min(0.05, (now - lastFrame) / 1000);
        lastFrame = now;

        step(dt);

        rafId = requestAnimationFrame(frame);
    }

    function start() {
        stop();
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        cancelAnimationFrame(rafId);
        rafId = null;
        lastFrame = 0;
    }

    function startDrag() {
        state.mode = "dragging";
        state.walkDir = 0; // a held arrow must not fight the finger
    }

    function updateDrag(worldX) {
        if (state.mode !== "dragging") return;
        peach.facing = Math.sign(worldX - peach.x) || peach.facing;
        setPeachX(worldX);
    }

    function endDrag() {
        if (state.mode !== "dragging") return;
        state.mode = "idle";
        const landmark = nearestLandmark.value;
        if (landmark) openConfirm(landmark.slug);
    }

    function startPan(screenX) {
        state.mode = "panning";
        state.walkDir = 0;
        lastPanScreenX = screenX;
    }

    function updatePan(screenX) {
        if (state.mode !== "panning") return;
        camera.x = clampCameraX(camera.x - (screenX - lastPanScreenX));
        lastPanScreenX = screenX;
    }

    function endPan() {
        if (state.mode !== "panning") return;
        state.mode = "idle";
    }

    function setWalk(dir) {
        state.walkDir = dir;
    }

    function stopWalk(dir) {
        // Only the direction actually being walked can stop the walk, so
        // releasing the other arrow mid-walk doesn't halt the peach.
        if (state.walkDir === dir) state.walkDir = 0;
    }

    /** Teleports the peach to a landmark — used by keyboard focus, and by the
     * confirm card's Cancel so the peach ends up where it was considering. */
    function walkToLandmark(slug) {
        const landmark = findLandmark(slug);
        if (!landmark) return;
        setPeachX(landmark.x);
    }

    function openConfirm(slug) {
        const landmark = findLandmark(slug);
        if (!landmark) return;
        state.confirmSlug = slug;
        peach.vx = 0; // the world freezes; don't leave a stale velocity behind
        if (onArrive) onArrive(landmark);
    }

    function closeConfirm() {
        state.confirmSlug = null;
        // A key may still have been held when the card opened.
        state.walkDir = 0;
    }

    onUnmounted(stop);

    return {
        bounds,
        landmarks,
        worldWidth,
        peach,
        camera,
        state,
        nearestLandmark,
        setBounds,
        start,
        stop,
        step,
        startDrag,
        updateDrag,
        endDrag,
        startPan,
        updatePan,
        endPan,
        setWalk,
        stopWalk,
        walkToLandmark,
        openConfirm,
        closeConfirm,
    };
}
