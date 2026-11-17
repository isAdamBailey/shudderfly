import { describe, expect, it } from "vitest";
import {
    carriageTurns,
    rollUpPose,
    sectionPoses,
    topEdge,
} from "./garageDoorLayout.js";

// A door 300 tall in four sections, each 75.
const door = { w: 560, h: 300, sections: 4 };

const rounded = (poses) =>
    poses.map(({ y, z, tilt }) => ({
        y: Math.round(y),
        z: Math.round(z),
        tilt: Number(tilt.toFixed(3)),
    }));

describe("a sectional garage door's sections", () => {
    it("stand stacked up the opening while it's shut", () => {
        expect(rounded(sectionPoses(door, 0))).toEqual([
            { y: 0, z: 0, tilt: 0 },
            { y: 75, z: 0, tilt: 0 },
            { y: 150, z: 0, tilt: 0 },
            { y: 225, z: 0, tilt: 0 },
        ]);
    });

    it("lie flat under the ceiling, out into the room, once it's open", () => {
        const flat = Number((Math.PI / 2).toFixed(3));
        expect(rounded(sectionPoses(door, 1))).toEqual([
            { y: 300, z: 0, tilt: flat },
            { y: 300, z: 75, tilt: flat },
            { y: 300, z: 150, tilt: flat },
            { y: 300, z: 225, tilt: flat },
        ]);
    });

    it("roll round the top of the opening halfway up", () => {
        const flat = Number((Math.PI / 2).toFixed(3));
        expect(rounded(sectionPoses(door, 0.5))).toEqual([
            { y: 150, z: 0, tilt: 0 },
            { y: 225, z: 0, tilt: 0 },
            { y: 300, z: 0, tilt: flat },
            { y: 300, z: 75, tilt: flat },
        ]);
    });

    it("tip a section across the bend while it rounds it", () => {
        // 30 up: the top section runs from 255 up the opening to 30 out
        // along the ceiling track.
        const top = sectionPoses(door, 0.1)[3];
        expect(top.y).toBeCloseTo(255);
        expect(top.z).toBeCloseTo(0);
        expect(top.tilt).toBeCloseTo(Math.atan2(30, 45));
    });

    it("carry their top edge from the top of the opening out to as deep as the door is tall", () => {
        expect(topEdge(door, 0)).toEqual({ y: 300, z: 0 });
        expect(topEdge(door, 0.5)).toEqual({ y: 300, z: 150 });
        expect(topEdge(door, 1)).toEqual({ y: 300, z: 300 });
    });
});

describe("a roll-up garage door's curtain", () => {
    it("hangs in whole slats from the floor to the top of the opening while it's shut", () => {
        const { bottom, slats } = rollUpPose(door, 0);
        expect(bottom).toBe(0);
        expect(slats).toHaveLength(20);
        expect(slats[0]).toEqual({ y: 0, tall: 15 });
        expect(slats[19]).toEqual({ y: 285, tall: 15 });
    });

    it("rises with its bottom edge, the slat going into the coil cut off at the top", () => {
        // 156 up: whole slats from 156 to 291, and 9 of the last one.
        const { bottom, slats } = rollUpPose(door, 0.52);
        expect(bottom).toBeCloseTo(156);
        expect(slats).toHaveLength(10);
        expect(slats[9].y).toBeCloseTo(291);
        expect(slats[9].tall).toBeCloseTo(9);
    });

    it("is all wound up, nothing hanging, once it's open", () => {
        expect(rollUpPose(door, 1).slats).toEqual([]);
    });

    it("fattens its coil from the bare drum as it winds up", () => {
        expect(rollUpPose(door, 0).coil).toBe(8);
        // All 300 of a curtain 2 thick wound on: π(R² - 8²) = 600.
        expect(rollUpPose(door, 1).coil).toBeCloseTo(
            Math.sqrt(64 + 600 / Math.PI)
        );
    });
});

describe("a pair of carriage doors", () => {
    it("stand flat in the opening while they're shut", () => {
        expect(carriageTurns(0).map(Math.abs)).toEqual([0, 0]);
    });

    it("turn opposite ways, a quarter turn each once open", () => {
        const [left, right] = carriageTurns(1);
        expect(left).toBeCloseTo(Math.PI / 2);
        expect(right).toBeCloseTo(-Math.PI / 2);
        expect(carriageTurns(0.5)[0]).toBeCloseTo(Math.PI / 4);
    });
});
