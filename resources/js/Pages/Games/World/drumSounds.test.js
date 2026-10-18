import { describe, expect, it } from "vitest";
import { drumBoom } from "./drumSounds.js";

describe("the bass drum's sound", () => {
    it("booms deep and long in the middle, higher and shorter at the rim", () => {
        const middle = drumBoom(0);
        const rim = drumBoom(1);
        expect(middle.to).toBeLessThan(60);
        expect(middle.from).toBeGreaterThan(middle.to);
        expect(rim.to).toBeGreaterThan(middle.to);
        expect(rim.ring).toBeLessThan(middle.ring);
    });
});
