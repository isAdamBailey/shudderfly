import { describe, expect, it, vi } from "vitest";
import MinigameCard from "../components/MinigameCard.vue";
import { activate, autoTriggers } from "./index.js";

const catcher = {
    id: "toot-catch",
    type: "minigame",
    minigame: "toot-catch",
    x: 180,
    z: 160,
    emoji: "🧺",
    label: "Toot Catch",
    line: "Catch them!",
};

function fakeCtx() {
    return { openCard: vi.fn(), goToScene: vi.fn(), speak: vi.fn() };
}

describe("minigame interaction", () => {
    it("opens the minigame's card, staying in the world", () => {
        const ctx = fakeCtx();

        activate(catcher, ctx);

        expect(ctx.openCard).toHaveBeenCalledWith(MinigameCard, {
            item: catcher,
        });
        expect(ctx.goToScene).not.toHaveBeenCalled();
    });

    it("does nothing for a minigame this client doesn't know", () => {
        const ctx = fakeCtx();

        activate({ ...catcher, minigame: "nope" }, ctx);

        expect(ctx.openCard).not.toHaveBeenCalled();
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(catcher)).toBe(false);
    });
});
