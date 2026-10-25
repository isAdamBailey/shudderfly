import { box, mergeParts } from "./streetGeometry.js";
import { CHAIR, chairSpots } from "./stageLayout.js";

/**
 * The Cockroach's auditorium, built into the room: its stage along the
 * back wall, and the chairs facing it. A room's `stage` ({ w, h, d }) is a
 * platform of dark boards on a stone front, with a step of trim along its
 * edge; its `seats` are rows of chairs (stageLayout.js chairSpots()), each a
 * wooden frame with a red velvet seat and back. Each is one geometry with its
 * colours in its vertices, from an injected `THREE`, as in fireplace.js.
 */

const BOARDS = ["#3b2314", "#43291a", "#352010"];
const FACE = "#57534e";
const EDGE = "#1c1410";
const FRAME = "#4a2a14";
const VELVET = "#7f1d1d";
const VELVET_DARK = "#661616";

// How wide each of the stage's boards is, and its edge's trim.
const BOARD = 30;
const LIP = 6;

/** Stage `stage` as one geometry, its back on z = 0 and its left end on
 * x = 0. */
export function stageGeometry(THREE, { w, h, d }) {
    const parts = [
        // The stone front, under the lip.
        box(THREE, FACE, [w, h - LIP, 4], [w / 2, (h - LIP) / 2, d - 2]),
        // The lip along its edge, a little proud.
        box(THREE, EDGE, [w, LIP, 8], [w / 2, h - LIP / 2, d - 2]),
    ];
    // Its boards, running along it, a hair apart.
    for (let z = 0, n = 0; z < d - 4; z += BOARD, n += 1) {
        const deep = Math.min(BOARD, d - 4 - z);
        parts.push(
            box(
                THREE,
                BOARDS[n % BOARDS.length],
                [w, h, deep - 1],
                [w / 2, h / 2, z + deep / 2]
            )
        );
    }
    return mergeParts(THREE, parts);
}

/** One chair, facing -z, its middle on `at` ({ x, z }). */
function chair(THREE, { x, z }) {
    const { w, d, seat, back } = CHAIR;
    const leg = 5;
    const parts = [];
    for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
            parts.push(
                box(
                    THREE,
                    FRAME,
                    [leg, seat - 6, leg],
                    [
                        x + sx * (w / 2 - leg),
                        (seat - 6) / 2,
                        z + sz * (d / 2 - leg),
                    ]
                )
            );
        }
    }
    parts.push(
        // The seat's frame and its cushion.
        box(THREE, FRAME, [w, 6, d], [x, seat - 3, z]),
        box(THREE, VELVET, [w - 6, 8, d - 6], [x, seat + 4, z - 2]),
        // The back, at the back of the seat (+z, away from the stage),
        // padded on the side the sitter leans on, and covered in velvet
        // behind, which is what the room sees of the rows.
        box(
            THREE,
            FRAME,
            [w, back - seat, 6],
            [x, (seat + back) / 2, z + d / 2 - 3]
        ),
        box(
            THREE,
            VELVET_DARK,
            [w - 10, back - seat - 14, 4],
            [x, (seat + back) / 2 + 2, z + d / 2 - 8]
        ),
        box(
            THREE,
            VELVET,
            [w - 8, back - seat - 8, 2],
            [x, (seat + back) / 2, z + d / 2 + 1]
        )
    );
    return parts;
}

/** A room's `seats` as one geometry. */
export function seatsGeometry(THREE, seats) {
    return mergeParts(
        THREE,
        chairSpots(seats).flatMap((at) => chair(THREE, at))
    );
}
