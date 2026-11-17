/**
 * The Garage's sectional door (issue #227), as pure numbers: where each
 * of its hinged sections is for how far open the door is.
 * three/garageDoor.js draws them from this.
 *
 * In the door's own space: its plane on z = 0, from the floor (y = 0) up
 * to `h`. Its sections run in a track up the opening, round the corner at
 * its top, and out into the room under the ceiling (+z) at that height,
 * so open, the door lies flat overhead, as deep as it was tall.
 */

/** Where the track is `s` along it from the floor: up the opening, then
 * out from its top. */
function trackAt(s, h) {
    return s <= h ? { y: s, z: 0 } : { y: h, z: s - h };
}

/** Where door `door` ({ h })'s top edge is at `open` (0 shut to 1 open):
 * { y, z }, the point on the track the opener's trolley pulls. */
export function topEdge({ h }, open) {
    return trackAt(h + open * h, h);
}

/** Each of door `door` ({ h, sections })'s sections, bottom first, at
 * `open` (0 shut to 1 open): its bottom edge's { y, z }, and `tilt`, how
 * far it's tipped from upright toward the room (radians, π/2 flat), as a
 * rotation about x. */
export function sectionPoses({ h, sections }, open) {
    const tall = h / sections;
    return Array.from({ length: sections }, (_, i) => {
        const from = i * tall + open * h;
        const bottom = trackAt(from, h);
        const top = trackAt(from + tall, h);
        return {
            ...bottom,
            tilt: Math.atan2(top.z - bottom.z, top.y - bottom.y),
        };
    });
}
