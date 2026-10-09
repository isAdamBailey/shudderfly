import { describe, expect, it, vi } from "vitest";
import { activate, autoTriggers } from "./index.js";

const channels = [
    { id: 4, video: "https://cdn.test/a.mp4", poster: "", title: "Toots" },
];
const tv = { id: "tv", type: "tv", x: 270, z: 0, line: "Static!" };

function fakeCtx() {
    return {
        changeChannel: vi.fn(),
        openCard: vi.fn(),
        animate: vi.fn(),
        toot: vi.fn(),
        speak: vi.fn(),
    };
}

describe("tv interaction", () => {
    it("changes channel on its screen, with no card", () => {
        const ctx = fakeCtx();

        activate({ ...tv, channels }, ctx);

        expect(ctx.changeChannel).toHaveBeenCalledWith("tv");
        expect(ctx.openCard).not.toHaveBeenCalled();
        expect(ctx.speak).not.toHaveBeenCalled();
    });

    it("toots and says its line with nothing on", () => {
        const ctx = fakeCtx();

        activate({ ...tv, channels: [] }, ctx);

        expect(ctx.changeChannel).not.toHaveBeenCalled();
        expect(ctx.toot).toHaveBeenCalledWith("butt", "tv");
        expect(ctx.speak).toHaveBeenCalledWith("Static!");
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(tv)).toBe(false);
    });
});
