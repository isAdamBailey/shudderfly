import { describe, expect, it, vi } from "vitest";
import { roomBlocks, useThrowables } from "./useThrowables.js";

// A kitchen in small: a counter along the back wall, a fridge beside it,
// and an apple on the counter.
const kitchen = (more = {}) => ({
    size: { w: 900, d: 500 },
    frame: 900,
    counters: [{ x: 600, w: 400, h: 92, d: 44 }],
    interactables: [
        {
            id: "fridge",
            type: "game",
            x: 265,
            z: 0,
            size: 250,
            model: "fridge",
        },
        {
            id: "apple",
            type: "toy",
            x: 600,
            y: 92,
            z: 22,
            size: 56,
            throwable: true,
        },
        { id: "pot", type: "toy", x: 450, z: 22, size: 70 },
    ],
    ...more,
});

/** Carries the held `id` from (x, y) at (vx, vy) for 10 ms, and lets go. */
function fling(t, id, x, y, vx, vy) {
    t.carry(id, x, y, 0);
    t.carry(id, x + vx / 100, y + vy / 100, 10);
    t.release(id, 10);
}

/** Runs the flight until everything has landed (or `limit` s). */
function settle(t, limit = 20) {
    for (let s = 0; s < limit; s += 1 / 60) {
        if (!t.step(1 / 60)) return s;
    }
    return limit;
}

describe("roomBlocks", () => {
    it("is the counters and the modelled props on the floor, by footprint", () => {
        expect(roomBlocks(kitchen())).toEqual([
            { x0: 400, x1: 800, z1: 44, top: 92 },
            { x0: 205, x1: 325, z1: 45, top: 250 },
        ]);
        // A model hung on the wall, or standing on something, is no block.
        const radio = {
            id: "radio",
            x: 100,
            y: 120,
            z: 16,
            size: 120,
            model: "radio",
        };
        expect(roomBlocks({ interactables: [radio] })).toEqual([]);
    });
});

describe("useThrowables", () => {
    it("knows only what's throwable, where it stands", () => {
        const t = useThrowables(kitchen());
        expect(Object.keys(t.at)).toEqual(["apple"]);
        expect(t.at.apple).toMatchObject({ x: 600, y: 92, z: 22 });
    });

    it("stands on the counter, the fridge, or the floor", () => {
        const t = useThrowables(kitchen());
        expect(t.groundAt(600, 20)).toBe(92);
        expect(t.groundAt(265, 20)).toBe(250);
        expect(t.groundAt(600, 200)).toBe(0);
    });

    it("carries a held thing inside the room, never into what's under it", () => {
        const t = useThrowables(kitchen());
        t.grab("apple");
        t.carry("apple", 790, -100);
        expect(t.at.apple).toMatchObject({ x: 790, y: 92, held: true });
        // Against the right wall, its middle a radius in, past the counter.
        t.carry("apple", 5000, -100);
        expect(t.at.apple).toMatchObject({ x: 872, y: 0 });
        t.carry("apple", 600, 9999);
        // Under the ceiling (the walls are half the frame tall).
        expect(t.at.apple.y).toBe(450 - 56);
    });

    it("carries nothing it isn't holding", () => {
        const t = useThrowables(kitchen());
        t.carry("apple", 100, 300);
        expect(t.at.apple).toMatchObject({ x: 600, y: 92 });
    });

    it("throws out into the room, bounces off the walls, and comes to rest on the floor", () => {
        const onLand = vi.fn();
        const t = useThrowables(kitchen(), { onLand });
        t.grab("apple");
        fling(t, "apple", 600, 300, 2400, 400);
        expect(t.at.apple.flying).toBe(true);
        expect(t.at.apple.vx).toBeCloseTo(2400);
        expect(t.at.apple.vz).toBeGreaterThan(0);

        let hitWall = false;
        for (let i = 0; i < 120 && !hitWall; i += 1) {
            t.step(1 / 60);
            hitWall = t.at.apple.vx < 0;
        }
        expect(hitWall).toBe(true);
        expect(t.at.apple.x).toBeLessThanOrEqual(872);

        expect(settle(t)).toBeLessThan(20);
        expect(onLand).toHaveBeenCalledWith("apple");
        const { x, y, z } = t.at.apple;
        expect(y).toBe(t.groundAt(x, z));
        expect(z).toBeGreaterThanOrEqual(28);
        expect(z).toBeLessThanOrEqual(500 - 28);
        expect(t.at.apple.flying).toBe(false);
    });

    it("lands on top of the fridge when dropped over it", () => {
        const t = useThrowables(kitchen());
        t.grab("apple");
        // Up over the fridge, at the apple's depth (on its footprint).
        t.carry("apple", 600, 380, 0);
        t.carry("apple", 265, 380, 0);
        t.release("apple", 1000);
        settle(t);
        expect(t.at.apple).toMatchObject({ x: 265, y: 250 });
    });

    it("bounces off the side of something it's lower than", () => {
        const t = useThrowables(kitchen());
        t.grab("apple");
        // Low down by the fridge's right side, thrown at it.
        fling(t, "apple", 360, 100, -2000, 0);
        // Straight along the wall, not out into the room.
        t.at.apple.vz = 0;
        let bounced = false;
        for (let i = 0; i < 60 && !bounced; i += 1) {
            t.step(1 / 60);
            bounced = t.at.apple.vx > 0;
        }
        expect(bounced).toBe(true);
        expect(t.at.apple.x).toBeGreaterThan(320);
    });

    it("lets a thing held still fall, not fly", () => {
        const t = useThrowables(kitchen());
        t.grab("apple");
        t.carry("apple", 600, 300, 0);
        t.carry("apple", 650, 300, 10);
        // Held there a while before letting go.
        t.release("apple", 500);
        expect(t.at.apple).toMatchObject({ vx: 0, vz: 0, flying: true });
        settle(t);
        expect(t.at.apple).toMatchObject({ x: 650, y: 92 });
    });

    it("tells the scene graph only what moved, once", () => {
        const t = useThrowables(kitchen());
        expect(t.changed()).toEqual([]);
        t.grab("apple");
        t.carry("apple", 700, 300);
        expect(t.changed()).toEqual([
            { id: "apple", x: 700, y: 300, z: 28, ground: 92, tilt: 0 },
        ]);
        expect(t.changed()).toEqual([]);
    });

    it("drops straight down under reduced motion", () => {
        const onLand = vi.fn();
        const t = useThrowables(kitchen(), {
            isReducedMotion: () => true,
            onLand,
        });
        t.grab("apple");
        fling(t, "apple", 600, 300, 2400, 400);
        expect(t.at.apple).toMatchObject({ x: 624, y: 92, flying: false });
        expect(t.step(1 / 60)).toBe(false);
        expect(onLand).toHaveBeenCalledWith("apple");
    });

    it("puts down whatever's held when the world is interrupted, feeding nothing", () => {
        const onLand = vi.fn();
        const t = useThrowables(kitchen(), { onLand });
        t.grab("apple");
        t.carry("apple", 600, 300);
        t.drop();
        expect(t.at.apple).toMatchObject({ y: 92, held: false });
        expect(onLand).not.toHaveBeenCalled();
    });

    it("flings as fast as it really moved, not the finger pushing it into the floor", () => {
        const t = useThrowables(kitchen());
        t.grab("apple");
        t.carry("apple", 600, 92, 0);
        t.carry("apple", 600, -2000, 10);
        t.release("apple", 10);
        expect(t.at.apple).toMatchObject({ vx: 0, vy: 0, vz: 0 });
    });

    it("stops at the side of something taller when carried low into it", () => {
        const t = useThrowables(kitchen());
        t.grab("apple");
        t.carry("apple", 360, 50);
        // Along the wall into the fridge (205 to 325, 250 tall).
        t.carry("apple", 300, 50);
        expect(t.at.apple).toMatchObject({ x: 360, y: 50 });
        // Lifted over it, it can be put on top.
        t.carry("apple", 360, 300);
        t.carry("apple", 265, 300);
        expect(t.at.apple.x).toBe(265);
    });

    it("rolls onto a ledge only a hair higher, rather than bouncing off it", () => {
        // An oven whose cooktop is a little above the counter beside it.
        const room = kitchen({
            counters: [
                { x: 600, w: 400, h: 92, d: 44 },
                { x: 860, w: 120, h: 94, d: 44 },
            ],
        });
        const t = useThrowables(room);
        t.grab("apple");
        t.carry("apple", 780, 92, 0);
        t.carry("apple", 785, 92, 10);
        t.release("apple", 10);
        t.at.apple.vz = 0;
        for (let i = 0; i < 20; i += 1) t.step(1 / 60);
        expect(t.at.apple.x).toBeGreaterThan(800);
    });

    it("places a thrown thing where it landed, for the Butt to walk to", () => {
        const room = kitchen();
        const t = useThrowables(room);
        t.grab("apple");
        t.carry("apple", 700, 300);
        t.drop();
        const [, apple, pot] = room.interactables;
        expect(t.placed(apple)).toMatchObject({ id: "apple", x: 700, y: 92 });
        expect(t.placed(pot)).toBe(pot);
    });
});
