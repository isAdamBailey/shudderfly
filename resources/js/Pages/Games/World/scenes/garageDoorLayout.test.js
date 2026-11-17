import { describe, expect, it } from "vitest";
import { sectionPoses } from "./garageDoorLayout.js";

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
});
