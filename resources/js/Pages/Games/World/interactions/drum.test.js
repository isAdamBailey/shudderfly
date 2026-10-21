import { describe, expect, it, vi } from "vitest";
import { activate, autoTriggers, noteOf, playedFrom } from "./index.js";

const drum = { id: "bass-drum", type: "drum", x: 420, z: 40 };

function fakeCtx() {
    return { hitDrum: vi.fn(), playDrum: vi.fn(), openCard: vi.fn() };
}

describe("drum interaction", () => {
    it("booms where its head was hit, and shows the hit", () => {
        const ctx = fakeCtx();

        activate({ ...drum, edge: 0.7 }, ctx);

        expect(ctx.playDrum).toHaveBeenCalledExactlyOnceWith(0.7);
        expect(ctx.hitDrum).toHaveBeenCalledExactlyOnceWith("bass-drum", 0.7);
        expect(ctx.openCard).not.toHaveBeenCalled();
    });

    it("hits the middle when used as a whole", () => {
        const ctx = fakeCtx();

        activate(drum, ctx);

        expect(ctx.playDrum).toHaveBeenCalledExactlyOnceWith(0);
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(drum)).toBe(false);
    });

    it("tells the room a hit's edge in hundredths, and plays it back", () => {
        expect(noteOf({ ...drum, edge: 0.4567 })).toEqual([46]);
        expect(noteOf(drum)).toEqual([0]);
        expect(playedFrom(drum, [25])).toEqual({ ...drum, edge: 0.25 });
    });

    it("plays back no hit off its head", () => {
        for (const which of [[], [101], [-1], [0.5], [0, 0]]) {
            expect(playedFrom(drum, which)).toBeNull();
        }
    });
});
