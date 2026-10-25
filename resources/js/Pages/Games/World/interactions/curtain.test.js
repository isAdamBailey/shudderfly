import { describe, expect, it, vi } from "vitest";
import { hiddenByCurtain } from "./curtain.js";
import { activate, autoTriggers, noteOf } from "./index.js";

const curtain = { id: "curtain", type: "curtain", x: 450, y: 30, z: 180 };

describe("curtain interaction", () => {
    it("draws the curtain, with a whoosh", () => {
        const ctx = { drawCurtain: vi.fn(), playSound: vi.fn() };

        activate(curtain, ctx);

        expect(ctx.drawCurtain).toHaveBeenCalledExactlyOnceWith("curtain");
        expect(ctx.playSound).toHaveBeenCalledExactlyOnceWith("whoosh");
    });

    it("needs a tap or Enter, and isn't told to the room", () => {
        expect(autoTriggers(curtain)).toBe(false);
        expect(noteOf(curtain)).toBeNull();
    });

    it("hides only what stands behind the curtain that's shut", () => {
        const shut = new Set(["curtain"]);

        expect(hiddenByCurtain({ id: "organ", curtain: "curtain" }, shut)).toBe(
            true
        );
        expect(hiddenByCurtain({ id: "harp", curtain: "other" }, shut)).toBe(
            false
        );
        expect(hiddenByCurtain(curtain, shut)).toBe(false);
    });
});
