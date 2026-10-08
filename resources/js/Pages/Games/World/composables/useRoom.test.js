import { describe, expect, it, vi } from "vitest";
import { DRAG_SPEED, WALK_SPEED } from "./useGamesWorld.js";
import { arrivalSpot, REACH, STAND, useRoom } from "./useRoom.js";

const DOOR = { id: "front-door", type: "door", x: 450, z: 0 };
const BELL = { id: "doorbell", type: "toy", x: 700, z: 0 };
const BERRY = { id: "strawberry", type: "toy", x: 150, z: 300 };
const room = {
    size: { w: 900, d: 500 },
    interactables: [DOOR, BELL, BERRY],
};

function makeRoom(options = {}) {
    const onArrive = vi.fn();
    const r = useRoom(room, {
        start: { x: 450, z: 400 },
        onArrive,
        autoTriggers: (item) => item.type === "door",
        ...options,
    });
    return { r, onArrive };
}

/** Steps `r` for `seconds` in 1/60 s frames. */
function run(r, seconds) {
    for (let t = 0; t < seconds; t += 1 / 60) r.step(1 / 60);
}

describe("useRoom", () => {
    it("starts where it is told, inside the room", () => {
        expect(makeRoom().r.butt).toMatchObject({ x: 450, z: 400 });

        const outside = useRoom(room, { start: { x: -100, z: 9999 } });
        expect(outside.butt.x).toBeGreaterThan(0);
        expect(outside.butt.z).toBeLessThanOrEqual(500);
    });

    it("walks in a straight line to a spot on the floor, at drag speed", () => {
        const { r, onArrive } = makeRoom();

        r.walkTo(150, 400);
        r.step(0.5);
        expect(r.butt.x).toBeCloseTo(450 - DRAG_SPEED * 0.5);
        expect(r.butt.facing).toBe(-1);
        expect(r.butt.walking).toBe(true);

        run(r, 2);
        expect(r.butt).toMatchObject({ x: 150, z: 400, walking: false });
        // Nothing there to use.
        expect(onArrive).not.toHaveBeenCalled();
    });

    it("keeps off the walls", () => {
        const { r } = makeRoom();

        r.walkTo(-500, -500);
        run(r, 5);

        expect(r.butt.x).toBeGreaterThan(0);
        expect(r.butt.z).toBeGreaterThan(0);
    });

    it("walks to a toy and uses it there", () => {
        const { r, onArrive } = makeRoom();

        r.goUse(BERRY);
        r.step(0.1);
        expect(onArrive).not.toHaveBeenCalled();

        run(r, 3);
        expect(onArrive).toHaveBeenCalledWith(BERRY);
        expect(r.nearest.value).toBe(BERRY);
        // Using something freezes the room until the stage says so.
        expect(r.state.frozen).toBe(true);
        r.walkTo(450, 400);
        run(r, 1);
        expect(r.butt.x).toBeCloseTo(150);
    });

    it("uses something straight away if it's already there", () => {
        const { r, onArrive } = makeRoom({
            start: { x: BERRY.x, z: BERRY.z + STAND },
        });

        r.goUse(BERRY);

        expect(onArrive).toHaveBeenCalledWith(BERRY);
    });

    it("goes through a door it's dropped at, but not past a toy", () => {
        const { r, onArrive } = makeRoom();

        r.walkTo(BELL.x, STAND);
        run(r, 3);
        expect(onArrive).not.toHaveBeenCalled();

        r.startDrag();
        r.updateDrag(DOOR.x, STAND);
        run(r, 3);
        // Still held: nothing happens until it's let go.
        expect(onArrive).not.toHaveBeenCalled();
        r.endDrag();
        r.step(1 / 60);
        expect(onArrive).toHaveBeenCalledWith(DOOR);
    });

    it("doesn't go back out through the door it's standing at", () => {
        const { r, onArrive } = makeRoom({
            start: { x: DOOR.x, z: DOOR.z + STAND },
        });

        // A tap just beside it, and a press on the Butt that goes nowhere.
        r.walkTo(DOOR.x + 30, DOOR.z + STAND + 20);
        run(r, 1);
        r.startDrag();
        r.endDrag();
        run(r, 1);

        expect(onArrive).not.toHaveBeenCalled();
    });

    it("needs the walk to end right at a door, not just near it", () => {
        const { r, onArrive } = makeRoom();

        // The doorbell's spot, beside the door's.
        r.walkTo(BELL.x, BELL.z + STAND);
        run(r, 3);
        r.walkTo(DOOR.x + 90, DOOR.z + STAND);
        run(r, 3);

        expect(onArrive).not.toHaveBeenCalled();
    });

    it("stands still when a drag is cancelled", () => {
        const { r, onArrive } = makeRoom();

        r.startDrag();
        r.updateDrag(DOOR.x, STAND);
        r.step(0.2);
        r.cancelDrag();
        const { x, z } = r.butt;
        run(r, 2);

        expect(r.butt).toMatchObject({ x, z });
        expect(onArrive).not.toHaveBeenCalled();
    });

    it("walks four ways with the arrow keys, taking over from a stroll", () => {
        const { r } = makeRoom();
        r.walkTo(150, 400);

        r.setKey("z", -1);
        r.step(0.5);
        expect(r.butt.z).toBeCloseTo(400 - WALK_SPEED * 0.5);
        expect(r.butt.x).toBe(450);

        r.setKey("z", 0);
        r.setKey("x", 1);
        r.step(0.5);
        expect(r.butt.x).toBeCloseTo(450 + WALK_SPEED * 0.5);

        r.setKey("x", 0);
        const at = { ...r.butt };
        run(r, 1);
        expect(r.butt.x).toBe(at.x);
    });

    it("stands at a focused interactable at once", () => {
        const { r, onArrive } = makeRoom();

        r.standBy(BELL);

        expect(r.butt).toMatchObject({ x: BELL.x, z: BELL.z + STAND });
        expect(r.nearest.value).toBe(BELL);
        expect(onArrive).not.toHaveBeenCalled();
    });

    it("is near nothing in the middle of the floor", () => {
        const { r } = makeRoom({ start: { x: 450, z: 100 + STAND + REACH } });

        expect(r.nearest.value).toBeNull();
    });

    it("comes back to life on unfreeze, with nothing left in hand", () => {
        const { r } = makeRoom();
        r.goUse(BERRY);
        run(r, 3);

        r.unfreeze();
        r.walkTo(450, 400);
        run(r, 3);

        expect(r.butt).toMatchObject({ x: 450, z: 400 });
    });

    it("comes back down to the floor when it stops", () => {
        const { r } = makeRoom();

        r.walkTo(300, 400);
        run(r, 0.3);
        expect(r.butt.bob).toBeGreaterThan(0);
        run(r, 2);

        expect(r.butt.walking).toBe(false);
        expect(r.butt.bob).toBe(0);
    });

    it("doesn't march on the spot against a wall", () => {
        const { r } = makeRoom({ start: { x: 450, z: 0 } });
        r.setKey("z", -1);
        r.step(1 / 60);

        expect(r.step(1 / 60)).toBe(false);
        expect(r.butt.walking).toBe(false);
    });

    it("doesn't bob under reduced motion", () => {
        const { r } = makeRoom({ isReducedMotion: () => true });

        r.walkTo(150, 400);
        run(r, 0.5);

        expect(r.butt.bob).toBe(0);
    });
});

describe("arrivalSpot", () => {
    const hall = { ...room, spawn: { x: 450, z: 330 } };

    it("stands the Butt in front of the door it came in by", () => {
        expect(arrivalSpot(hall, { spot: "front-door" })).toEqual({
            x: 450,
            z: STAND,
        });
    });

    it("puts it back where it was, over everything", () => {
        expect(
            arrivalSpot(hall, { spot: "front-door", position: { x: 1, z: 2 } })
        ).toEqual({ x: 1, z: 2 });
    });

    it("uses the spawn point otherwise", () => {
        expect(arrivalSpot(hall)).toEqual({ x: 450, z: 330 });
        // Junk saved by an older page.
        expect(arrivalSpot(hall, { position: { x: "far" } })).toEqual({
            x: 450,
            z: 330,
        });
        expect(arrivalSpot(hall, { spot: "trapdoor" })).toEqual({
            x: 450,
            z: 330,
        });
    });
});
