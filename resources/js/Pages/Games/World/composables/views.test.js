import { describe, expect, it } from "vitest";
import {
    fromView,
    toView,
    turned,
    viewSize,
    viewYaw,
    WALLS,
    wallBehind,
} from "./views.js";

const size = { w: 2200, d: 500 };
const POINTS = [
    { x: 0, z: 0 },
    { x: 2200, z: 500 },
    { x: 130, y: 40, z: 320 },
    { x: -60, z: 900 }, // past the room, where the camera stands
];

describe("views", () => {
    it.each(WALLS)("round-trips a room point through the %s view", (wall) => {
        const view = { wall, size };
        for (const point of POINTS) {
            expect(fromView(view, toView(view, point))).toEqual(point);
            expect(toView(view, fromView(view, point))).toEqual(point);
        }
    });

    it("leaves room points as they are facing back, or with no view", () => {
        for (const point of POINTS) {
            expect(toView({ wall: "back", size }, point)).toEqual(point);
            expect(toView(undefined, point)).toEqual(point);
            expect(fromView(undefined, point)).toEqual(point);
        }
        expect(viewYaw(undefined)).toBe(0);
        expect(turned(undefined)).toBe(false);
        expect(turned({ wall: "back", size })).toBe(false);
        expect(turned({ wall: "left", size })).toBe(true);
    });

    it.each([
        // wall, its left end, its right end, a step into the room from it
        ["back", { x: 0, z: 0 }, { x: 2200, z: 0 }, { x: 0, z: 1 }],
        ["right", { x: 2200, z: 0 }, { x: 2200, z: 500 }, { x: -1, z: 0 }],
        ["front", { x: 2200, z: 500 }, { x: 0, z: 500 }, { x: 0, z: -1 }],
        ["left", { x: 0, z: 500 }, { x: 0, z: 0 }, { x: 1, z: 0 }],
    ])(
        "lays the %s wall along the view's back wall",
        (wall, left, right, step) => {
            const view = { wall, size };
            expect(toView(view, left)).toEqual({ x: 0, z: 0 });
            expect(toView(view, right)).toEqual({ x: viewSize(view).w, z: 0 });
            const inward = toView(view, {
                x: left.x + step.x,
                z: left.z + step.z,
            });
            expect(inward.x).toBeCloseTo(0);
            expect(inward.z).toBeCloseTo(1);
        }
    );

    it("measures the room along the faced wall and away from it", () => {
        expect(viewSize({ wall: "back", size })).toEqual(size);
        expect(viewSize({ wall: "front", size })).toEqual(size);
        expect(viewSize({ wall: "left", size })).toEqual({ w: 500, d: 2200 });
        expect(viewSize({ wall: "right", size })).toEqual({ w: 500, d: 2200 });
    });

    it("knows the wall behind the camera, across the room", () => {
        expect(WALLS.map(wallBehind)).toEqual([
            "front",
            "left",
            "back",
            "right",
        ]);
    });
});
