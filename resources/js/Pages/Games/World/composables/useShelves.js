import { computed, markRaw, onScopeDispose, reactive } from "vue";
import {
    bookLook,
    bookSlot,
    onShelfWall,
    pagesIn,
    shelfWall,
} from "../scenes/bookshelf.js";

/**
 * The books on a room's shelves (issue #130), DOM-free: which have been
 * fetched, and each one as an interactable (`type: "book"`) standing where
 * scenes/bookshelf.js draws it. Books come a page at a time from
 * `fetchPage(shelf, page)` (books.category, the Books pages' own lists), as
 * `show(x0, x1, wall)` says that stretch of a wall is in view, so a long
 * shelf fills in as the Butt walks along it. A page that fails is asked
 * for again a little later, a few times.
 * `size` is the room's ({ w, d }), to stand books on a wall but the back.
 */

// A failed page is tried again after this long, times its attempt.
const RETRY_MS = 2000;
const TRIES = 3;
export function useShelves(shelves = [], { fetchPage, size }) {
    // Shelf id → its books as interactables by slot, each made once, as
    // its page arrives.
    const loaded = reactive(Object.fromEntries(shelves.map((s) => [s.id, []])));
    // "<shelf>:<page>" asked for, or arrived.
    const asked = new Set();
    const retries = new Set();

    async function load(shelf, page, attempt = 1) {
        const key = `${shelf.id}:${page}`;
        if (attempt === 1 && asked.has(key)) return;
        asked.add(key);
        try {
            const books = await fetchPage(shelf, page);
            // The page's first book, as this shelf counts them.
            const from = (page - 1) * shelf.perPage - (shelf.first ?? 0);
            const s = shelves.indexOf(shelf);
            books.forEach((book, n) => {
                const i = from + n;
                if (i < 0 || i >= shelf.count) return;
                loaded[shelf.id][i] = markRaw(
                    bookItem(shelf, s, book, i, size)
                );
            });
        } catch {
            if (attempt >= TRIES) {
                // Given up for now: the next show() of it asks afresh.
                asked.delete(key);
                return;
            }
            const timer = setTimeout(() => {
                retries.delete(timer);
                load(shelf, page, attempt + 1);
            }, RETRY_MS * attempt);
            retries.add(timer);
        }
    }

    onScopeDispose(() => retries.forEach(clearTimeout));

    // Each wall's shelves, which never change.
    const byWall = {};
    for (const shelf of shelves) {
        const wall = shelfWall(shelf);
        byWall[wall] = [...(byWall[wall] ?? []), shelf];
    }
    const on = (wall) => byWall[wall] ?? [];

    /** Which pages stand between `x0` and `x1` along `wall`, as a key
     * that only changes when they do. */
    function pagesNear(x0, x1, wall = "back") {
        // Named for the wall, so turning to one whose pages read the same
        // still fetches its own.
        const pages = on(wall).map((shelf) => pagesIn(shelf, x0, x1).join());
        return `${wall}:${pages.join("|")}`;
    }

    /** Fetches whatever books stand between `x0` and `x1` along `wall`. */
    function show(x0, x1, wall = "back") {
        for (const shelf of on(wall)) {
            for (const page of pagesIn(shelf, x0, x1)) load(shelf, page);
        }
    }

    /** Each shelf's books as interactables, by slot (a hole where one
     * hasn't come yet). */
    const slots = computed(() => shelves.map((shelf) => loaded[shelf.id]));

    /** Every fetched book, shelf by shelf, in order. */
    const items = computed(() =>
        slots.value.flatMap((list) => list.filter(Boolean))
    );

    return { slots, items, pagesNear, show };
}

/** Book `book` in slot `i` of `shelf` (the room's `s`th, in a room `size`
 * across) as an interactable, where it stands in the room and on the
 * shelf's wall. Its `width` × `height` is the book as drawn, for its
 * button. */
function bookItem(shelf, s, book, i, size) {
    const slot = bookSlot(shelf, i);
    const look = bookLook(i, s);
    const wall = shelfWall(shelf);
    return {
        id: `book-${shelf.id}-${i}`,
        type: "book",
        ...onShelfWall(shelf, size, slot),
        ...(wall === "back" ? {} : { wall }),
        width: look.width,
        height: look.height,
        label: book.title,
        cover: book.cover_image?.media_path ?? null,
        book,
    };
}
