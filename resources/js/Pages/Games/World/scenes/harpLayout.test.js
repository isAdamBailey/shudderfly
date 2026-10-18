import { describe, expect, it } from "vitest";
import {
    crossed,
    gapAt,
    HARP,
    nearestString,
    stringCorners,
    stringEnds,
    stringX,
} from "./harpLayout.js";
import { itemPoint } from "./roomLayout.js";

describe("the harp's layout", () => {
    it("runs every string up from the soundboard to the neck, longest at the left", () => {
        let last = Infinity;
        for (let n = 0; n < HARP.strings.count; n += 1) {
            const { bottom, top } = stringEnds(n);
            expect(top - bottom).toBeGreaterThan(20);
            expect(top - bottom).toBeLessThan(last);
            expect(top).toBeLessThan(HARP.column.top);
            last = top - bottom;
        }
        expect(stringX(0)).toBeGreaterThan(HARP.column.x);
        expect(stringX(HARP.strings.count - 1)).toBe(HARP.strings.to);
    });

    it("poses its strings' corners where it stands", () => {
        const item = { x: 430, z: 30 };
        const corners = stringCorners(item);
        expect(corners).toHaveLength(4);
        for (const c of corners) {
            expect(Math.abs(c.x - 430)).toBeLessThan(120);
        }
        expect(itemPoint(item, [0, 0, 0]).x).toBe(430);
    });

    it("counts the gap a pointer is in, either way along", () => {
        const xs = [10, 20, 30, 40];
        expect(gapAt(xs, 5)).toBe(0);
        expect(gapAt(xs, 25)).toBe(2);
        expect(gapAt(xs, 45)).toBe(4);
        // Seen from behind, the deepest string is on the right.
        expect(gapAt([...xs].reverse(), 35)).toBe(1);
    });

    it("plucks every string a strum crosses, in the order it crosses them", () => {
        expect(crossed(1, 4)).toEqual([1, 2, 3]);
        expect(crossed(4, 1)).toEqual([3, 2, 1]);
        expect(crossed(2, 2)).toEqual([]);
    });

    it("finds the string nearest a tap", () => {
        expect(nearestString([10, 20, 30], 22)).toBe(1);
        expect(nearestString([10, 20, 30], -50)).toBe(0);
        expect(nearestString([10, 20, 30], 99)).toBe(2);
    });
});
