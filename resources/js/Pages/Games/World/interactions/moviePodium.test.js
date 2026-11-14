import { describe, expect, it, vi } from "vitest";
import MoviesCard from "../components/MoviesCard.vue";
import { activate, autoTriggers } from "./index.js";

const item = { id: "movie-podium", type: "movie_podium", x: 1040, z: 450 };

describe("movie podium interaction", () => {
    it("opens the Movies dialog on its favourites", async () => {
        const ctx = { openCard: vi.fn() };

        await activate(item, ctx);

        expect(ctx.openCard).toHaveBeenCalledWith(MoviesCard, {});
    });

    it("opens it on what a shared movie's link names", async () => {
        const ctx = { openCard: vi.fn() };
        const args = { movieId: 862, title: "Toy Story" };

        await activate(item, ctx, args);

        expect(ctx.openCard).toHaveBeenCalledWith(MoviesCard, args);
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(item)).toBe(false);
    });
});
