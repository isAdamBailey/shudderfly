import { describe, expect, it, vi } from "vitest";
import { GARAGE_DOORS } from "../composables/useGarageStyles.js";
import { DOOR_STYLES, paintReadout } from "./garageDoor.js";

describe("the Garage's door styles", () => {
    it("can build every door the swap button cycles through", () => {
        expect(Object.keys(DOOR_STYLES)).toEqual(GARAGE_DOORS);
    });
});

describe("the opener's readout", () => {
    function painted(count) {
        const ctx = {
            fillRect: vi.fn(),
            fillText: vi.fn(),
        };
        paintReadout(ctx, 160, 52, count);
        return ctx.fillText.mock.calls[0][0];
    }

    it("shows the count in at least four digits", () => {
        expect(painted(0)).toBe("0000");
        expect(painted(42)).toBe("0042");
        expect(painted(123456)).toBe("123456");
    });
});
