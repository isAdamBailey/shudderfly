import { describe, expect, it, vi } from "vitest";
import { activate } from "./index.js";

describe("door interaction", () => {
    it("goes through to the scene it leads to, at its spot", () => {
        const ctx = { goToScene: vi.fn(), openCard: vi.fn() };

        activate(
            {
                id: "house",
                type: "door",
                x: 1050,
                to: "house.hall",
                toSpot: "front-door",
            },
            ctx
        );

        expect(ctx.goToScene).toHaveBeenCalledWith("house.hall", {
            spot: "front-door",
            from: "house",
        });
        expect(ctx.openCard).not.toHaveBeenCalled();
    });
});
