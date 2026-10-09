import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { STAIRS } from "./roomLayout.js";
import { floorGeometry, stairsFootprint, stairsGeometry } from "./staircase.js";

const left = { id: "downstairs", type: "door", wall: "left", x: 0, z: 220 };
const right = { id: "upstairs", type: "door", wall: "right", x: 900, z: 220 };

/** The geometry's extent: { min, max } Vector3s. */
function extent(geometry) {
    geometry.computeBoundingBox();
    return geometry.boundingBox;
}

describe("stairsFootprint", () => {
    it("lies along its wall, reaching into the room", () => {
        expect(stairsFootprint(left)).toEqual({
            x0: 0,
            x1: STAIRS.width,
            z0: 220 - STAIRS.run / 2,
            z1: 220 + STAIRS.run / 2,
        });
        expect(stairsFootprint(right)).toMatchObject({
            x0: 900 - STAIRS.width,
            x1: 900,
        });
    });
});

describe("stairsGeometry", () => {
    it("climbs from the floor to under the ceiling, going up", () => {
        const { min, max } = extent(
            stairsGeometry(THREE, { ...right, stairs: "up" }, 450)
        );
        expect(min.y).toBe(0);
        expect(max.y).toBeGreaterThan(450 * 0.8);
        expect(max.y).toBeLessThan(450 + 100);
        expect(min.x).toBeGreaterThanOrEqual(900 - STAIRS.width);
    });

    it("goes down below the floor, going down, inside its well", () => {
        const { min, max } = extent(
            stairsGeometry(THREE, { ...left, stairs: "down" }, 450)
        );
        expect(min.y).toBeLessThan(0);
        expect(min.x).toBe(0);
        expect(max.x).toBe(STAIRS.width);
        expect(min.z).toBe(220 - STAIRS.run / 2);
        expect(max.z).toBe(220 + STAIRS.run / 2);
    });
});

describe("floorGeometry", () => {
    it("is a plain plane with no wells", () => {
        const { min, max } = extent(floorGeometry(THREE, 900, 450));
        const got = [min.x, min.y, min.z, max.x, max.y, max.z];
        [0, 0, 0, 900, 0, 450].forEach((want, i) =>
            expect(got[i]).toBeCloseTo(want)
        );
    });

    it("keeps the whole floor's texture across it with a well cut out", () => {
        const well = stairsFootprint(left);
        const geometry = floorGeometry(THREE, 900, 450, [well]);
        const { min, max } = extent(geometry);
        const got = [min.x, max.x, min.z, max.z];
        [0, 900, 0, 450].forEach((want, i) => expect(got[i]).toBeCloseTo(want));

        const position = geometry.attributes.position;
        const uv = geometry.attributes.uv;
        for (let i = 0; i < position.count; i += 1) {
            const x = position.getX(i);
            const z = position.getZ(i);
            // As a PlaneGeometry: u across, v from the front (0) to the back (1).
            expect(uv.getX(i)).toBeCloseTo(x / 900);
            expect(uv.getY(i)).toBeCloseTo(1 - z / 450);
            // No vertex inside the well.
            const inside =
                x > well.x0 && x < well.x1 && z > well.z0 && z < well.z1;
            expect(inside).toBe(false);
        }
    });
});
