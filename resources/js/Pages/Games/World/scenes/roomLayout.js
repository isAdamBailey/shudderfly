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
};

/** The room scene `room` ({ size: { w, d } }) on a stage `w` × `h` px:
 * { camera, wallHeight }. */
export function roomLayout(room, { w, h }) {
    const width = room.size.w;
    const depth = room.size.d;
    const wallHeight = width * WALL_HEIGHT;
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

/** Where the Butt stands on arriving: in front of the interactable named by
 * `spot` (the door it came through), or at the room's spawn. */
export function arrivalSpot(room, spot) {
    const item = spot && room.interactables.find((i) => i.id === spot);
    if (!item) return { ...room.spawn };
    return {
        x: item.x,
        // Clear of the door, so it doesn't stand in front of it.
        z: Math.min(room.size.d, (item.z ?? 0) + ROOM_SIZES.butt * 2),
    };
}
