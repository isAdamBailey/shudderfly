import { describe, expect, it } from "vitest";
import {
    PATH_POINTS,
    WALL,
    WORLD_HEIGHT,
    WORLD_WIDTH,
    nearestPoint,
} from "./intestinePath.js";

// Points closer than this along the tube, in tube widths, are the same
// stretch of it, not a fold that came back.
const SAME_STRETCH = 2.2;

describe("the intestine path", () => {
    it("stays inside the world", () => {
        const edge = (f) => Math.min(...PATH_POINTS.map(f));

        expect(edge((p) => p.x - p.hw - WALL)).toBeGreaterThanOrEqual(0);
        expect(
            edge((p) => WORLD_WIDTH - p.x - p.hw - WALL)
        ).toBeGreaterThanOrEqual(0);
        expect(edge((p) => p.y - p.hw - WALL)).toBeGreaterThanOrEqual(0);
        expect(
            edge((p) => WORLD_HEIGHT - p.y - p.hw - WALL)
        ).toBeGreaterThanOrEqual(0);
    });

    it("never runs into itself where it folds back", () => {
        const touching = [];
        for (let i = 0; i < PATH_POINTS.length; i += 3) {
            for (let j = i + 1; j < PATH_POINTS.length; j += 3) {
                const a = PATH_POINTS[i];
                const b = PATH_POINTS[j];
                if (b.s - a.s < (a.hw + b.hw) * SAME_STRETCH) continue;
                const apart = Math.hypot(a.x - b.x, a.y - b.y);
                if (apart <= a.hw + b.hw + WALL * 2) touching.push([a.s, b.s]);
            }
        }

        expect(touching).toEqual([]);
    });

    it("finds the nearest point only near where it last was", () => {
        // Beside the first coil, the colon is nearer, but a wall away.
        const coil = PATH_POINTS.findIndex((p) => p.section === "large") - 1;
        const p = PATH_POINTS[coil];

        expect(nearestPoint(p.x, p.y, coil)).toBe(coil);
    });

    it("walks to the nearest point from anywhere a step past the lining", () => {
        // From a few samples off, pushed out to the wall's edge either side
        // of the tube, the walk still lands beside where the poop is. A bend
        // tighter than the tube is wide would strand it on the wrong side.
        const misses = [];
        for (let i = 0; i < PATH_POINTS.length; i += 5) {
            const p = PATH_POINTS[i];
            const normal = ((p.heading + 90) * Math.PI) / 180;
            for (const side of [1, -1]) {
                const x = p.x + side * p.hw * Math.cos(normal);
                const y = p.y + side * p.hw * Math.sin(normal);
                for (const from of [i - 6, i + 6]) {
                    const near = Math.max(
                        0,
                        Math.min(PATH_POINTS.length - 1, from)
                    );
                    if (Math.abs(nearestPoint(x, y, near) - i) > 1) {
                        misses.push([i, side, from]);
                    }
                }
            }
        }

        expect(misses).toEqual([]);
    });
});
