import { describe, expect, it } from "vitest";
import { harpNote } from "./harpSounds.js";

describe("the harp's notes", () => {
    it("runs up A minor's pentatonic scale from A2", () => {
        expect([0, 1, 2, 3, 4, 5].map(harpNote)).toEqual([
            45, 48, 50, 52, 55, 57,
        ]);
        // Only ever higher, string by string.
        for (let n = 1; n < 12; n += 1) {
            expect(harpNote(n)).toBeGreaterThan(harpNote(n - 1));
        }
    });
});
