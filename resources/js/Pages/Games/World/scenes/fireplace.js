import { box, mergeParts } from "./streetGeometry.js";

/**
 * A stone fireplace against a room's back wall (the Cockroach's House,
 * where Hank's portrait stands on its mantel). A room's `fireplaces` lists
 * them: `{ x, w, h, d }`, its middle `x` along the wall, `h` to the top of
 * its mantel, `d` deep. A dark firebox in a surround of rough blocks, a
 * mantel shelf, and a hearth slab out on the floor; the fire in it is a
 * toy of the room's (its 🔥, which switches the fire's light). Geometry
 * from an injected `THREE`, as in entertainmentCenter.js.
 */

const STONE = ["#78716c", "#6b6560", "#57534e", "#837b74"];
const MANTEL = "#3b2314";
const SOOT = "#0c0a09";
const HEARTH = "#44403c";

const SHELF = 10; // the mantel shelf's thickness
const OVERHANG = 10; // how far the shelf reaches past the surround
const BLOCK = 26; // a surround block's height

/** The fireplace `unit` as one geometry in world space, with its colours
 * in its vertices. */
export function fireplaceGeometry(THREE, { x, w, h, d }) {
    const body = h - SHELF;
    // The firebox opening: half the width, most of the way up.
    const openW = w * 0.48;
    const openH = body * 0.72;
    const jamb = (w - openW) / 2;
    const parts = [
        // The soot-black back of the firebox, set into the wall.
        box(THREE, SOOT, [openW, openH, 2], [x, openH / 2, 1]),
        // Its sides and roof, so it reads as a hole, not a black panel.
        box(THREE, SOOT, [2, openH, d - 4], [x - openW / 2, openH / 2, d / 2]),
        box(THREE, SOOT, [2, openH, d - 4], [x + openW / 2, openH / 2, d / 2]),
        box(THREE, SOOT, [openW, 2, d - 4], [x, openH, d / 2]),
        // The mantel shelf, and the hearth slab out on the floor.
        box(
            THREE,
            MANTEL,
            [w + OVERHANG * 2, SHELF, d + OVERHANG],
            [x, h - SHELF / 2, (d + OVERHANG) / 2]
        ),
        box(THREE, HEARTH, [w * 0.8, 6, d + 34], [x, 3, (d + 34) / 2]),
    ];
    // The surround: courses of blocks up each side of the opening, and over
    // it a lintel of three, the middle one the keystone.
    for (const side of [-1, 1]) {
        const cx = x + side * (openW / 2 + jamb / 2);
        for (let y = 0, row = 0; y < body; y += BLOCK, row += 1) {
            const tall = Math.min(BLOCK, body - y);
            const halves = row % 2 ? [jamb] : [jamb * 0.45, jamb * 0.55];
            let from = cx - jamb / 2;
            for (const [i, wide] of halves.entries()) {
                parts.push(
                    box(
                        THREE,
                        STONE[(row + i + (side > 0 ? 1 : 0)) % STONE.length],
                        [wide - 2, tall - 2, d],
                        [from + wide / 2, y + tall / 2, d / 2]
                    )
                );
                from += wide;
            }
        }
    }
    // Each lintel stone: where it starts and how much of the opening it
    // spans, as shares, and how far it stands proud (the keystone does).
    const lintel = body - openH;
    for (const { from, share, proud } of [
        { from: 0, share: 0.4, proud: 0 },
        { from: 0.4, share: 0.2, proud: 4 },
        { from: 0.6, share: 0.4, proud: 0 },
    ]) {
        const wide = openW * share;
        parts.push(
            box(
                THREE,
                STONE[proud ? 3 : 1],
                [wide - 2, lintel - 2 + proud, d + proud],
                [
                    x - openW / 2 + openW * from + wide / 2,
                    openH + lintel / 2,
                    d / 2,
                ]
            )
        );
    }
    return mergeParts(THREE, parts);
}
