import { onUnmounted, reactive } from "vue";

// Draggable and throwable, purely for fun — dropping one has no effect on the
// game. This lives outside useGamesWorld: it's decoration with no game
// consequence, so it doesn't belong in that composable's testable state.
const GRAVITY = 2200; // px/s^2
const AIR_DRAG = 0.995; // per-frame horizontal velocity decay while airborne
const BOUNCE_DAMPING = 0.4;
const SETTLE_SPEED = 60; // px/s; below this after a bounce, the food just stops

/**
 * Per-idler drag-and-throw physics for the roadside cast: a finger lifts one,
 * releasing it tosses it with the finger's own velocity, and a small
 * gravity/bounce integrator settles it back onto the verge. `isBlocked`
 * lets the caller freeze dragging while the world is frozen behind a card.
 */
export function useIdlerPhysics({ isBlocked } = {}) {
    const idlerPhysics = reactive({});

    function physicsFor(slug) {
        if (!idlerPhysics[slug]) {
            idlerPhysics[slug] = {
                dx: 0,
                dy: 0,
                vx: 0,
                vy: 0,
                airborne: false,
            };
        }
        return idlerPhysics[slug];
    }

    let dragSlug = null;
    let dragLastX = 0;
    let dragLastY = 0;
    let dragLastT = 0;
    let dragVX = 0;
    let dragVY = 0;
    let rafId = null;
    let lastFrame = 0;

    function startLoop() {
        if (rafId) return;
        lastFrame = 0;
        rafId = requestAnimationFrame(frame);
    }

    function stopLoop() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        lastFrame = 0;
    }

    function frame(now) {
        if (!lastFrame) lastFrame = now;
        const dt = Math.min(0.05, (now - lastFrame) / 1000);
        lastFrame = now;

        let stillMoving = Boolean(dragSlug);
        for (const p of Object.values(idlerPhysics)) {
            if (!p.airborne) continue;
            p.vy += GRAVITY * dt;
            p.dx += p.vx * dt;
            p.dy += p.vy * dt;
            p.vx *= AIR_DRAG;
            if (p.dy >= 0) {
                // Landed back on the verge; a soft bounce or a stop, never a
                // dead drop.
                p.dy = 0;
                if (Math.abs(p.vy) > SETTLE_SPEED) {
                    p.vy = -p.vy * BOUNCE_DAMPING;
                    stillMoving = true;
                } else {
                    p.vx = 0;
                    p.vy = 0;
                    p.airborne = false;
                }
            } else {
                stillMoving = true;
            }
        }

        rafId = stillMoving ? requestAnimationFrame(frame) : null;
        if (!stillMoving) lastFrame = 0;
    }

    function onPointerDown(slug, event) {
        if ((isBlocked && isBlocked()) || event.button > 0) return;
        dragSlug = slug;
        const p = physicsFor(slug);
        p.airborne = false;
        p.vx = 0;
        p.vy = 0;
        dragLastX = event.clientX;
        dragLastY = event.clientY;
        dragLastT = performance.now();
        dragVX = 0;
        dragVY = 0;
        window.addEventListener("pointermove", onPointerMove, {
            passive: false,
        });
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerCancel);
    }

    function onPointerMove(event) {
        if (!dragSlug) return;
        event.preventDefault();
        const p = physicsFor(dragSlug);
        const now = performance.now();
        const dt = Math.max((now - dragLastT) / 1000, 1 / 120);
        dragVX = (event.clientX - dragLastX) / dt;
        dragVY = (event.clientY - dragLastY) / dt;
        // Can be lifted as high as the finger goes, but not pushed below the
        // verge it rests on.
        p.dx += event.clientX - dragLastX;
        p.dy = Math.min(p.dy + (event.clientY - dragLastY), 0);
        dragLastX = event.clientX;
        dragLastY = event.clientY;
        dragLastT = now;
    }

    function release(vx, vy) {
        const p = physicsFor(dragSlug);
        p.vx = vx;
        p.vy = vy;
        p.airborne = true;
        dragSlug = null;
        detachListeners();
        startLoop();
    }

    function onPointerUp() {
        if (!dragSlug) return;
        release(dragVX, dragVY);
    }

    function onPointerCancel() {
        // A system gesture stole the pointer mid-toss; let it fall from
        // where it is rather than leaving it stuck floating.
        if (!dragSlug) return;
        release(0, 0);
    }

    function detachListeners() {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerCancel);
    }

    /** Aborts whatever is being held, e.g. when the tab is hidden or loses
     * focus mid-drag — there's no finger behind it anymore, and rAF won't
     * fire while hidden anyway, so marking it airborne would just leave it
     * stuck floating rather than actually falling. Snap it back to rest
     * instead. */
    function cancelActiveDrag() {
        if (dragSlug) {
            const p = physicsFor(dragSlug);
            p.dx = 0;
            p.dy = 0;
            p.vx = 0;
            p.vy = 0;
            p.airborne = false;
            dragSlug = null;
            detachListeners();
        }
        stopLoop();
    }

    onUnmounted(() => {
        detachListeners();
        stopLoop();
    });

    return {
        idlerPhysics,
        onPointerDown,
        cancelActiveDrag,
    };
}
