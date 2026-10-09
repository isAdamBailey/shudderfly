import { describe, expect, it } from "vitest";
import { screenToGround, worldToScreen } from "../composables/projection.js";
import {
    itemBox,
    itemPose,
    roomCamera,
    roomLayout,
    roomLook,
    ROOM_SIZES,
} from "./roomLayout.js";

const hall = {
    size: { w: 900, d: 500 },
    spawn: { x: 450, z: 330 },
    interactables: [{ id: "front-door", type: "door", x: 450, z: 0 }],
};

const STAGES = [
    { w: 375, h: 560 }, // a phone
    { w: 820, h: 1000 }, // a tablet, upright
    { w: 1280, h: 620 }, // a laptop
];

function expectOnScreen(camera, point, stage) {
    const p = worldToScreen(camera, point);
    expect(p.x).toBeGreaterThanOrEqual(-0.5);
    expect(p.x).toBeLessThanOrEqual(stage.w + 0.5);
    expect(p.y).toBeGreaterThanOrEqual(-0.5);
    expect(p.y).toBeLessThanOrEqual(stage.h + 0.5);
}

describe("roomLayout", () => {
    it.each(STAGES)("keeps the room on a $w × $h stage", (stage) => {
        const L = roomLayout(hall, stage);
        const { w, d } = hall.size;
        const corners = [
            { x: 0, z: d }, // the floor's front edge
            { x: w, z: d },
            { x: 0, y: L.wallHeight, z: 0 }, // the back wall's top
            { x: w, y: L.wallHeight, z: 0 },
        ];

        // A phone shows less of a wide room, so the camera scrolls to a
        // corner before that corner is on screen.
        for (const corner of corners) {
            const look = Math.min(L.pan.max, Math.max(L.pan.min, corner.x));
            expectOnScreen(roomCamera(L, look), corner, stage);
        }
    });

    it("stands the room's middle in the middle of the stage", () => {
        const L = roomLayout(hall, STAGES[2]);

        expect(worldToScreen(L.camera, { x: 450, z: 500 }).x).toBeCloseTo(640);
    });

    it("draws the back of the room smaller than the front", () => {
        const L = roomLayout(hall, STAGES[0]);
        const back = worldToScreen(L.camera, { x: 450, z: 0 });
        const front = worldToScreen(L.camera, { x: 450, z: 500 });

        expect(back.scale).toBeLessThan(front.scale);
        expect(back.y).toBeLessThan(front.y);
        // Filling the height, not the width, so a door stays large on a phone.
        expect(ROOM_SIZES.door.height * back.scale).toBeGreaterThan(120);
    });
});

// The Butt's hall: long enough that the end doors start off-screen, walls
// no taller than a room the width of `frame`.
const longHall = {
    size: { w: 3200, d: 500 },
    frame: 900,
    interactables: [
        { id: "kitchen-door", type: "door", x: 0, z: 220, wall: "left" },
        { id: "bedroom-door", type: "door", x: 240, z: 0 },
        { id: "front-door", type: "door", x: 1600, z: 0 },
        { id: "bathroom-door", type: "door", x: 3200, z: 220, wall: "right" },
    ],
};

describe("a long hall", () => {
    it("keeps the walls as tall as the part the camera shows", () => {
        const framed = roomLayout(longHall, STAGES[2]);
        const room = roomLayout({ size: { w: 900, d: 500 } }, STAGES[2]);

        expect(framed.wallHeight).toBe(room.wallHeight);
        expect(framed.camera.y).toBe(room.camera.y);
        expect(framed.camera.z).toBeCloseTo(room.camera.z);
    });

    it.each(STAGES)(
        "leaves the other doors off a $w × $h stage until the Butt walks there",
        (stage) => {
            const L = roomLayout(longHall, stage);
            const entry = roomCamera(L, 1600);
            const door = (id) =>
                longHall.interactables.find((item) => item.id === id);

            const front = worldToScreen(entry, itemPose(door("front-door")));
            expect(front.x).toBeGreaterThan(0);
            expect(front.x).toBeLessThan(stage.w);
            // A clock hung beside the front door is in that first view.
            const clock = worldToScreen(entry, { x: 1360, y: 270, z: 3 });
            expect(clock.x).toBeGreaterThan(0);
            expect(clock.x).toBeLessThan(stage.w);

            for (const id of ["kitchen-door", "bedroom-door", "bathroom-door"]) {
                const p = worldToScreen(entry, itemPose(door(id)));
                expect(p.x < 0 || p.x > stage.w).toBe(true);
            }

            const atKitchen = roomCamera(
                L,
                roomLook(L.pan, 1600, 100)
            );
            const kitchen = worldToScreen(
                atKitchen,
                itemPose(door("kitchen-door"))
            );
            expect(kitchen.x).toBeGreaterThan(0);
            expect(kitchen.x).toBeLessThan(stage.w);
            expect(ROOM_SIZES.door.height * kitchen.scale).toBeGreaterThan(48);

            const atBathroom = roomCamera(
                L,
                roomLook(L.pan, 1600, 3100)
            );
            const bathroom = worldToScreen(
                atBathroom,
                itemPose(door("bathroom-door"))
            );
            expect(bathroom.x).toBeGreaterThan(0);
            expect(bathroom.x).toBeLessThan(stage.w);
        }
    );

    it("doesn't scroll a room that fits the stage", () => {
        const L = roomLayout(hall, STAGES[2]);

        expect(roomLook(L.pan, 450, 100)).toBe(450);
        expect(roomCamera(L, 100)).toBe(L.camera);
    });
});

describe("itemBox", () => {
    it("draws a TV as its flat screen, untitled", () => {
        expect(
            itemBox({ type: "tv", screen: { w: 192, h: 108 }, size: 80 })
        ).toEqual({ width: 192, height: 108, titled: false });
    });

    it("draws an open doorway wider than a door", () => {
        expect(itemBox({ type: "door", open: true })).toEqual({
            ...ROOM_SIZES.doorway,
            titled: true,
        });
        expect(ROOM_SIZES.doorway.width).toBeGreaterThan(ROOM_SIZES.door.width);
    });

    it("draws a door as a titled doorway", () => {
        expect(itemBox({ type: "door" })).toEqual({
            ...ROOM_SIZES.door,
            titled: true,
        });
    });

    it("leaves the way back untitled: a room's way out, and stairs", () => {
        expect(itemBox({ type: "door", exit: true }).titled).toBe(false);
        expect(itemBox({ type: "door", stairs: "up" }).titled).toBe(false);
    });

    it("draws anything else as a square, its size or the default", () => {
        expect(itemBox({ type: "toy", size: 50 })).toEqual({
            width: 50,
            height: 50,
            titled: false,
        });
        expect(itemBox({ type: "toy" }).height).toBe(ROOM_SIZES.toy);
    });

    it("titles a game, or anything that asks", () => {
        expect(itemBox({ type: "game" }).titled).toBe(true);
        expect(itemBox({ type: "radio", titled: true }).titled).toBe(true);
    });
});

describe("the room's floor and the screen", () => {
    it.each(STAGES)(
        "maps taps on a $w × $h stage back to the floor, corners included",
        (stage) => {
            const L = roomLayout(hall, stage);
            const { w, d } = hall.size;
            for (const point of [
                { x: 0, z: 0 },
                { x: w, z: 0 },
                { x: 0, z: d },
                { x: w, z: d },
                { x: w / 2, z: d / 2 },
            ]) {
                const p = worldToScreen(L.camera, point);
                const back = screenToGround(L.camera, p.x, p.y);
                expect(back.x).toBeCloseTo(point.x, 6);
                expect(back.z).toBeCloseTo(point.z, 6);
            }
        }
    );
});
