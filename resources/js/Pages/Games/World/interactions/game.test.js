import { describe, expect, it, vi } from "vitest";
import GameConfirmCard from "../components/GameConfirmCard.vue";
import GameHost from "../components/GameHost.vue";
import { HOSTED_GAMES } from "../hostedGames.js";
import { activate } from "./index.js";

// A game's launcher in a room.
const launcher = {
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
    it.each(HOSTED_GAMES)(
        "asks first, then plays %s over the world",
        (slug) => {
            const ctx = { openCard: vi.fn() };
            const hosted = {
                ...launcher,
                id: slug,
                game: slug,
                card: { ...launcher.card, slug, name: slug },
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

        activate({ ...launcher, type: "teleporter" }, ctx);
        activate({ ...launcher, type: "constructor" }, ctx);

        expect(ctx.openCard).not.toHaveBeenCalled();
    });
});
