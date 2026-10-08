/**
 * Where a room goes on the stage, as pure numbers (issue #130). A room is a
 * dollhouse box with its front wall taken away: the floor runs `size.w`
 * across and `size.d` from the back wall (z = 0) to the open front (z = d),
 * seen straight on by the same level, lens-shifted camera as the road
 * (composables/projection.js). The whole room fits the stage: its front edge
 * as wide as the stage allows, its back wall's top on screen.
 */

// Focal length in stage heights: a little shorter than the road's, so the
// room's side walls and floor show their depth.
const FOCAL = 1.6;
// The walls' height, as a share of the room's width.
const WALL_HEIGHT = 0.5;
// The camera's eye, as a share of the walls' height.
const EYE = 0.75;
// How much of the stage the room may fill: its front edge's width, and the
// rows of the floor's front edge and the space above the back wall.
const FIT = { width: 0.94, floorRow: 0.95, top: 0.06 };

// Things in a room, in world units.
export const ROOM_SIZES = {
    butt: 90,
    door: { width: 120, height: 210 },
    toy: 80,
};

/** How tall a room's walls are, in world units: set by its width, so a
 * room is the same shape on every stage. */
export function wallHeightOf(room) {
    return room.size.w * WALL_HEIGHT;
}

/** The room scene `room` ({ size: { w, d } }) on a stage `w` × `h` px:
 * { camera, wallHeight }. */
export function roomLayout(room, { w, h }) {
    const width = room.size.w;
    const depth = room.size.d;
    const wallHeight = wallHeightOf(room);
    const eyeY = wallHeight * EYE;
    const focal = FOCAL * h;

    // px per unit at the front edge. The back wall is further, so smaller:
    // fitting the walls' whole height at the front's scale fits it anyway.
    const front = Math.min(
        (FIT.width * w) / width,
        ((FIT.floorRow - FIT.top) * h) / wallHeight
    );

    return {
        wallHeight,
        camera: {
            x: width / 2,
            y: eyeY,
            z: depth + focal / front,
            focal,
            eyeRow: FIT.floorRow * h - eyeY * front,
            w,
            h,
        },
    };
}

/** How an interactable is drawn and covered, in world units: { width,
 * height } (its glyph is `height` tall) and whether its button carries an
 * arched gold title, as the road's landmarks do. A door is a doorway, with
 * its name over it; anything else is a `size` square (ROOM_SIZES.toy if it
 * says nothing), titled if it leads somewhere (a game) or says `titled`. */
export function itemBox(item) {
    const titled =
        item.titled ?? (item.type === "door" || item.type === "game");
    if (item.type === "door") return { ...ROOM_SIZES.door, titled };
    const size = item.size ?? ROOM_SIZES.toy;
    return { width: size, height: size, titled };
}
