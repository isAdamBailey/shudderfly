import { itemPoint } from "./roomLayout.js";

/**
 * The Cockroach's auditorium, as pure numbers: its stage curtain and its
 * chairs. scenes/stage.js and three/stageCurtain.js draw them from these;
 * Room3D.vue lays the curtain's button over it from them.
 *
 * A room's `stage` ({ w, h, d }, GamesWorld::STAGE) runs along the back
 * wall, `h` up off the floor and `d` out from it. The curtain (a `curtain`
 * interactable, `w` across) hangs at its front edge from the stage up to
 * the top of the walls, built facing +z with its middle on x = 0, and posed
 * like any interactable (roomLayout.js itemPose()).
 */

export const CURTAIN = {
    // The valance across the top, how deep it hangs down from the top of
    // the walls, and its gold fringe along its foot.
    valance: 60,
    fringe: 8,
    // How wide each drape is gathered back to at its end of the stage.
    gathered: 64,
    // The folds across each drape, and how deep they are drawn and
    // gathered.
    folds: 9,
    depth: { drawn: 5, gathered: 14 },
    // How long it takes to draw shut or open, s.
    draw: 1.2,
};

/** The corners of what of curtain `item` takes a tap in a room with walls
 * `wallHeight` tall: the valance while it's `open`, or the whole of it
 * drawn shut. */
export function curtainCorners(item, wallHeight, open) {
    const half = item.w / 2;
    const top = wallHeight - (item.y ?? 0);
    const bottom = open ? top - CURTAIN.valance : 0;
    return [
        [-half, bottom],
        [-half, top],
        [half, bottom],
        [half, top],
    ].map(([x, y]) => itemPoint(item, [x, y, 0]));
}

// An audience chair, facing the stage (-z): its seat `w` across and `d`
// deep at `seat` up, its back `back` up from the floor.
export const CHAIR = { w: 52, d: 46, seat: 44, back: 92 };

/** Where each chair of a room's `seats` stands, { x, z }: a row ({ z,
 * from, to, pitch }) puts one every `pitch` from `from` to `to`, the first
 * and last half a pitch in. */
export function chairSpots(seats) {
    return seats.flatMap(({ z, from, to, pitch }) => {
        const count = Math.floor((to - from) / pitch);
        return Array.from({ length: count }, (_, i) => ({
            x: from + (i + 0.5) * pitch,
            z,
        }));
    });
}
