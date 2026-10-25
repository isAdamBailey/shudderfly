import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "./RoomScene.js";
import {
    blockedFloor,
    INSTRUMENT_FOOTPRINTS,
    isInstrument,
} from "./instruments.js";

describe("the instruments", () => {
    it("draws a model for every instrument with a footprint, and no more", () => {
        expect(Object.keys(INSTRUMENTS).sort()).toEqual(
            Object.keys(INSTRUMENT_FOOTPRINTS).sort()
        );
    });

    it("knows an instrument by its type", () => {
        expect(isInstrument({ type: "harp" })).toBe(true);
        expect(isInstrument({ type: "toy" })).toBe(false);
        expect(isInstrument({ type: "constructor" })).toBe(false);
    });

    it("stands each on the floor off its wall", () => {
        for (const f of Object.values(INSTRUMENT_FOOTPRINTS)) {
            expect(f.x0).toBeLessThan(0);
            expect(f.x1).toBeGreaterThan(0);
            expect(f.z0).toBe(0);
            expect(f.z1).toBeGreaterThan(0);
        }
    });

    it("keeps the Butt off each instrument's floor and a stage's", () => {
        const harp = { id: "harp", type: "harp", x: 180, z: 30 };
        const toy = { id: "toy", type: "toy", x: 400, z: 0 };
        expect(blockedFloor({ interactables: [harp, toy] })).toEqual([
            { item: harp, ...INSTRUMENT_FOOTPRINTS.harp },
        ]);

        const floors = blockedFloor({
            interactables: [harp],
            stage: { w: 900, h: 30, d: 180 },
        });
        expect(floors).toHaveLength(2);
        // The whole back wall's length, out to the stage's edge, which the
        // Butt comes up close to.
        const stage = floors[1];
        expect(stage.item).toEqual({ x: 450, z: 0 });
        expect([stage.x0, stage.x1, stage.z0, stage.z1]).toEqual([
            -450, 450, 0, 180,
        ]);
        expect(stage.clearance).toBeLessThan(50);
    });
});
