import { reactive, computed, onUnmounted, unref } from "vue";

export const WALK_SPEED = 220; // px/s while an arrow key is held
// A drag steers the peach rather than teleporting it: it strolls toward the
// finger at its own pace, so a flick of the wrist can't rocket it down the road.
export const DRAG_SPEED = 320; // px/s while being dragged
export const END_PAD = 700; // road that keeps going past the last landmark
export const SNAP_RADIUS = 110; // drop this close to a landmark and its card opens
// Camera deadzone: the camera only moves once the peach leaves the middle band
// of the stage, expressed as fractions of stage width.
export const SOFT_LEFT = 0.35;
export const SOFT_RIGHT = 0.65;

const PEACH_START_X = 260;
const ROAD_MARGIN = 40; // the peach never stands closer than this to either end

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
    // Where the peach is headed: the finger while dragging, and the spot it
    // was dropped on afterwards, so a release still completes the journey.
    // Anything that takes over from a journey (walking, a cancelled drag)
    // clears it, so "still heading somewhere" is also what says a landmark
    // there should open.
    let targetX = null;
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

    /** The road loops: walk off the end and you come back round to the start,
     * so there is no wall to get stuck against. */
    function wrapX(x) {
        const span = worldWidth.value - ROAD_MARGIN * 2;
        if (span <= 0) return ROAD_MARGIN;
        return ROAD_MARGIN + ((((x - ROAD_MARGIN) % span) + span) % span);
    }

    /** Shortest signed distance from `from` to `to` on the looping road. */
    function wrappedGap(from, to) {
        const span = worldWidth.value - ROAD_MARGIN * 2;
        if (span <= 0) return 0;
        let gap = wrapX(to) - wrapX(from);
        if (gap > span / 2) gap -= span;
        if (gap < -span / 2) gap += span;
        return gap;
    }

    /** The one way the peach moves: wrapped to the road, camera following. */
    function setPeachX(x) {
        peach.x = wrapX(x);
        updateCamera();
    }

    /** Advances the world by dt seconds. Called every rAF tick; also exposed
     * directly so tests can drive it without faking rAF. */
    function step(dt) {
        if (state.confirmSlug) return; // the world freezes behind the card

        peach.vx = state.walkDir * WALK_SPEED;

        if (targetX !== null) {
            // Close the shortest wrap-aware gap at a fixed speed, never faster,
            // and snap onto the target so a wrap-boundary step can't overshoot
            // and leave the peach chasing forever.
            const gap = wrappedGap(peach.x, targetX);
            const maxStep = DRAG_SPEED * dt;
            if (Math.abs(gap) <= maxStep) {
                if (gap !== 0) {
                    peach.vx = gap / dt;
                    peach.facing = Math.sign(gap);
                }
                setPeachX(targetX);
                if (state.mode !== "dragging") arrive();
            } else {
                const stepX = Math.sign(gap) * maxStep;
                peach.vx = stepX / dt;
                peach.facing = Math.sign(stepX);
                setPeachX(peach.x + stepX);
            }
        } else if (peach.vx !== 0) {
            peach.facing = Math.sign(peach.vx);
            setPeachX(peach.x + peach.vx * dt);
        } else {
            // Nothing is moving, so an idle frame has no work to do.
            return;
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

    /** The peach has reached where it was sent; a drop next to a landmark is
     * what opens its card. */
    function arrive() {
        targetX = null;
        const landmark = nearestLandmark.value;
        if (landmark) openConfirm(landmark.slug);
    }

    function startDrag() {
        state.mode = "dragging";
        state.walkDir = 0; // a held arrow must not fight the finger
        targetX = peach.x;
    }

    /** Records where the finger is; `step` walks the peach there at DRAG_SPEED
     * rather than snapping, so the world scrolls at a readable pace. The
     * target is wrapped like peach.x so arrival comparisons stay valid when
     * the finger goes past either end of the looping road. */
    function updateDrag(worldX) {
        if (state.mode !== "dragging") return;
        targetX = wrapX(worldX);
    }

    /** Releasing doesn't stop the peach: it keeps strolling to where it was
     * dropped, and the card opens when it actually gets there. */
    function endDrag() {
        if (state.mode !== "dragging") return;
        state.mode = "idle";
        if (targetX === null || peach.x === targetX) arrive();
    }

    /** A pointercancel (system gesture, incoming call) never delivers a
     * pointerup, so the drag has to be abandoned without the drop landing on
     * a landmark and opening a card the player never asked for. */
    function cancelDrag() {
        if (state.mode !== "dragging") return;
        state.mode = "idle";
        targetX = null;
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
        // Walking takes over from an unfinished stroll to a dropped spot.
        targetX = null;
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
        targetX = null;
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
        cancelDrag,
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
