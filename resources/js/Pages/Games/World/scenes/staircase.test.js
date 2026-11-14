import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { STAIRS, STAIRS_REACH } from "./roomLayout.js";
import {
    ARROW_PX,
    climbPose,
    floorGeometry,
    spiralPoint,
    stairsBounds,
    stairsButton,
    stairsFootprint,
    stairsGeometry,
    stairsMiddle,
    stairsWell,
} from "./staircase.js";

const left = {
    id: "downstairs",
    type: "door",
    wall: "left",
    x: 0,
    z: 220,
    stairs: "down",
};
const right = {
    id: "upstairs",
    type: "door",
    wall: "right",
    x: 900,
    z: 220,
    stairs: "up",
};

/** The geometry's extent: { min, max } Vector3s. */
function extent(geometry) {
    geometry.computeBoundingBox();
    return geometry.boundingBox;
}

describe("stairsMiddle", () => {
    it("stands the pole out from its wall, the spiral just clear of it", () => {
        expect(stairsMiddle(left)).toEqual({
            x: STAIRS.gap + STAIRS.radius,
            z: 220,
        });
        expect(stairsMiddle(right)).toEqual({
            x: 900 - STAIRS.gap - STAIRS.radius,
            z: 220,
        });
        expect(stairsFootprint(right).x1).toBeLessThanOrEqual(900);
        // The treads reach STAIRS_REACH in, the path round them less.
        const furthest = [0, 0.25, 0.5, 0.75].map(
            (t) => 900 - spiralPoint(right, t, 450).x
        );
        expect(Math.max(...furthest)).toBeLessThan(STAIRS_REACH);
    });
});

describe("spiralPoint", () => {
    it("starts on the room side, heads toward the back, and winds one turn", () => {
        for (const item of [left, right]) {
            const middle = stairsMiddle(item);
            const foot = spiralPoint(item, 0, 450);
            const inward = item.wall === "left" ? 1 : -1;
            expect(Math.sign(foot.x - middle.x)).toBe(inward);
            expect(foot.z).toBeCloseTo(middle.z);
            expect(foot.lift).toBeCloseTo(0);
            // A little round, it's nearer the back wall.
            expect(spiralPoint(item, 0.1, 450).z).toBeLessThan(middle.z);
            const end = spiralPoint(item, 1, 450);
            expect(end.x).toBeCloseTo(foot.x);
            expect(end.z).toBeCloseTo(foot.z);
        }
    });

    it("climbs up under the top of the walls, or down below the floor", () => {
        const top = spiralPoint(right, 1, 450).lift;
        expect(top).toBeGreaterThan(450 * 0.8);
        expect(top).toBeLessThan(450);
        expect(spiralPoint(left, 1, 450).lift).toBeLessThan(-150);
    });
});

describe("climbPose", () => {
    const from = { x: 700, z: 300 };

    it("walks from where the Butt stands onto the foot of the spiral", () => {
        expect(climbPose(right, from, 0, 450)).toEqual({
            ...from,
            lift: 0,
            opacity: 1,
        });
        const foot = spiralPoint(right, 0, 450);
        const on = climbPose(right, from, 0.2, 450);
        expect(on.x).toBeCloseTo(foot.x);
        expect(on.z).toBeCloseTo(foot.z);
        expect(on.lift).toBeCloseTo(0);
    });

    it("winds round, fading out before it's gone up or down out of sight", () => {
        const halfway = climbPose(right, from, 0.6, 450);
        expect(halfway.lift).toBeGreaterThan(0);
        expect(halfway.opacity).toBe(1);
        for (const item of [left, right]) {
            const gone = climbPose(item, from, 1, 450);
            expect(gone.opacity).toBe(0);
            expect(Math.abs(gone.lift)).toBeGreaterThan(150);
        }
        // Still on the way, fading.
        const fading = climbPose(right, from, 0.8, 450).opacity;
        expect(fading).toBeGreaterThan(0);
        expect(fading).toBeLessThan(1);
    });
});

describe("stairsGeometry", () => {
    it("climbs from the floor to the opening at the top of the walls", () => {
        const { min, max } = extent(stairsGeometry(THREE, right, 450));
        expect(min.y).toBeCloseTo(0);
        // The handrail's last stretch meets the opening's collar.
        expect(max.y).toBeGreaterThanOrEqual(450);
        expect(max.y).toBeLessThan(455);
        const { x0, x1, z0, z1 } = stairsFootprint(right);
        expect(min.x).toBeCloseTo(x0);
        expect(max.x).toBeCloseTo(x1);
        expect(max.x).toBeLessThanOrEqual(900);
        expect(min.z).toBeCloseTo(z0);
        expect(max.z).toBeCloseTo(z1);
    });

    it("goes down below the floor, going down, inside its well", () => {
        const { min, max } = extent(stairsGeometry(THREE, left, 450));
        expect(min.y).toBeLessThan(-150);
        const { x0, x1, z0, z1 } = stairsFootprint(left);
        expect(min.x).toBeGreaterThanOrEqual(Math.max(0, x0));
        expect(max.x).toBeLessThanOrEqual(x1);
        expect(min.z).toBeGreaterThanOrEqual(z0);
        expect(max.z).toBeLessThanOrEqual(z1);
    });

    it("leaves the rail open where the treads start, on the room side", () => {
        const geometry = stairsGeometry(THREE, left, 450);
        const position = geometry.attributes.position;
        const foot = spiralPoint(left, 0, 450);
        const well = stairsWell(left);
        // Nothing at rail height between the foot and the rim beyond it.
        for (let i = 0; i < position.count; i += 1) {
            const y = position.getY(i);
            if (y < 20 || y > 80) continue;
            const x = position.getX(i);
            const z = position.getZ(i);
            const outward = x - well.x;
            const nearFoot = Math.abs(z - foot.z) < 15 && outward > 20;
            expect(nearFoot).toBe(false);
        }
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

    it("keeps the whole floor's texture across it with a round well cut out", () => {
        const well = stairsWell(left);
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
            const inside = Math.hypot(x - well.x, z - well.z) < well.r - 0.01;
            expect(inside).toBe(false);
        }
    });
});

describe("stairsBounds", () => {
    it("reaches up to the opening going up, and to the rail going down", () => {
        const up = stairsBounds(right, 450);
        expect(up).toMatchObject(stairsFootprint(right));
        expect(up.y0).toBe(0);
        expect(up.y1).toBe(450);

        const down = stairsBounds(left, 450);
        expect(down).toMatchObject({ ...stairsFootprint(left), y0: 0 });
        expect(down.y1).toBeGreaterThan(0);
        expect(down.y1).toBeLessThan(up.y1);
    });
});

describe("stairsButton", () => {
    const stage = { w: 400, h: 800 };

    it("covers the part of the stairs on the stage", () => {
        expect(
            stairsButton(
                { left: 300, top: 100, width: 300, height: 400 },
                stage
            )
        ).toEqual({ x: 350, y: 500, width: 100, height: 400, pinned: null });
    });

    it("pins its arrow to the edge the stairs are off, by their foot", () => {
        const right = stairsButton(
            { left: 520, top: 100, width: 300, height: 400 },
            stage
        );
        expect(right).toMatchObject({
            pinned: "right",
            width: ARROW_PX,
            height: ARROW_PX,
        });
        // All of it on the stage, a little above the stairs' foot (500).
        expect(right.x + ARROW_PX / 2).toBeLessThan(400);
        expect(right.y).toBe(500 - ARROW_PX / 2);

        const left = stairsButton(
            { left: -340, top: 100, width: 300, height: 400 },
            stage
        );
        expect(left.pinned).toBe("left");
        expect(left.x - ARROW_PX / 2).toBeGreaterThan(0);
    });

    it("pins it with only a sliver of the stairs on the stage", () => {
        expect(
            stairsButton(
                { left: 380, top: 100, width: 300, height: 400 },
                stage
            ).pinned
        ).toBe("right");
    });

    it("pins it when the stairs are across the stage but off its bottom", () => {
        const pinned = stairsButton(
            { left: 50, top: 900, width: 100, height: 100 },
            stage
        );
        expect(pinned.pinned).toBe("left");
        expect(pinned.y).toBeLessThanOrEqual(800);
    });

    it("keeps a pinned arrow on the stage when the stairs are above it", () => {
        const pinned = stairsButton(
            { left: 520, top: -600, width: 300, height: 400 },
            stage
        );
        expect(pinned.y - ARROW_PX).toBeGreaterThan(0);
    });
});
