import { describe, expect, it, vi } from "vitest";
import GameConfirmCard from "../components/GameConfirmCard.vue";
import { activate } from "./index.js";

const boom = {
    id: "boom",
    type: "game",
    x: 4200,
    game: "boom",
    emoji: "🚽",
    label: "Poop Boom",
    card: {
        slug: "boom",
        name: "Poop Boom",
        emoji: "💩",
        description: "Blow it up",
        landmark: "🚽",
    },
};

describe("game interaction", () => {
    it("opens the confirm card for the game", () => {
        const ctx = { openCard: vi.fn() };

        activate(boom, ctx);

        expect(ctx.openCard).toHaveBeenCalledWith(GameConfirmCard, {
            game: boom.card,
        });
    });

    it("does nothing for an unknown type", () => {
        const ctx = { openCard: vi.fn() };

        activate({ ...boom, type: "teleporter" }, ctx);
        activate({ ...boom, type: "constructor" }, ctx);

        expect(ctx.openCard).not.toHaveBeenCalled();
    });
});
