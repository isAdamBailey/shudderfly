import { describe, expect, it, vi } from "vitest";
import { activate, autoTriggers } from "./index.js";

function fakeCtx() {
    return {
        animate: vi.fn(),
        toot: vi.fn(),
        playSound: vi.fn(),
        toggleLight: vi.fn(),
        speak: vi.fn(),
        goToScene: vi.fn(),
        openCard: vi.fn(),
    };
}

describe("toy interaction", () => {
    it("plays, toots and speaks as its data says, and goes nowhere", () => {
        const ctx = fakeCtx();

        activate(
            {
                id: "doorbell",
                type: "toy",
                emoji: "🔔",
                move: "wiggle",
                toot: "butt",
                line: "Ding dong!",
            },
            ctx
        );

        expect(ctx.animate).toHaveBeenCalledWith("doorbell", "wiggle");
        expect(ctx.toot).toHaveBeenCalledWith("butt", "doorbell");
        expect(ctx.speak).toHaveBeenCalledWith("Ding dong!");
        expect(ctx.playSound).not.toHaveBeenCalled();
        expect(ctx.toggleLight).not.toHaveBeenCalled();
        expect(ctx.goToScene).not.toHaveBeenCalled();
        expect(ctx.openCard).not.toHaveBeenCalled();
    });

    it("switches a light and makes a sound", () => {
        const ctx = fakeCtx();

        activate(
            { id: "switch", type: "toy", light: "lamp", sound: "hiss" },
            ctx
        );

        expect(ctx.toggleLight).toHaveBeenCalledWith("lamp");
        expect(ctx.playSound).toHaveBeenCalledWith("hiss");
        expect(ctx.animate).not.toHaveBeenCalled();
    });

    it("needs a tap, where a door goes off when walked up to", () => {
        expect(autoTriggers({ type: "toy" })).toBe(false);
        expect(autoTriggers({ type: "door" })).toBe(true);
        expect(autoTriggers({ type: "game" })).toBe(false);
        expect(autoTriggers({ type: "constructor" })).toBe(false);
    });
});
