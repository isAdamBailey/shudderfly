import { describe, expect, it, vi } from "vitest";
import MoviesCard from "../components/MoviesCard.vue";
import { activate, autoTriggers } from "./index.js";

const movie = { id: 862, title: "Toy Story", cover: null };
const item = { id: "book-movies-0", type: "movie", x: 295, y: 260, movie };

describe("movie interaction", () => {
    it("opens the Movies dialog on the movie, staying in the world", async () => {
        const ctx = { openCard: vi.fn() };

        await activate(item, ctx);

        expect(ctx.openCard).toHaveBeenCalledWith(MoviesCard, {
            movieId: 862,
            title: "Toy Story",
        });
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(item)).toBe(false);
    });
});
