import { describe, expect, it, vi } from "vitest";
import { shallowRef } from "vue";
import { INSTRUMENT_FOOTPRINTS } from "../scenes/instruments.js";
import { itemLocal } from "../scenes/roomLayout.js";
import { STAIRS_CLEARANCE } from "../scenes/roomLayout.js";
import { DRAG_SPEED, FOLLOW_GAP, WALK_SPEED } from "./useGamesWorld.js";
import {
    arrivalSpot,
    BLOCK_CLEARANCE,
    REACH,
    STAND,
    useRoom,
} from "./useRoom.js";

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

    it("walks to a thing where it's been moved, and hands back the thing itself", () => {
        // The strawberry, thrown to the far end of the room.
        const { r, onArrive } = makeRoom({
            placed: (item) => (item === BERRY ? { ...item, x: 800 } : item),
        });

        r.goUse(BERRY);
        run(r, 3);
        expect(r.butt.x).toBeCloseTo(800);
        expect(onArrive).toHaveBeenCalledWith(BERRY);
        expect(r.nearest.value).toBe(BERRY);
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

    it("is put down at once where it's told, kept to the floor", () => {
        const { r } = makeRoom();
        r.walkTo(100, 100);
        r.placeAt(300, 200);
        expect(r.butt).toMatchObject({ x: 300, z: 200 });
        // It doesn't carry on to where it was walking.
        run(r, 1);
        expect(r.butt).toMatchObject({ x: 300, z: 200 });

        r.placeAt(-500, 9999);
        expect(r.butt).toMatchObject(r.inside(-500, 9999));
    });

    it("stands as far out as a thing says, off whichever wall it's on", () => {
        const organ = {
            id: "organ",
            type: "organ",
            wall: "left",
            x: 0,
            z: 250,
            stand: 150,
        };
        const { r } = makeRoom();

        r.standBy(organ);

        expect(r.butt).toMatchObject({ x: 150, z: 250 });
    });

    it("keeps off an organ's floor, sliding along it, and stands clear of it", () => {
        const organ = {
            id: "organ",
            type: "organ",
            wall: "right",
            x: 900,
            z: 250,
            stand: 200,
        };
        const r = useRoom(
            { size: { w: 900, d: 500 }, interactables: [organ] },
            { start: { x: 600, z: 250 } }
        );

        // Straight at it: stops at its edge, the Butt's half-width short of
        // where the organ reaches (its pedals, 127 out of the wall).
        const edge = 900 - 127 - BLOCK_CLEARANCE;
        r.setKey("x", 1);
        run(r, 3);
        expect(r.butt.x).toBeLessThanOrEqual(edge);
        expect(r.butt.x).toBeGreaterThan(edge - 10);
        // A tap on it walks only to its edge.
        r.setKey("x", 0);
        r.walkTo(890, 250);
        run(r, 3);
        expect(r.butt.x).toBeLessThanOrEqual(edge);

        r.standBy(organ);
        expect(r.butt).toMatchObject({ x: 700, z: 250 });
        // Never starts inside it either.
        const inside = useRoom(
            { size: { w: 900, d: 500 }, interactables: [organ] },
            { start: { x: 880, z: 250 } }
        );
        expect(inside.butt.x).toBeLessThanOrEqual(edge);
    });

    it("keeps off an organ turned in a corner, and stands at its keys", () => {
        const organ = {
            id: "organ",
            type: "organ",
            wall: "back-right",
            x: 900 - 115,
            z: 115,
            stand: 200,
        };
        const r = useRoom(
            { size: { w: 900, d: 500 }, interactables: [organ] },
            { start: { x: 400, z: 400 } }
        );

        // Walking into the corner stops short of the organ's slanted front.
        r.walkTo(880, 60);
        run(r, 5);
        const keys = itemLocal(organ, r.butt);
        expect(keys.z).toBeGreaterThanOrEqual(124 + BLOCK_CLEARANCE - 1);

        // Its spot to play it is out on the diagonal, clear of it, and
        // near enough to use it.
        r.standBy(organ);
        expect(r.butt.x).toBeCloseTo(785 - 200 * Math.SQRT1_2, 0);
        expect(r.butt.z).toBeCloseTo(115 + 200 * Math.SQRT1_2, 0);
        expect(r.nearest.value).toBe(organ);
    });

    it("keeps off a harp's and a drum's floor too, and stands clear of each", () => {
        const harp = { id: "harp", type: "harp", x: 720, z: 30, stand: 120 };
        const drum = { id: "drum", type: "drum", x: 420, z: 40, stand: 170 };
        const room = { size: { w: 1300, d: 480 }, interactables: [harp, drum] };
        for (const item of [harp, drum]) {
            const r = useRoom(room, { start: { x: item.x, z: 400 } });
            // Walking straight at it stops short of its front.
            r.walkTo(item.x, 60);
            run(r, 5);
            const f = INSTRUMENT_FOOTPRINTS[item.type];
            expect(itemLocal(item, r.butt).z).toBeGreaterThanOrEqual(
                f.z1 + BLOCK_CLEARANCE - 1
            );
            // Its spot to play it is clear of it, and near enough.
            r.standBy(item);
            expect(r.butt.z).toBeCloseTo(item.z + item.stand, 0);
            expect(r.nearest.value).toBe(item);
        }
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

describe("useRoom extras", () => {
    it("stands at and uses things fetched after the room was made", () => {
        const books = shallowRef([]);
        const { r, onArrive } = makeRoom({ extras: () => books.value });
        const book = { id: "book-books-0", type: "book", x: 300, z: 0 };

        r.standBy(BERRY);
        r.walkTo(300, STAND);
        run(r, 3);
        expect(r.nearest.value).toBeNull();

        books.value = [book];
        expect(r.nearest.value).toBe(book);
        r.goUse(book);
        expect(onArrive).toHaveBeenCalledWith(book);
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

    it("stands inside the room, off a door on a side wall", () => {
        const side = {
            id: "kitchen-door",
            type: "door",
            x: 0,
            z: 220,
            wall: "left",
        };
        const wide = {
            size: { w: 3200, d: 500 },
            spawn: { x: 1600, z: 330 },
            interactables: [side],
        };

        expect(arrivalSpot(wide, { spot: "kitchen-door" })).toEqual({
            x: STAND,
            z: 220,
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

    it("keeps clear of a wall with stairs, and stands clear to use them", () => {
        const down = {
            id: "downstairs",
            type: "door",
            wall: "left",
            x: 0,
            z: 220,
            stairs: "down",
        };
        const up = {
            ...down,
            id: "upstairs",
            wall: "right",
            x: 900,
            stairs: "up",
        };
        const landing = { size: { w: 900, d: 450 }, interactables: [down, up] };
        const r = useRoom(landing, { start: { x: 450, z: 300 } });

        r.walkTo(0, 300);
        run(r, 5);
        expect(r.butt.x).toBe(STAIRS_CLEARANCE);
        r.walkTo(900, 300);
        run(r, 5);
        expect(r.butt.x).toBe(900 - STAIRS_CLEARANCE);

        expect(arrivalSpot(landing, { spot: "downstairs" })).toEqual({
            x: STAIRS_CLEARANCE,
            z: 220,
        });
    });
});

describe("useRoom walking up to someone", () => {
    it("stops short of them, and never goes through a door beside them", () => {
        const { r, onArrive } = makeRoom();

        // Someone standing in the front door.
        r.walkUpTo(450, 50);
        run(r, 3);

        expect(Math.hypot(r.butt.x - 450, r.butt.z - 50)).toBeCloseTo(
            FOLLOW_GAP
        );
        expect(onArrive).not.toHaveBeenCalled();
    });

    it("stays put when already that close", () => {
        const { r } = makeRoom();
        r.walkUpTo(450 + FOLLOW_GAP / 2, 400);
        run(r, 1);

        expect(r.butt).toMatchObject({ x: 450, z: 400, walking: false });
    });

    it("keeps someone else's spot inside the walls", () => {
        const { r } = makeRoom();

        expect(r.inside(-500, 9999)).toEqual({ x: 50, z: 500 });
    });
});
