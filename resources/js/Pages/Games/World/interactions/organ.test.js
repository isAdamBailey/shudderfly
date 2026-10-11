import { describe, expect, it, vi } from "vitest";
import { activate, autoTriggers } from "./index.js";

const organ = { id: "organ", type: "organ", wall: "left", x: 0, z: 200 };

function fakeCtx() {
    return { pressKey: vi.fn(), playOrgan: vi.fn(), openCard: vi.fn() };
}

describe("organ interaction", () => {
    it("plays the key pressed in a zone, and presses it down", () => {
        const ctx = fakeCtx();

        activate({ ...organ, zone: 3, key: 5 }, ctx);

        expect(ctx.playOrgan).toHaveBeenCalledExactlyOnceWith(3, 5);
        expect(ctx.pressKey).toHaveBeenCalledExactlyOnceWith("organ", 3, 5);
        expect(ctx.openCard).not.toHaveBeenCalled();
    });

    it("plays a chord when used as a whole", () => {
        const ctx = fakeCtx();

        activate(organ, ctx);

        expect(ctx.playOrgan.mock.calls).toEqual([
            [1, 0],
            [1, 2],
            [1, 4],
        ]);
        expect(ctx.pressKey).toHaveBeenCalledTimes(3);
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(organ)).toBe(false);
    });
});
