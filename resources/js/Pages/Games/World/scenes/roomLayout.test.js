import { describe, expect, it } from "vitest";
import { screenToGround, worldToScreen } from "../composables/projection.js";
import { toView } from "../composables/views.js";
import {
    faceOn,
    hungUp,
    inView,
    itemBox,
    itemPose,
    roomCamera,
    roomLayout,
    roomLook,
    ROOM_SIZES,
    viewBand,
    wallOf,
    wallToFace,
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

            for (const id of [
                "kitchen-door",
                "bedroom-door",
                "bathroom-door",
            ]) {
                const p = worldToScreen(entry, itemPose(door(id)));
                expect(p.x < 0 || p.x > stage.w).toBe(true);
            }

            const atKitchen = roomCamera(L, roomLook(L.pan, 1600, 100));
            const kitchen = worldToScreen(
                atKitchen,
                itemPose(door("kitchen-door"))
            );
            expect(kitchen.x).toBeGreaterThan(0);
            expect(kitchen.x).toBeLessThan(stage.w);
            expect(ROOM_SIZES.door.height * kitchen.scale).toBeGreaterThan(48);

            const atBathroom = roomCamera(L, roomLook(L.pan, 1600, 3100));
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

    it("draws a picture in its own frame", () => {
        expect(
            itemBox({
                type: "toy",
                image: { src: "/img/cockroach.png", w: 372, h: 200 },
                size: 80,
            })
        ).toEqual({ width: 372, height: 200, titled: false });
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

    it("draws a modelled prop as wide as its footprint, its size tall", () => {
        expect(
            itemBox({ type: "game", model: "fridge", size: 200 })
        ).toMatchObject({ width: 96, height: 200 });
    });

    it("titles a game, or anything that asks, unless it says not to", () => {
        expect(itemBox({ type: "game" }).titled).toBe(true);
        expect(itemBox({ type: "radio", titled: true }).titled).toBe(true);
        expect(itemBox({ type: "game", titled: false }).titled).toBe(false);
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

// A view from each wall (issue #183), the corners of the wall it faces, and
// the near corners of the band of floor in front of it, in the room's frame.
const FACED = [
    ["back", [0, 0], [900, 0], [0, 500], [900, 500]],
    ["right", [900, 0], [900, 500], [400, 0], [400, 500]],
    ["front", [900, 500], [0, 500], [900, 0], [0, 0]],
    ["left", [0, 500], [0, 0], [500, 500], [500, 0]],
];

describe("a room seen from each wall", () => {
    it("faces back unless it says, with today's numbers", () => {
        for (const stage of STAGES) {
            const L = roomLayout(hall, stage, "back");
            expect(L).toEqual(roomLayout(hall, stage));
            expect(L.camera.x).toBe(450);
            expect(worldToScreen(L.camera, { x: 450, z: 500 }).x).toBeCloseTo(
                stage.w / 2
            );
        }
    });

    it.each(FACED)(
        "frames the %s wall and the floor in front of it",
        (wall, ...corners) => {
            for (const stage of STAGES) {
                const L = roomLayout(hall, stage, wall);
                expect(L.camera.view.wall).toBe(wall);
                expect(L.wallHeight).toBe(roomLayout(hall, stage).wallHeight);
                const [left, right] = corners;
                for (const [x, z] of corners) {
                    // Scrolled along the wall to the corner, on a phone.
                    const along = toView(L.camera.view, { x, z }).x;
                    const cam = roomCamera(L, along);
                    const p = worldToScreen(cam, { x, z });
                    expect(p).not.toBeNull();
                    const back = screenToGround(cam, p.x, p.y);
                    expect(back.x).toBeCloseTo(x, 6);
                    expect(back.z).toBeCloseTo(z, 6);
                }
                // The faced wall's left end is drawn left of its right end.
                const cam = L.camera;
                expect(
                    worldToScreen(cam, { x: left[0], z: left[1] }).x
                ).toBeLessThan(
                    worldToScreen(cam, { x: right[0], z: right[1] }).x
                );
            }
        }
    );

    it("pans along a long hall's back wall but not its short end", () => {
        const back = roomLayout(longHall, STAGES[2], "back");
        const end = roomLayout(longHall, STAGES[2], "left");

        expect(back.pan.max).toBeGreaterThan(back.pan.min);
        expect(end.pan).toEqual({ min: 250, max: 250, slack: 0 });
        // The end wall is seen as close as the back wall is.
        expect(end.camera.z).toBeCloseTo(back.camera.z);
    });
});

describe("things on a wall", () => {
    it("hang up the wall they name, or the back, and stand off it otherwise", () => {
        const size = { w: 900, d: 500 };
        expect(hungUp({ x: 300, y: 120 }, size)).toBe(true);
        expect(hungUp({ wall: "left", x: 0, z: 200, y: 120 }, size)).toBe(true);
        expect(hungUp({ wall: "right", x: 900, z: 200, y: 120 }, size)).toBe(
            true
        );
        // On a cabinet out from its wall, or on the floor.
        expect(hungUp({ x: 300, z: 16, y: 120 }, size)).toBe(false);
        expect(hungUp({ wall: "front", x: 300, z: 484, y: 120 }, size)).toBe(
            false
        );
        expect(hungUp({ wall: "left", x: 0, z: 200 }, size)).toBe(false);
    });

    it("show a picture only facing the wall it hangs on", () => {
        const size = { w: 900, d: 500 };
        const onBack = { x: 300, y: 150, image: { w: 100, h: 130 } };
        const onLeft = { ...onBack, wall: "left", x: 0, z: 200 };
        expect(faceOn(onBack, { wall: "back", size })).toBe(true);
        expect(faceOn(onBack, { wall: "left", size })).toBe(false);
        expect(faceOn(onLeft, { wall: "left", size })).toBe(true);
        expect(faceOn(onLeft, { wall: "back", size })).toBe(false);
        // Standing in the room, it faces out as the back wall's things do.
        const standing = { x: 450, z: 200, screen: { w: 192, h: 108 } };
        expect(faceOn(standing, { wall: "back", size })).toBe(true);
        expect(faceOn(standing, { wall: "front", size })).toBe(false);
    });

    it("hang on the front wall facing into the room", () => {
        const pose = itemPose({ wall: "front", x: 300, z: 500 });
        expect(pose.x).toBeCloseTo(300);
        expect(pose.z).toBe(497);
        expect(pose.turn).toBeCloseTo(Math.PI);
    });

    it("know which wall they're on: their own, or the one they're up against", () => {
        const size = { w: 900, d: 500 };
        expect(wallOf({ wall: "left", x: 0, z: 200 }, size)).toBe("left");
        // Hung up the back wall, or standing on a counter against it.
        expect(wallOf({ x: 300, y: 120 }, size)).toBe("back");
        expect(wallOf({ x: 300, z: 17, y: 90 }, size)).toBe("back");
        // A sconce a little out from the left wall, and one on the right.
        expect(wallOf({ x: 20, z: 260, y: 270 }, size)).toBe("left");
        expect(wallOf({ x: 880, z: 260, y: 270 }, size)).toBe("right");
        // Up in the middle of the room, or on the floor by a wall.
        expect(wallOf({ x: 450, z: 250, y: 300 }, size)).toBeNull();
        expect(wallOf({ x: 300, z: 0 }, size)).toBeNull();
    });

    it("are seen by facing their wall, or the wall nearest them", () => {
        const size = { w: 2200, d: 500 };
        expect(wallToFace({ wall: "left", x: 0, z: 200 }, size)).toBe("left");
        expect(wallToFace({ x: 300, y: 120 }, size)).toBe("back");
        // Standing in the room.
        expect(wallToFace({ x: 2100, z: 250 }, size)).toBe("right");
        expect(wallToFace({ x: 1100, z: 420 }, size)).toBe("front");
        // Whichever it is, it's on the floor in view facing it.
        for (const thing of [
            { x: 2100, z: 250 },
            { x: 1100, z: 420 },
            { x: 240, z: 260 },
        ]) {
            const wall = wallToFace(thing, size);
            expect(inView(thing, { wall, size }, viewBand(size, wall))).toBe(
                true
            );
        }
    });

    it("are framed with the floor in front of the wall in view", () => {
        const long = { size: { w: 2200, d: 500 } };
        expect(roomLayout(long, STAGES[0]).band).toBe(500);
        expect(roomLayout(long, STAGES[0], "left").band).toBe(500);
        expect(roomLayout(hall, STAGES[0], "front").band).toBe(500);
    });

    it("are in view unless behind the camera or nearer than the floor", () => {
        const size = { w: 2200, d: 500 };
        const seen = (thing, wall) => inView(thing, { wall, size }, 500);
        const clock = { x: 300, y: 120 };
        expect(seen(clock, "back")).toBe(true);
        expect(seen(clock, "front")).toBe(false);
        // Facing the left wall, the back wall's end by it is in view; its
        // far end, 2200 off, is behind the camera with the rest of the room.
        expect(seen(clock, "left")).toBe(true);
        expect(seen({ x: 2000, y: 120 }, "left")).toBe(false);
        // A door on the left wall, from the right: behind the camera.
        expect(seen({ wall: "left", x: 0, z: 200 }, "right")).toBe(false);
        expect(seen({ wall: "left", x: 0, z: 200 }, "back")).toBe(true);
        // Something standing in the room near the right wall.
        expect(seen({ x: 2100, z: 250 }, "right")).toBe(true);
        expect(seen({ x: 2100, z: 250 }, "left")).toBe(false);
    });
});
