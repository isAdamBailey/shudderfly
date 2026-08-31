import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useIdlerPhysics } from "./useIdlerPhysics.js";

/** A pointer event carrying only the fields the composable reads. */
function pointer(clientX, clientY, button = 0) {
    return { clientX, clientY, button, preventDefault: () => {} };
}

/** Fires the window-level listener the composable attached for `type`. */
function fire(type, event) {
    window.dispatchEvent(Object.assign(new Event(type), event));
}

let now;

beforeEach(() => {
    now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    // The throw arc runs on rAF; the tests here only assert the state at the
    // moment of release, so frames never need to actually run.
    vi.stubGlobal("requestAnimationFrame", () => 1);
    vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

/** Grabs an idler, flicks it right, and lets go. */
function flick(ctl) {
    ctl.onPointerDown("a", pointer(0, 0));
    now = 16;
    fire("pointermove", pointer(60, -40));
    fire("pointerup", {});
}

describe("useIdlerPhysics", () => {
    it("launches the idler with the flick's velocity", () => {
        const ctl = useIdlerPhysics();

        flick(ctl);

        expect(ctl.idlerPhysics.a.airborne).toBe(true);
        expect(ctl.idlerPhysics.a.vx).toBeGreaterThan(0);
        expect(ctl.idlerPhysics.a.vy).toBeLessThan(0);
    });

    it("settles the idler back to rest under reduced motion", () => {
        const ctl = useIdlerPhysics({ isReducedMotion: () => true });

        flick(ctl);

        expect(ctl.idlerPhysics.a.airborne).toBe(false);
        expect(ctl.idlerPhysics.a).toMatchObject({
            dx: 0,
            dy: 0,
            vx: 0,
            vy: 0,
        });
    });

    it("still follows the finger under reduced motion", () => {
        const ctl = useIdlerPhysics({ isReducedMotion: () => true });

        ctl.onPointerDown("a", pointer(0, 0));
        now = 16;
        fire("pointermove", pointer(60, -40));

        expect(ctl.idlerPhysics.a.dx).toBe(60);
        expect(ctl.idlerPhysics.a.dy).toBe(-40);
    });

    it("ignores a press while the world is blocked", () => {
        const ctl = useIdlerPhysics({ isBlocked: () => true });

        flick(ctl);

        expect(ctl.idlerPhysics.a).toBeUndefined();
    });
});
