import { describe, expect, it } from "vitest";
import { jitter } from "@/utils/math";
import { roadScenery } from "./roadScenery.js";

const landmarks = [600, 1500, 2400, 3300, 4200, 5100].map((x, i) => ({
    slug: `game-${i}`,
    x,
    side: "far",
}));

describe("roadScenery", () => {
    const scenery = roadScenery({ landmarks, from: -2000, to: 7800 });

    it("is the same every visit", () => {
        expect(roadScenery({ landmarks, from: -2000, to: 7800 })).toEqual(
            scenery
        );
        expect(jitter(42)).toBe(jitter(42));
        expect(jitter(42)).toBeGreaterThanOrEqual(0);
        expect(jitter(42)).toBeLessThan(1);
    });

    it("puts the near side's tall things between the far side's landmarks", () => {
        const xs = scenery.near.map((item) => item.x);
        expect(xs).toEqual([150, 1050, 1950, 2850, 3750, 4650, 5550]);
        expect(new Set(scenery.near.map((item) => item.kind))).toEqual(
            new Set(["house", "potty", "billboard"])
        );
    });

    it("keeps them clear of a near-side landmark", () => {
        const sided = landmarks.map((lm) =>
            lm.x === 2400 ? { ...lm, side: "near" } : lm
        );
        const { near } = roadScenery({
            landmarks: sided,
            from: 0,
            to: 6000,
        });

        for (const item of near) {
            expect(Math.abs(item.x - 2400)).toBeGreaterThan(380);
        }
    });

    it("leaves gaps in the hedge for the near side's tall things", () => {
        for (const bit of scenery.hedge) {
            for (const item of scenery.near) {
                expect(Math.abs(bit.x - item.x)).toBeGreaterThanOrEqual(145);
            }
        }
        expect(scenery.hedge.length).toBeGreaterThan(20);
    });

    it("fills the mid-distance row end to end", () => {
        const xs = scenery.mid.map((item) => item.x);
        expect(xs[0]).toBe(-2000);
        expect(xs[xs.length - 1]).toBeGreaterThan(7600);
        expect(scenery.mid.some((item) => item.kind === "house")).toBe(true);
    });

    it("puts a manhole on the road every few landmarks", () => {
        expect(scenery.manholes).toEqual([880, 3580]);
    });
});
