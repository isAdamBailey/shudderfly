import { WOOD } from "./bookshelf.js";
import { box, mergeParts } from "./streetGeometry.js";

/**
 * A wooden entertainment center against a room's back wall (the Butt's
 * House hall, where the radio sits on it). A room's `entertainment` lists
 * them: `{ x, w, h, d }`, its middle `x` along the wall and its size in
 * world units. It stands on short legs, a cupboard at each end with a brass
 * knob, records filed in the open middle. Geometry from an injected
 * `THREE`, as in bookshelf.js.
 */

const LEG = 16; // how tall its legs are
const TOP = 8; // how thick its top board is
const OVERHANG = 6; // how far the top reaches past the cabinet
const INSET = 7; // how far in from its ends the doors are
const SLEEVE = 9; // a record sleeve to every this many units

const DOOR = "#7a4a24";
const PANEL = "#8b5a2b";
const SHADOW = "#1f1209"; // the inside of the open middle
const BRASS = "#c9a227";

// Record sleeves' spines, filed in the middle.
const SLEEVES = [
    "#9f1239",
    "#1e3a8a",
    "#e7c9a0",
    "#166534",
    "#a16207",
    "#111827",
    "#c2410c",
    "#6b21a8",
    "#0f766e",
    "#f5f5f4",
];

/** The entertainment center `unit` as one geometry in world space, with its
 * colours in its vertices. */
export function entertainmentCenterGeometry(THREE, { x, w, h, d }) {
    const bodyH = h - LEG - TOP;
    const bodyY = LEG + bodyH / 2;
    // A cupboard at each end; between them the middle is open, a recess
    // with a dark back and a shelf the records stand on.
    const doorW = w * 0.3;
    const doorH = bodyH - 14;
    const endW = doorW + INSET * 2;
    const middleW = w - endW * 2;
    const parts = [
        box(
            THREE,
            WOOD,
            [w + OVERHANG * 2, TOP, d + OVERHANG],
            [x, h - TOP / 2, (d + OVERHANG) / 2]
        ),
        box(THREE, SHADOW, [middleW, bodyH, 2], [x, bodyY, 1]),
        box(THREE, WOOD, [middleW, TOP, d], [x, LEG + TOP / 2, d / 2]),
    ];
    for (const sx of [-1, 1]) {
        const ex = x + sx * (w / 2 - endW / 2);
        const cx = x + sx * (w / 2 - INSET - doorW / 2);
        parts.push(
            box(THREE, WOOD, [endW, bodyH, d], [ex, bodyY, d / 2]),
            // Its door, a raised panel on it, and a knob.
            box(THREE, DOOR, [doorW, doorH, 3], [cx, bodyY, d + 1.5]),
            box(THREE, PANEL, [doorW - 18, doorH - 18, 2], [cx, bodyY, d + 4]),
            box(
                THREE,
                BRASS,
                [6, 6, 5],
                [cx - sx * (doorW / 2 - 12), bodyY, d + 7]
            )
        );
        for (const z of [8, d - 8]) {
            parts.push(
                box(
                    THREE,
                    WOOD,
                    [10, LEG, 10],
                    [x + sx * (w / 2 - 12), LEG / 2, z]
                )
            );
        }
    }

    // The records, filed spine out in the recess.
    const floor = LEG + TOP;
    const sleeveH = bodyH - TOP - 6;
    const count = Math.floor((middleW - 4) / SLEEVE);
    const from = x - ((count - 1) * SLEEVE) / 2;
    for (let i = 0; i < count; i += 1) {
        // A few stand shorter, so they don't read as a wall.
        const tall = sleeveH - (i % 4 === 1 ? 10 : i % 3 === 0 ? 4 : 0);
        parts.push(
            box(
                THREE,
                SLEEVES[i % SLEEVES.length],
                [6, tall, d - 8],
                [from + i * SLEEVE, floor + tall / 2, d / 2]
            )
        );
    }
    return mergeParts(THREE, parts);
}
