import { describe, expect, it } from "vitest";
import { BUTT_VIEW, BUTT_FRAME, buttDrop, buttParts, buttShapes } from "./buttDraw.js";

describe("butt drawing", () => {
    it("is two cheeks, two legs and two feet", () => {
        const parts = buttParts();
        expect(parts.cheeks).toHaveLength(2);
        expect(parts.legs).toHaveLength(2);
        expect(parts.feet).toHaveLength(2);
        parts.feet.forEach((foot, index) => {
            expect(foot.sx * 2).toBeGreaterThan(parts.legs[index].width);
            expect(foot.sy).toBeLessThan(foot.sx);
            expect(foot.y - foot.sy).toBeCloseTo(0);
        });
        const drawn = buttShapes().filter((shape) => shape.type === "foot");
        expect(drawn).toHaveLength(2);
        drawn.forEach((foot) => expect(foot.rx).toBeGreaterThan(foot.ry));
        expect(parts.cleft.width).toBeGreaterThan(0);
    });

    it("shows a three-quarter view, one cheek nearer and larger", () => {
        expect(Math.abs(BUTT_VIEW.yaw)).toBeGreaterThan(30);
        expect(Math.abs(BUTT_VIEW.pitch)).toBeGreaterThan(0);

        const cheeks = buttShapes().filter((shape) => shape.type === "cheek");
        const [near, far] = [...cheeks].sort((a, b) => b.z - a.z);
        expect(near.z).toBeGreaterThan(far.z);
        expect(near.r).toBeGreaterThan(far.r * 1.08);
        expect(near.x).not.toBeCloseTo(far.x);
    });

    it("stands the projected figure on the ground", () => {
        const shapes = buttShapes();
        const lowest = Math.min(
            ...shapes.map((shape) =>
                shape.ry
                    ? shape.y - shape.ry
                    : shape.r
                      ? shape.y - shape.r
                      : Math.min(shape.y1, shape.y2) - shape.width / 2
            )
        );
        expect(lowest).toBeCloseTo(0, 1);
        expect(BUTT_FRAME.minY).toBeCloseTo(0, 1);
        expect(buttDrop()).not.toBe(0);
    });

    it("draws the far side first", () => {
        const shapes = buttShapes();
        const order = shapes.map((shape) => shape.z);
        const sorted = [...order].sort((a, b) => a - b);
        expect(order).toEqual(sorted);
        expect(shapes.at(-1).type).toBe("cleft");
    });
});