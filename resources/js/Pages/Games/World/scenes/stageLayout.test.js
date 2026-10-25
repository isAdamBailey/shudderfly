import { describe, expect, it } from "vitest";
import { CURTAIN, chairSpots, curtainCorners } from "./stageLayout.js";

const curtain = {
    id: "curtain",
    type: "curtain",
    x: 450,
    y: 30,
    z: 180,
    w: 900,
};

describe("the auditorium", () => {
    it("takes a tap on the curtain's valance while it's open", () => {
        const corners = curtainCorners(curtain, 450, true);
        const ys = corners.map((p) => p.y);
        expect(Math.min(...ys)).toBe(450 - CURTAIN.valance);
        expect(Math.max(...ys)).toBe(450);
        const xs = corners.map((p) => p.x);
        expect(Math.min(...xs)).toBeCloseTo(0);
        expect(Math.max(...xs)).toBeCloseTo(900);
    });

    it("and on all of it drawn shut, from the stage up", () => {
        const ys = curtainCorners(curtain, 450, false).map((p) => p.y);
        expect(Math.min(...ys)).toBe(30);
        expect(Math.max(...ys)).toBe(450);
    });

    it("stands a chair every pitch along a row, half a pitch in", () => {
        expect(chairSpots([{ z: 300, from: 196, to: 428, pitch: 58 }])).toEqual(
            [225, 283, 341, 399].map((x) => ({ x, z: 300 }))
        );
    });
});
