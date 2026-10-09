import { computed, markRaw, onScopeDispose, reactive } from "vue";
import { bookLook, bookSlot, pagesIn } from "../scenes/bookshelf.js";

/**
 * The books on a room's shelves (issue #130), DOM-free: which have been
 * fetched, and each one as an interactable (`type: "book"`) standing where
 * scenes/bookshelf.js draws it. Books come a page at a time from
 * `fetchPage(shelf, page)` (books.category, the Books pages' own lists), as
 * `show(x0, x1)` says that stretch of the back wall is in view, so a long
 * shelf fills in as the Butt walks along it. A page that fails is asked
 * for again a little later, a few times.
 */

// A failed page is tried again after this long, times its attempt.
const RETRY_MS = 2000;
const TRIES = 3;
export function useShelves(shelves = [], { fetchPage }) {
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
            const from = (page - 1) * shelf.perPage;
            const s = shelves.indexOf(shelf);
            books.slice(0, shelf.count - from).forEach((book, n) => {
                loaded[shelf.id][from + n] = markRaw(
                    bookItem(shelf, s, book, from + n)
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

    /** Which pages stand between `x0` and `x1` along the wall, as a key
     * that only changes when they do. */
    function pagesNear(x0, x1) {
        return shelves.map((shelf) => pagesIn(shelf, x0, x1).join()).join("|");
    }

    /** Fetches whatever books stand between `x0` and `x1` along the wall. */
    function show(x0, x1) {
        for (const shelf of shelves) {
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

/** Book `book` in slot `i` of `shelf` (the room's `s`th) as an
 * interactable. Its `width` × `height` is the book as drawn, for its
 * button. */
function bookItem(shelf, s, book, i) {
    const slot = bookSlot(shelf, i);
    const look = bookLook(i, s);
    return {
        id: `book-${shelf.id}-${i}`,
        type: "book",
        x: slot.x,
        y: slot.y,
        z: 0,
        width: look.width,
        height: look.height,
        label: book.title,
        cover: book.cover_image?.media_path ?? null,
        book,
    };
}
