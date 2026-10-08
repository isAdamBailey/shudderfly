import { describe, expect, it } from "vitest";
import { own } from "./object.js";

describe("own", () => {
    it("finds a map's own keys and nothing it inherits", () => {
        const map = { tiles: 1 };

        expect(own(map, "tiles")).toBe(1);
        expect(own(map, "marble")).toBeUndefined();
        expect(own(map, "constructor")).toBeUndefined();
        expect(own(map, "toString")).toBeUndefined();
        expect(own(map, undefined)).toBeUndefined();
    });
});
