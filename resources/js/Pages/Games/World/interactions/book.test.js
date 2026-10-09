import { describe, expect, it, vi } from "vitest";
import BookCard from "../components/BookCard.vue";
import { activate, autoTriggers } from "./index.js";

const book = { id: 7, slug: "the-big-toot", title: "The Big Toot" };
const item = { id: "book-books-0", type: "book", x: 295, y: 260, z: 0, book };

describe("book interaction", () => {
    it("opens the book's card", () => {
        const ctx = { openCard: vi.fn() };

        activate(item, ctx);

        expect(ctx.openCard).toHaveBeenCalledWith(BookCard, { book });
    });

    it("needs a tap or Enter, not just walking past", () => {
        expect(autoTriggers(item)).toBe(false);
    });
});
