import { describe, expect, it } from "vitest";
import { BASS_DRUM, headPoint, hitEdge } from "./drumLayout.js";

describe("the bass drum's layout", () => {
    it("hangs its head clear of the floor, facing out", () => {
        const item = { x: 420, z: 40 };
        const middle = headPoint(item);
        expect(middle.x).toBe(420);
        expect(middle.y - BASS_DRUM.radius).toBeGreaterThan(20);
        expect(headPoint(item, 0, 10).y).toBe(middle.y + 10);
    });

    it("measures a hit from the middle of the head to its rim", () => {
        const middle = { x: 100, y: 100 };
        const radii = { rx: 50, ry: 40 };
        expect(hitEdge(middle, radii, middle)).toBe(0);
        expect(hitEdge(middle, radii, { x: 125, y: 100 })).toBeCloseTo(0.5);
        expect(hitEdge(middle, radii, { x: 100, y: 60 })).toBeCloseTo(1);
        // Past the rim (the button's corner) is still the rim.
        expect(hitEdge(middle, radii, { x: 200, y: 200 })).toBe(1);
        expect(hitEdge(middle, { rx: 0, ry: 0 }, middle)).toBe(0);
    });
});
