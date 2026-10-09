import { describe, expect, it, vi } from "vitest";
import { activate, autoTriggers } from "./index.js";

const songs = [{ id: 7, title: "Toot Toot Song", youtube_video_id: "abc" }];
const radio = { id: "radio", type: "radio", x: 820, z: 0, line: "Static!" };

function fakeCtx() {
    return {
        tuneRadio: vi.fn(),
        openCard: vi.fn(),
        animate: vi.fn(),
        toot: vi.fn(),
        speak: vi.fn(),
    };
}

describe("radio interaction", () => {
    it("tunes to its songs and wiggles, with no card", () => {
        const ctx = fakeCtx();

        activate({ ...radio, songs }, ctx);

        expect(ctx.tuneRadio).toHaveBeenCalledWith(songs);
        expect(ctx.animate).toHaveBeenCalledWith("radio", "wiggle");
        expect(ctx.openCard).not.toHaveBeenCalled();
        expect(ctx.speak).not.toHaveBeenCalled();
    });

    it("toots and says its line with nothing to play", () => {
        const ctx = fakeCtx();

        activate({ ...radio, songs: [] }, ctx);

        expect(ctx.tuneRadio).not.toHaveBeenCalled();
        expect(ctx.toot).toHaveBeenCalledWith("butt", "radio");
        expect(ctx.speak).toHaveBeenCalledWith("Static!");
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(radio)).toBe(false);
    });
});
