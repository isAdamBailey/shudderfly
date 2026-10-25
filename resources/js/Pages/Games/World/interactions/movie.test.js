import { describe, expect, it, vi } from "vitest";
import MovieCard from "../components/MovieCard.vue";
import { activate, autoTriggers } from "./index.js";

const movie = { id: 862, title: "Toy Story", cover: null };
const item = { id: "book-movies-0", type: "movie", x: 295, y: 260, movie };

describe("movie interaction", () => {
    it("opens the movie's card", () => {
        const ctx = { openCard: vi.fn() };

        activate(item, ctx);

        expect(ctx.openCard).toHaveBeenCalledWith(MovieCard, { movie });
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(item)).toBe(false);
    });
});
