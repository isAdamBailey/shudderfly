import { itemPoint } from "./roomLayout.js";

/**
 * The Cockroach's bass drum, as pure numbers: how big it is and where its
 * head is. three/bassDrum.js draws it from these; Room3D.vue lays a round
 * button over its head from them.
 *
 * The drum is built facing +z, its middle on x = 0, standing on y = 0, and
 * posed like any interactable (roomLayout.js itemPose()). It hangs on its
 * side in a cradle, an orchestra's way: one head faces out, to be hit.
 */

export const BASS_DRUM = {
    // Its heads' radius, and how deep its shell is from head to head.
    radius: 96,
    shell: 64,
    // How high its middle hangs, and how far out of the wall.
    y: 134,
    z: 46,
    // Its hoops, round each head.
    hoop: 6,
};

/** How far the front head is out from the drum's middle: set in its hoop,
 * halfway into it. three/bassDrum.js draws it there. */
export const HEAD_OUT = BASS_DRUM.shell / 2 - BASS_DRUM.hoop / 2;

/** A point on the front head in the room, `x` across and `y` up from its
 * middle. */
export function headPoint(item, x = 0, y = 0) {
    return itemPoint(item, [x, BASS_DRUM.y + y, BASS_DRUM.z + HEAD_OUT]);
}

/** How far out from the middle of the head a hit at screen point `at`
 * lands, as a share of the head's radius (0 the middle, 1 the rim), given
 * the head's middle on screen and its radii across and up (`rx`, `ry`). */
export function hitEdge(middle, { rx, ry }, at) {
    if (rx <= 0 || ry <= 0) return 0;
    const out = Math.hypot((at.x - middle.x) / rx, (at.y - middle.y) / ry);
    return Math.min(1, out);
}
