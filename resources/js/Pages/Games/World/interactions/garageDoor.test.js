import { describe, expect, it, vi } from "vitest";
import { activate, autoTriggers } from "./index.js";

const opening = {
    id: "garage-opening",
    type: "garage_door",
    to: "road",
    toSpot: "house-garage",
    line: "The door's shut!",
};

const ctxWith = (open) => ({
    garageOpen: vi.fn(() => open),
    goToScene: vi.fn(),
    bump: vi.fn(),
    speak: vi.fn(),
});

describe("the way through the Garage's door", () => {
    it("goes through when walked up to, as a door does", () => {
        expect(autoTriggers(opening)).toBe(true);
    });

    it("goes through to its spot while the door's all the way up", () => {
        const ctx = ctxWith(true);
        activate(opening, ctx);
        expect(ctx.goToScene).toHaveBeenCalledWith("road", {
            spot: "house-garage",
            from: "garage-opening",
        });
        expect(ctx.bump).not.toHaveBeenCalled();
        expect(ctx.speak).not.toHaveBeenCalled();
    });

    it("bumps into it and says so when it isn't", () => {
        const ctx = ctxWith(false);
        activate(opening, ctx);
        expect(ctx.goToScene).not.toHaveBeenCalled();
        expect(ctx.bump).toHaveBeenCalled();
        expect(ctx.speak).toHaveBeenCalledWith("The door's shut!");
    });
});
