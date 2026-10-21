import { describe, expect, it, vi } from "vitest";
import { ORGAN } from "../scenes/organLayout.js";
import { activate, autoTriggers, noteOf, playedFrom } from "./index.js";

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

    it("tells the room a key, or the chord, and plays it back", () => {
        const key = { ...organ, zone: 2, key: 5 };
        expect(noteOf(key)).toEqual([2, 5]);
        expect(noteOf(organ)).toEqual([]);
        expect(playedFrom(organ, [2, 5])).toEqual(key);
        expect(playedFrom(organ, [])).toEqual(organ);
    });

    it("plays back no key that isn't on the keyboard", () => {
        for (const which of [
            [ORGAN.zones, 0],
            [0, ORGAN.whiteKeys],
            [-1, 0],
            [0.5, 0],
            [0],
            [0, 0, 0],
            "0",
        ]) {
            expect(playedFrom(organ, which)).toBeNull();
        }
    });
});
