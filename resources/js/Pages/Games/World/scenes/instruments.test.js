import { describe, expect, it } from "vitest";
import { INSTRUMENTS } from "./RoomScene.js";
import { INSTRUMENT_FOOTPRINTS, isInstrument } from "./instruments.js";

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
});
