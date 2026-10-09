import { describe, expect, it, vi } from "vitest";
import GameConfirmCard from "../components/GameConfirmCard.vue";
import GameHost from "../components/GameHost.vue";
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

    it("plays a hosted game over the world instead of leaving for its page", () => {
        const ctx = { openCard: vi.fn() };
        const cockroach = {
            ...boom,
            id: "cockroach",
            game: "cockroach",
            card: { ...boom.card, slug: "cockroach", name: "Cockroach Fart" },
        };

        activate(cockroach, ctx);

        const props = ctx.openCard.mock.calls[0][1];
        expect(ctx.openCard).toHaveBeenCalledWith(
            GameConfirmCard,
            expect.objectContaining({
                game: cockroach.card,
                start: expect.any(Function),
            })
        );
        props.start();
        expect(ctx.openCard).toHaveBeenLastCalledWith(GameHost, {
            game: cockroach.card,
        });
    });

    it("does nothing for an unknown type", () => {
        const ctx = { openCard: vi.fn() };

        activate({ ...boom, type: "teleporter" }, ctx);
        activate({ ...boom, type: "constructor" }, ctx);

        expect(ctx.openCard).not.toHaveBeenCalled();
    });
});
