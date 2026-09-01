import { useSiteSetting } from "@/composables/useSiteSetting";
import { describe, expect, it, vi } from "vitest";

let mockSettings = {};
vi.mock("@inertiajs/vue3", () => ({
    usePage: () => ({ props: { settings: mockSettings } }),
}));

describe("useSiteSetting", () => {
    it.each([
        ["1", true],
        [1, true],
        [true, true],
        ["0", false],
        [0, false],
        [false, false],
        [undefined, false],
    ])("treats setting value %j as %s", (value, expected) => {
        mockSettings = { some_flag: value };

        expect(useSiteSetting("some_flag").value).toBe(expected);
    });

    it("is false when the key is missing entirely", () => {
        mockSettings = {};

        expect(useSiteSetting("missing_flag").value).toBe(false);
    });
});
