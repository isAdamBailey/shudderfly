import { jitter } from "@/utils/math";
import { box, mergeParts } from "./streetGeometry.js";

/**
 * The Library's bookcases (issue #130). A room's `shelves` are bookcases
 * against its back wall: shelf `{ id, category, count, x, rows, span }`
 * holds `count` books of the Books pages' list `category`, from `x` along
 * the wall, `rows` high and a book every `span`. Books fill a column top to
 * bottom, then the next column along, so the pages of books.category (in
 * order, `perPage` each) come in left to right as the Butt walks. The
 * server lays shelves out the same way (GamesWorld::shelfEnd()). Pure
 * numbers, and geometry from an injected `THREE`, as in streetGeometry.js.
 */

// A bookcase, in world units: the plinth under its bottom shelf, the height
// of each row, how thick its boards are and how deep it stands off the wall.
// The plinth is taller than the Butt looks against the wall from anywhere
// on the floor: the books' titles are DOM over the canvas, so a book drawn
// behind the Butt would cover it.
export const BOOKCASE = { plinth: 148, row: 100, board: 8, depth: 34 };
// A book standing face out: how wide and tall it may be (each one its own,
// within these), and how thick.
export const BOOK = { width: [70, 88], height: [74, 92], depth: 22 };

const WOOD = "#5b3a1e";
const BACK = "#2b1a0e"; // the panel behind the books
const CUPBOARD = "#6b4423"; // the doors under the bottom shelf

// Cover colours dark enough for a title written over them in white.
const COVERS = [
    "#9f1239",
    "#1e3a8a",
    "#166534",
    "#a16207",
    "#6b21a8",
    "#0f766e",
    "#c2410c",
    "#7c2d12",
    "#be185d",
    "#334155",
];

/** How many columns of books `shelf` has. */
export function columnsOf(shelf) {
    return Math.ceil(shelf.count / shelf.rows);
}

/** Where `shelf` ends along the back wall. */
export function shelfEnd(shelf) {
    return shelf.x + columnsOf(shelf) * shelf.span;
}

/** How tall a bookcase of `rows` stands: to the top of its top board. */
export function bookcaseHeight(rows) {
    return BOOKCASE.plinth + rows * BOOKCASE.row;
}

/** Where book `i` of `shelf` stands: the middle of its slot along the wall
 * (`x`) and the shelf it's on (`y`, its foot). Row 0 is the top. */
export function bookSlot(shelf, i) {
    const column = Math.floor(i / shelf.rows);
    const row = i % shelf.rows;
    return {
        x: shelf.x + (column + 0.5) * shelf.span,
        y: BOOKCASE.plinth + (shelf.rows - 1 - row) * BOOKCASE.row,
    };
}

/** Book `i`'s own size and cover colour, the same every visit. `seed`
 * keeps two shelves from matching. */
export function bookLook(i, seed = 0) {
    const n = i * 7 + seed * 101;
    const [w0, w1] = BOOK.width;
    const [h0, h1] = BOOK.height;
    return {
        width: w0 + jitter(n) * (w1 - w0),
        height: h0 + jitter(n + 1) * (h1 - h0),
        color: COVERS[Math.floor(jitter(n + 2) * COVERS.length)],
    };
}

/** The slots of `shelf`'s books between `x0` and `x1` along the wall:
 * { from, to } (inclusive), or null when none are. */
export function slotsIn(shelf, x0, x1) {
    const first = Math.max(0, Math.floor((x0 - shelf.x) / shelf.span));
    const last = Math.min(
        columnsOf(shelf) - 1,
        Math.floor((x1 - shelf.x) / shelf.span)
    );
    if (last < first) return null;
    return {
        from: first * shelf.rows,
        to: Math.min(shelf.count, (last + 1) * shelf.rows) - 1,
    };
}

/** The pages of books.category with any of `shelf`'s books between `x0`
 * and `x1` along the wall, first to last. */
export function pagesIn(shelf, x0, x1) {
    const slots = slotsIn(shelf, x0, x1);
    if (!slots) return [];
    const pages = [];
    const last = Math.floor(slots.to / shelf.perPage);
    for (let p = Math.floor(slots.from / shelf.perPage); p <= last; p += 1) {
        pages.push(p + 1);
    }
    return pages;
}

/** The bookcase for `shelf` (its boards, ends and back panel), as one
 * geometry in world space with its colours in its vertices. */
export function bookcaseGeometry(THREE, shelf) {
    const { plinth, row, board, depth } = BOOKCASE;
    const x0 = shelf.x;
    const x1 = shelfEnd(shelf);
    const width = x1 - x0;
    const mid = (x0 + x1) / 2;
    const height = bookcaseHeight(shelf.rows);
    const parts = [
        box(THREE, BACK, [width, height, 2], [mid, height / 2, 1]),
        box(
            THREE,
            WOOD,
            [board, height, depth],
            [x0 - board / 2, height / 2, depth / 2]
        ),
        box(
            THREE,
            WOOD,
            [board, height, depth],
            [x1 + board / 2, height / 2, depth / 2]
        ),
    ];
    // Cupboard doors under the bottom shelf, a pair to every few columns,
    // with a gap between each.
    const doors = Math.max(1, Math.round(width / 220));
    const doorW = width / doors;
    for (let n = 0; n < doors; n += 1) {
        parts.push(
            box(
                THREE,
                CUPBOARD,
                [doorW - 6, plinth - board - 6, 4],
                [x0 + (n + 0.5) * doorW, (plinth - board) / 2, depth - 2]
            )
        );
    }
    // A board under each row, and one on top.
    for (let r = 0; r <= shelf.rows; r += 1) {
        const top = plinth + r * row;
        parts.push(
            box(
                THREE,
                WOOD,
                [width + board * 2, board, depth],
                [mid, top - board / 2, depth / 2]
            )
        );
    }
    return mergeParts(THREE, parts);
}

/** Every book on `shelves` as one instanced mesh (a single draw call for a
 * wall of books), or null with no books. Each is a box
 * standing face out on its shelf, in its own size and colour. */
export function booksMesh(THREE, shelves) {
    const total = shelves.reduce((n, shelf) => n + shelf.count, 0);
    if (total === 0) return null;
    const mesh = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ roughness: 0.7 }),
        total
    );
    const matrix = new THREE.Matrix4();
    const turn = new THREE.Quaternion();
    const at = new THREE.Vector3();
    const size = new THREE.Vector3();
    const color = new THREE.Color();
    const z = BOOKCASE.depth - BOOK.depth / 2 - 4;
    let n = 0;
    shelves.forEach((shelf, s) => {
        for (let i = 0; i < shelf.count; i += 1) {
            const slot = bookSlot(shelf, i);
            const look = bookLook(i, s);
            at.set(slot.x, slot.y + look.height / 2, z);
            size.set(look.width, look.height, BOOK.depth);
            mesh.setMatrixAt(n, matrix.compose(at, turn, size));
            mesh.setColorAt(n, color.set(look.color));
            n += 1;
        }
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}
