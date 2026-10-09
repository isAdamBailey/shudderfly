import { TRIM } from "../three/roomLooks.js";
import { ROOM_SIZES } from "./roomLayout.js";
import { box, mergeParts } from "./streetGeometry.js";

/**
 * An open doorway (issue #130): a door with `open: true` is drawn as a
 * framed opening in its wall, with the dark of the room beyond, rather than
 * as a 🚪 card. The Library's rooms are joined this way. One geometry with
 * its colours in its vertices, its foot at the origin and facing +z, for
 * the room to stand on its wall (itemPose) like any door. `THREE` is passed
 * in, as in streetGeometry.js.
 */

const FRAME = { width: 14, depth: 10 };
const BEYOND = "#140d08"; // the unlit room through it
const SILL = "#3b2614"; // its floor, just inside

/** The doorway's geometry: a frame round a dark opening. */
export function doorwayGeometry(THREE) {
    const { width, height } = ROOM_SIZES.doorway;
    const half = width / 2;
    const f = FRAME.width;
    return mergeParts(THREE, [
        box(THREE, BEYOND, [width, height, 1], [0, height / 2, -2]),
        box(THREE, SILL, [width, 2, 6], [0, 1, 0]),
        box(
            THREE,
            TRIM,
            [f, height + f, FRAME.depth],
            [-half - f / 2, (height + f) / 2, 0]
        ),
        box(
            THREE,
            TRIM,
            [f, height + f, FRAME.depth],
            [half + f / 2, (height + f) / 2, 0]
        ),
        box(THREE, TRIM, [width, f, FRAME.depth], [0, height + f / 2, 0]),
    ]);
}
