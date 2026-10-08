import { describe, expect, it } from "vitest";
import { worldToScreen } from "../composables/projection.js";
import {
    buildingBox,
    RIDGE_DEPTH,
    ROWS,
    roadCamera,
    roadLayout,
} from "./roadLayout.js";

const stage = { w: 1000, h: 700, vmin: 700 };

describe("roadLayout", () => {
    const L = roadLayout(stage);
    const camera = roadCamera(L, 0);
    const row = (z) => worldToScreen(camera, { x: 500, z }).y / stage.h;

    it("draws the Butt's far lane at 1 px per world unit", () => {
        expect(L.z.far).toBe(0);
        expect(L.laneZ(0)).toBe(0);
        expect(L.scaleAt(0)).toBe(1);
    });

    it("puts everything on its row of the stage", () => {
        for (const name of [
            "horizon",
            "mid",
            "buildings",
            "far",
            "roadFar",
            "roadNear",
            "near",
            "nearBuildings",
        ]) {
            expect(row(L.z[name])).toBeCloseTo(ROWS[name], 6);
        }
        L.z.idlers.forEach((z, i) =>
            expect(row(z)).toBeCloseTo(ROWS.idlers[i], 6)
        );
    });

    it("orders the street from the ridge to the near side", () => {
        const { z } = L;
        const depths = [
            z.ridge,
            z.horizon,
            z.mid,
            z.buildings,
            ...z.idlers,
            z.far,
            z.roadFar,
            z.roadNear,
            z.near,
            z.nearBuildings,
        ];
        expect(depths).toEqual([...depths].sort((a, b) => a - b));
        expect(L.laneZ(1)).toBe(z.near);
    });

    it("tells the sides of the street apart halfway across the road", () => {
        expect(L.sideAt(L.z.far)).toBe("far");
        expect(L.sideAt(L.z.buildings)).toBe("far");
        expect(L.sideAt(L.z.near)).toBe("near");
        expect(L.sideAt(L.z.nearBuildings)).toBe("near");
    });

    it("keeps the flat road's on-screen sizes for the cast", () => {
        // clamp(2rem, 7vmin, 3.25rem) and clamp(3.25rem, 13vmin, 5.5rem) at
        // a 700px vmin.
        L.z.idlers.forEach((z, i) =>
            expect(L.sizes.idlers[i] * L.scaleAt(z)).toBeCloseTo(49)
        );
        expect(L.sizes.butt).toBeCloseTo(88);
    });

    it("fits the far side's buildings between the sky and the street", () => {
        for (const x of [600, 1500, 2400, 3300, 4200, 5100]) {
            const box = buildingBox(L, { x });
            const top = worldToScreen(camera, {
                x,
                y: box.height + box.roof,
                z: box.z,
            });
            expect(box.z).toBe(L.z.buildings);
            expect(top.y).toBeGreaterThan(0);
            // Wide enough to tap, even on a small phone.
            const small = roadLayout({ w: 390, h: 420, vmin: 390 });
            const tiny = buildingBox(small, { x });
            expect(tiny.width * small.scaleAt(tiny.z)).toBeGreaterThan(48);
        }
    });

    it("makes the near side's buildings smaller, facing the camera", () => {
        const far = buildingBox(L, { x: 900 });
        const near = buildingBox(L, { x: 900, side: "near" });
        expect(near.z).toBe(L.z.nearBuildings);
        expect(near.height).toBeLessThan(far.height);
    });

    it("puts the road where the flat road's camera did", () => {
        const at = roadCamera(L, 1200);
        expect(worldToScreen(at, { x: 1300, z: 0 }).x).toBeCloseTo(100);
    });

    it("keeps the Butt at the flat road's screen x on either lane", () => {
        for (const lane of [0, 0.5, 1]) {
            const z = L.laneZ(lane);
            const at = roadCamera(L, 0, 0, 0, { x: 260, z });
            expect(worldToScreen(at, { x: 260, z }).x).toBeCloseTo(260);
        }
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
