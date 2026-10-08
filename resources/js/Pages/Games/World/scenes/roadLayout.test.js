import { describe, expect, it } from "vitest";
import { worldToScreen } from "../composables/projection.js";
import { RIDGE_DEPTH, ROWS, roadCamera, roadLayout } from "./roadLayout.js";

const stage = { w: 1000, h: 700, vmin: 700 };

describe("roadLayout", () => {
    const L = roadLayout(stage);
    const camera = roadCamera(L, 0);
    const row = (z) => worldToScreen(camera, { x: 500, z }).y / stage.h;

    it("draws the Butt's plane at 1 px per world unit", () => {
        expect(L.z.butt).toBe(0);
        expect(L.scaleAt(0)).toBe(1);
    });

    it("keeps the flat road's rows", () => {
        expect(row(L.z.horizon)).toBeCloseTo(ROWS.horizon, 6);
        expect(row(L.z.landmark)).toBeCloseTo(ROWS.landmark, 6);
        L.z.idlers.forEach((z, i) =>
            expect(row(z)).toBeCloseTo(ROWS.idlers[i], 6)
        );
        expect(row(0)).toBeCloseTo(ROWS.butt, 6);
        expect(row(L.z.roadNear)).toBeCloseTo(ROWS.roadNear, 6);
    });

    it("keeps the flat road's on-screen sizes", () => {
        // clamp(5rem, 20vmin, 9rem), clamp(2rem, 7vmin, 3.25rem) and
        // clamp(3.25rem, 13vmin, 5.5rem) at a 700px vmin.
        expect(L.sizes.landmark * L.scaleAt(L.z.landmark)).toBeCloseTo(140);
        L.z.idlers.forEach((z, i) =>
            expect(L.sizes.idlers[i] * L.scaleAt(z)).toBeCloseTo(49)
        );
        expect(L.sizes.butt).toBeCloseTo(88);
    });

    it("puts the road where the flat road's camera did", () => {
        const at = roadCamera(L, 1200);
        expect(worldToScreen(at, { x: 1300, z: 0 }).x).toBeCloseTo(100);
    });

    it("scrolls the ridge at a quarter of the road's speed", () => {
        expect(L.scaleAt(L.z.ridge)).toBeCloseTo(1 / RIDGE_DEPTH);
    });

    it("peeks the distance without moving the Butt's plane", () => {
        const peeked = roadCamera(L, 300, 1, -1);
        const plain = roadCamera(L, 300);
        const near = { x: 700, y: 30, z: 0 };
        const far = { x: 700, y: 30, z: L.z.ridge };

        expect(worldToScreen(peeked, near).x).toBeCloseTo(
            worldToScreen(plain, near).x
        );
        expect(worldToScreen(peeked, near).y).toBeCloseTo(
            worldToScreen(plain, near).y
        );
        expect(worldToScreen(peeked, far).x).toBeGreaterThan(
            worldToScreen(plain, far).x
        );
    });
});
