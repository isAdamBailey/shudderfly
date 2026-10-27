import { describe, expect, it, vi } from "vitest";
import { activate, autoTriggers, noteOf, playedFrom } from "./index.js";

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
        expect(ctx.toot).toHaveBeenCalledWith("butt", "doorbell", undefined);
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

    it("toots a recording in place of the fart", () => {
        const ctx = fakeCtx();

        activate(
            {
                id: "guster",
                type: "toy",
                move: "bounce",
                toot: "guster",
                clip: "https://x/hello.m4a",
            },
            ctx
        );

        expect(ctx.toot).toHaveBeenCalledWith(
            "guster",
            "guster",
            "https://x/hello.m4a"
        );
        expect(ctx.animate).toHaveBeenCalledWith("guster", "bounce");
        expect(ctx.speak).not.toHaveBeenCalled();
    });

    it("needs a tap, where a door goes off when walked up to", () => {
        expect(autoTriggers({ type: "toy" })).toBe(false);
        expect(autoTriggers({ type: "door" })).toBe(true);
        expect(autoTriggers({ type: "game" })).toBe(false);
        expect(autoTriggers({ type: "constructor" })).toBe(false);
    });

    it("tells the room it was played only when it's shared", () => {
        const button = {
            id: "sound-1",
            type: "toy",
            move: "wiggle",
            toot: "guster",
            clip: "https://cdn.test/honk.m4a",
            line: "Honk!",
            light: "lamp",
            shared: true,
        };

        expect(noteOf(button)).toEqual([]);
        expect(noteOf({ ...button, shared: undefined })).toBeNull();
        expect(playedFrom({ ...button, shared: undefined }, [])).toBeNull();
        expect(playedFrom(button, [1])).toBeNull();

        // Played back, it moves and toots, but says and switches nothing.
        const ctx = fakeCtx();
        activate(playedFrom(button, []), ctx);
        expect(ctx.animate).toHaveBeenCalledWith("sound-1", "wiggle");
        expect(ctx.toot).toHaveBeenCalledWith(
            "guster",
            "sound-1",
            "https://cdn.test/honk.m4a"
        );
        expect(ctx.speak).not.toHaveBeenCalled();
        expect(ctx.toggleLight).not.toHaveBeenCalled();
    });
});
