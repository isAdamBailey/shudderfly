import { describe, expect, it } from "vitest";
import { worldToScreen } from "../composables/projection.js";
import { arrivalSpot, roomLayout, ROOM_SIZES } from "./roomLayout.js";

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

describe("roomLayout", () => {
    it.each(STAGES)("fits the whole room on a $w × $h stage", (stage) => {
        const L = roomLayout(hall, stage);
        const { w, d } = hall.size;
        const corners = [
            { x: 0, z: d }, // the floor's front edge
            { x: w, z: d },
            { x: 0, y: L.wallHeight, z: 0 }, // the back wall's top
            { x: w, y: L.wallHeight, z: 0 },
        ];

        for (const corner of corners) {
            const p = worldToScreen(L.camera, corner);
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(stage.w);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThanOrEqual(stage.h);
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
        // A door on the back wall is still something you can see.
        expect(ROOM_SIZES.door.height * back.scale).toBeGreaterThan(48);
    });
});

describe("arrivalSpot", () => {
    it("stands the Butt in front of the door it came through", () => {
        const at = arrivalSpot(hall, "front-door");

        expect(at.x).toBe(450);
        expect(at.z).toBeGreaterThan(0);
        expect(at.z).toBeLessThanOrEqual(500);
    });

    it("uses the spawn point otherwise", () => {
        expect(arrivalSpot(hall, null)).toEqual({ x: 450, z: 330 });
        expect(arrivalSpot(hall, "trapdoor")).toEqual({ x: 450, z: 330 });
    });
});
