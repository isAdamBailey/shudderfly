import { describe, expect, it } from "vitest";
import { frequencyOf, organNote } from "./organSounds.js";

describe("the organ's notes", () => {
    it("runs A to G in A minor, an octave a zone", () => {
        expect(organNote(0, 0)).toBe(33);
        expect(organNote(1, 0)).toBe(45);
        expect(organNote(3, 6)).toBe(69 + 10);
        // The white keys only: C is three semitones above A.
        expect(organNote(2, 2) - organNote(2, 0)).toBe(3);
    });

    it("tunes A4 to 440 Hz", () => {
        expect(frequencyOf(69)).toBe(440);
        expect(frequencyOf(organNote(0, 0))).toBeCloseTo(55);
    });
});
