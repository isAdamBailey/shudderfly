import { describe, expect, it, vi } from "vitest";
import GameConfirmCard from "../components/GameConfirmCard.vue";
import GameHost from "../components/GameHost.vue";
import { HOSTED_GAMES } from "../hostedGames.js";
import { activate } from "./index.js";

// The one game that still leaves for its page.
const sproutPox = {
    id: "sprout-pox",
    type: "game",
    x: 600,
    game: "sprout-pox",
    emoji: "🏥",
    label: "Sprout Pox",
    card: {
        slug: "sprout-pox",
        name: "Sprout Pox",
        emoji: "🥬",
        description: "Cure the sprouts",
        landmark: "🏥",
    },
};

describe("game interaction", () => {
    it("opens the confirm card for the game", () => {
        const ctx = { openCard: vi.fn() };

        activate(sproutPox, ctx);

        expect(ctx.openCard).toHaveBeenCalledWith(GameConfirmCard, {
            game: sproutPox.card,
        });
    });

    it.each(HOSTED_GAMES)(
        "plays %s over the world instead of leaving for its page",
        (slug) => {
            const ctx = { openCard: vi.fn() };
            const hosted = {
                ...sproutPox,
                id: slug,
                game: slug,
                card: { ...sproutPox.card, slug, name: slug },
            };

            activate(hosted, ctx);

            const props = ctx.openCard.mock.calls[0][1];
            expect(ctx.openCard).toHaveBeenCalledWith(
                GameConfirmCard,
                expect.objectContaining({
                    game: hosted.card,
                    start: expect.any(Function),
                })
            );
            props.start();
            expect(ctx.openCard).toHaveBeenLastCalledWith(GameHost, {
                game: hosted.card,
            });
        }
    );

    it("does nothing for an unknown type", () => {
        const ctx = { openCard: vi.fn() };

        activate({ ...sproutPox, type: "teleporter" }, ctx);
        activate({ ...sproutPox, type: "constructor" }, ctx);

        expect(ctx.openCard).not.toHaveBeenCalled();
    });
});
