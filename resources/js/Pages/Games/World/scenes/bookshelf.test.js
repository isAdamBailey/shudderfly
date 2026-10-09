import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { worldToScreen } from "../composables/projection.js";
import { bobLift } from "../composables/useGamesWorld.js";
import { MARGIN } from "../composables/useRoom.js";
import { ROOM_SIZES, roomLayout } from "./roomLayout.js";
import {
    BOOK,
    BOOKCASE,
    bookcaseGeometry,
    bookcaseHeight,
    bookLook,
    bookSlot,
    columnsOf,
    pagesIn,
    shelfEnd,
} from "./bookshelf.js";

// 20 books, 3 high, a book every 110 from x = 240: 7 columns.
const shelf = {
    id: "books",
    category: "people",
    count: 20,
    x: 240,
    rows: 3,
    span: 110,
    perPage: 10,
};

describe("bookshelf layout", () => {
    it("is as long as its columns", () => {
        expect(columnsOf(shelf)).toBe(7);
        expect(shelfEnd(shelf)).toBe(240 + 7 * 110);
    });

    it("fills a column top to bottom, then the next one along", () => {
        const top = BOOKCASE.plinth + 2 * BOOKCASE.row;
        expect(bookSlot(shelf, 0)).toEqual({ x: 295, y: top });
        expect(bookSlot(shelf, 2)).toEqual({ x: 295, y: BOOKCASE.plinth });
        expect(bookSlot(shelf, 3)).toEqual({ x: 405, y: top });
    });

    it("gives every book its own look, the same every time, inside its slot", () => {
        const looks = Array.from({ length: 20 }, (_, i) => bookLook(i));
        expect(bookLook(5)).toEqual(looks[5]);
        expect(new Set(looks.map((l) => l.color)).size).toBeGreaterThan(3);
        for (const look of looks) {
            expect(look.width).toBeLessThanOrEqual(shelf.span - 20);
            expect(look.height).toBeLessThanOrEqual(
                BOOKCASE.row - BOOKCASE.board
            );
            expect(look.width).toBeGreaterThanOrEqual(BOOK.width[0]);
        }
    });

    it("keeps its books above the Butt, wherever it stands", () => {
        // The Butt at its tallest (mid-bob), as close to the shelves as it
        // can get, on a phone and a laptop: the bottom shelf is higher up
        // the screen than the top of it.
        const room = { size: { w: 1240, d: 450 }, frame: 900 };
        const top = ROOM_SIZES.butt + bobLift(Math.PI / 6);
        for (const stage of [
            { w: 375, h: 560 },
            { w: 1400, h: 600 },
        ]) {
            const { camera } = roomLayout(room, stage);
            for (const z of [MARGIN, 200, 450]) {
                const butt = worldToScreen(camera, { x: 600, y: top, z });
                const shelf = worldToScreen(camera, {
                    x: 600,
                    y: BOOKCASE.plinth,
                    z: BOOKCASE.depth,
                });
                expect(butt.y).toBeGreaterThan(shelf.y);
            }
        }
    });

    it("stands no taller than a room's walls", () => {
        expect(bookcaseHeight(3)).toBeLessThan(450);
    });
});

describe("pagesIn", () => {
    it("names the pages of books in view, ten books a page", () => {
        // Columns 0-2 are books 0-8: page 1.
        expect(pagesIn(shelf, 0, 240 + 3 * 110 - 1)).toEqual([1]);
        // Column 3 is books 9-11: pages 1 and 2.
        expect(pagesIn(shelf, 240 + 3 * 110, 240 + 4 * 110 - 1)).toEqual([
            1, 2,
        ]);
        // The last column holds only book 18 and 19.
        expect(pagesIn(shelf, 900, 5000)).toEqual([2]);
        expect(pagesIn(shelf, 0, 9999)).toEqual([1, 2]);
    });

    it("names none when the shelf is out of view", () => {
        expect(pagesIn(shelf, 0, 200)).toEqual([]);
        expect(pagesIn(shelf, 1100, 2000)).toEqual([]);
    });
});

describe("bookcaseGeometry", () => {
    it("frames the shelf from the floor, against the wall", () => {
        const geometry = bookcaseGeometry(THREE, shelf);
        geometry.computeBoundingBox();
        const { min, max } = geometry.boundingBox;
        expect(min.y).toBeCloseTo(0);
        expect(max.y).toBeCloseTo(bookcaseHeight(3));
        expect(min.z).toBeCloseTo(0);
        expect(min.x).toBeLessThan(shelf.x);
        expect(max.x).toBeGreaterThan(shelfEnd(shelf));
    });
});
