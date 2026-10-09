import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { useShelves } from "./useShelves.js";

const shelf = {
    id: "books",
    category: "people",
    count: 12,
    x: 240,
    rows: 3,
    span: 110,
    perPage: 10,
};

/** A page of `n` books from book `from`, as books.category sends them. */
const page = (from, n) =>
    Array.from({ length: n }, (_, k) => ({
        id: from + k,
        title: `Book ${from + k}`,
    }));

describe("useShelves", () => {
    it("fetches the pages in view, once each, and stands each book in its slot", async () => {
        const fetchPage = vi.fn((s, p) =>
            Promise.resolve(page((p - 1) * 10, 10))
        );
        const { items, show } = useShelves([shelf], { fetchPage });

        expect(items.value).toEqual([]);
        show(0, 500);
        show(0, 500);
        await flushPromises();

        expect(fetchPage).toHaveBeenCalledTimes(1);
        expect(fetchPage).toHaveBeenCalledWith(shelf, 1);
        expect(items.value).toHaveLength(10);
        expect(items.value[3]).toMatchObject({
            id: "book-books-3",
            type: "book",
            x: 405,
            z: 0,
            label: "Book 3",
            book: { id: 3 },
        });
    });

    it("keeps to the shelf's count when a page brings more", async () => {
        const fetchPage = vi.fn((s, p) =>
            Promise.resolve(page((p - 1) * 10, 10))
        );
        const { items, show } = useShelves([shelf], { fetchPage });

        show(0, 9999);
        await flushPromises();

        expect(fetchPage).toHaveBeenCalledTimes(2);
        expect(items.value.map((i) => i.book.id)).toEqual(
            page(0, 12).map((b) => b.id)
        );
    });

    it("asks again a little later for a page that failed", async () => {
        vi.useFakeTimers();
        const fetchPage = vi
            .fn()
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValue(page(0, 10));
        const { items, show } = useShelves([shelf], { fetchPage });

        show(0, 300);
        await flushPromises();
        expect(items.value).toEqual([]);

        // Without the view moving.
        await vi.advanceTimersByTimeAsync(2000);
        await flushPromises();
        expect(fetchPage).toHaveBeenCalledTimes(2);
        expect(items.value).toHaveLength(10);
        vi.useRealTimers();
    });

    it("gives up after a few tries, until it's shown again", async () => {
        vi.useFakeTimers();
        const fetchPage = vi.fn().mockRejectedValue(new Error("offline"));
        const { show } = useShelves([shelf], { fetchPage });

        show(0, 300);
        await vi.advanceTimersByTimeAsync(20000);
        expect(fetchPage).toHaveBeenCalledTimes(3);

        show(0, 300);
        await flushPromises();
        expect(fetchPage).toHaveBeenCalledTimes(4);
        vi.useRealTimers();
    });

    it("has nothing to fetch in a room without shelves", () => {
        const fetchPage = vi.fn();
        const { items, show } = useShelves(undefined, { fetchPage });

        show(0, 9999);

        expect(fetchPage).not.toHaveBeenCalled();
        expect(items.value).toEqual([]);
    });
});
