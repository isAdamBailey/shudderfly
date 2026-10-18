import { describe, expect, it, vi } from "vitest";
import { HARP } from "../scenes/harpLayout.js";
import { activate, autoTriggers } from "./index.js";

const harp = { id: "harp", type: "harp", x: 430, z: 30 };

function fakeCtx() {
    return { pluckString: vi.fn(), playHarp: vi.fn(), openCard: vi.fn() };
}

describe("harp interaction", () => {
    it("plucks the strings a strum crossed, in its order, at once", () => {
        const ctx = fakeCtx();

        activate({ ...harp, strings: [6, 5, 4] }, ctx);

        expect(ctx.playHarp.mock.calls).toEqual([
            [6, 0],
            [5, 0],
            [4, 0],
        ]);
        expect(ctx.pluckString.mock.calls).toEqual([
            ["harp", 6, 0],
            ["harp", 5, 0],
            ["harp", 4, 0],
        ]);
        expect(ctx.openCard).not.toHaveBeenCalled();
    });

    it("runs up every string, one after another, when used as a whole", () => {
        const ctx = fakeCtx();

        activate(harp, ctx);

        const calls = ctx.playHarp.mock.calls;
        expect(calls.map(([n]) => n)).toEqual(
            Array.from({ length: HARP.strings.count }, (_, n) => n)
        );
        const delays = calls.map(([, delay]) => delay);
        expect(delays[0]).toBe(0);
        for (let i = 1; i < delays.length; i += 1) {
            expect(delays[i]).toBeGreaterThan(delays[i - 1]);
        }
        expect(ctx.pluckString).toHaveBeenCalledTimes(HARP.strings.count);
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(harp)).toBe(false);
    });
});
