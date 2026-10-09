/**
 * Where a room goes on the stage, as pure numbers (issue #130). A room is a
 * dollhouse box with its front wall taken away: the floor runs `size.w`
 * across and `size.d` from the back wall (z = 0) to the open front (z = d),
 * seen straight on by the same level, lens-shifted camera as the road
 * (composables/projection.js). The walls fill the stage's height, so a
 * phone doesn't shrink a wide room down to a strip. `frame` (the whole
 * width, when a room doesn't say) is how tall those walls are. A room
 * wider than the view scrolls as the Butt walks.
 */

// How a door faces, inward off its wall: `back` is the far wall, `left` and
// `right` the ends. `x`/`z` is the step into the room, `turn` swings a card
// that faces +z around to face that way.
const WALL_INSET = 3;
const FACING = {
    back: { x: 0, z: 1, turn: 0 },
    left: { x: 1, z: 0, turn: Math.PI / 2 },
    right: { x: -1, z: 0, turn: -Math.PI / 2 },
};

/** Which way `wall` faces into the room (`back` when it doesn't say). */
export function wallFacing(wall) {
    return FACING[wall] ?? FACING.back;
}

/** Where `item` is drawn: on its wall, a hair into the room, turned to
 * face inward. Floor things take the back wall's facing, which only nudges
 * them forward. */
export function itemPose(item) {
    const face = wallFacing(item.wall);
    return {
        x: item.x + face.x * WALL_INSET,
        y: item.y ?? 0,
        z: (item.z ?? 0) + face.z * WALL_INSET,
        turn: face.turn,
    };
}

// Focal length in stage heights: a little shorter than the road's, so the
// room's side walls and floor show their depth.
const FOCAL = 1.6;
// The walls' height, as a share of the width the camera frames.
const WALL_HEIGHT = 0.5;
// The camera's eye, as a share of the walls' height.
const EYE = 0.75;
// How much of the stage the room may fill: the row of the floor's front
// edge, and the space left above the back wall.
const FIT = { floorRow: 0.95, top: 0.06 };

// Things in a room, in world units.
export const ROOM_SIZES = {
    butt: 90,
    door: { width: 120, height: 210 },
    // A flight of stairs on a side wall (staircase.js): its button covers
    // the steps, seen end-on: up, the flight; down, the rail round the well.
    stairs: {
        up: { width: 160, height: 300 },
        down: { width: 160, height: 110 },
    },
    toy: 80,
};

// A flight of stairs (staircase.js), in world units: how far it runs along
// its wall, how far it reaches into the room, and its steps.
export const STAIRS = { run: 300, width: 90, steps: 9 };

/** How far from a wall with stairs the Butt keeps: clear of the flight. */
export const STAIRS_CLEARANCE = STAIRS.width + ROOM_SIZES.butt / 2;

/** How tall a room's walls are, in world units: set by the width the camera
 * frames, so a long hall is no taller than the part of it on screen. */
export function wallHeightOf(room) {
    return (room.frame ?? room.size.w) * WALL_HEIGHT;
}

/** The room scene `room` ({ size: { w, d }, frame? }) on a stage `w` × `h`
 * px: { camera, wallHeight, pan }. `pan` is how far the camera may look
 * along the room ({ min, max } world x) and `slack`, how far the Butt walks
 * from the middle before the view scrolls. A room narrower than the view
 * stays put. */
export function roomLayout(room, { w, h }) {
    const width = room.size.w;
    const depth = room.size.d;
    const wallHeight = wallHeightOf(room);
    const eyeY = wallHeight * EYE;
    const focal = FOCAL * h;

    // px per unit at the front edge, from the wall height. Fitting the
    // width instead would shrink every door on a phone. The back wall is
    // further, so smaller, and still on screen.
    const front = ((FIT.floorRow - FIT.top) * h) / wallHeight;

    const camera = {
        x: width / 2,
        y: eyeY,
        z: depth + focal / front,
        focal,
        eyeRow: FIT.floorRow * h - eyeY * front,
        w,
        h,
    };

    // Half the width on screen at the front edge, the narrowest the view
    // gets. A room narrower than that has nowhere to scroll to.
    const half = ((w / 2) * (camera.z - depth)) / focal;
    const scrolls = half * 2 < width - 1;

    return {
        wallHeight,
        camera,
        pan: scrolls
            ? { min: half, max: width - half, slack: half * 0.4 }
            : { min: width / 2, max: width / 2, slack: 0 },
    };
}

/** `layout`'s camera aimed at world x `lookX`, kept inside the room. */
export function roomCamera(layout, lookX) {
    const x = Math.min(layout.pan.max, Math.max(layout.pan.min, lookX));
    if (x === layout.camera.x) return layout.camera;
    return { ...layout.camera, x };
}

/** Where the camera looks after the Butt moves to `buttX`: it stays put
 * while the Butt is within `slack` of the middle, then follows, and never
 * looks past either end of the room. */
export function roomLook(pan, lookX, buttX) {
    let next = lookX;
    if (buttX < lookX - pan.slack) next = buttX + pan.slack;
    else if (buttX > lookX + pan.slack) next = buttX - pan.slack;
    return Math.min(pan.max, Math.max(pan.min, next));
}

/** Whether door `item` is plainly how you'd leave: a room's way out, or
 * stairs. It needs no title over it (its button is still named). */
const wayBack = (item) => Boolean(item.exit || item.stairs);

/** How an interactable is drawn and covered, in world units: { width,
 * height } (its glyph is `height` tall) and whether its button carries an
 * arched gold title, as the road's landmarks do. A door is a doorway (or
 * a flight of stairs), with its name over it unless it's plainly the way
 * back (see wayBack()); anything else is a `size` square (ROOM_SIZES.toy if it
 * says nothing), titled if it leads somewhere (a game) or says `titled`. */
export function itemBox(item) {
    const titled =
        item.titled ??
        (item.type === "game" || (item.type === "door" && !wayBack(item)));
    if (item.stairs) return { ...ROOM_SIZES.stairs[item.stairs], titled };
    if (item.type === "door") return { ...ROOM_SIZES.door, titled };
    const size = item.size ?? ROOM_SIZES.toy;
    return { width: size, height: size, titled };
}
