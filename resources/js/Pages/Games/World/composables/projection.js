/**
 * Screen ↔ world for the Games World camera, in one place (issue #130): the
 * renderer sets its Three.js camera up from the same numbers
 * (three/useWorldRenderer.js applyCamera), so what you see and what you tap
 * can't drift apart. Pure maths, testable without WebGL.
 *
 * The camera is level, looking down -z, with its lens shifted rather than the
 * camera tilted: its eye height sits at screen row `eyeRow`, so the ground
 * still recedes toward a horizon and vertical things stay vertical (a
 * camera-facing card is just a plane facing +z).
 *
 * camera = {
 *   x, y, z,  // position in world units
 *   focal,    // px per world unit at 1 unit of depth
 *   eyeRow,   // screen row (px from the top) level with the camera
 *   lensX,    // optional: px the view is shifted sideways (0 = centred)
 *   w, h,     // the stage, px
 * }
 * Screen points are px from the stage's top-left. A thing at depth
 * `camera.z - z === focal` is drawn at 1 px per world unit.
 */

/** The screen column straight ahead of the camera. */
function centre(camera) {
    return camera.w / 2 + (camera.lensX ?? 0);
}

/** Where a world point is drawn: { x, y } px, and `scale` in px per world
 * unit at its depth. Null when it is behind the camera. */
export function worldToScreen(camera, { x, y = 0, z = 0 }) {
    const depth = camera.z - z;
    if (depth <= 0) return null;
    const scale = camera.focal / depth;
    return {
        x: centre(camera) + (x - camera.x) * scale,
        y: camera.eyeRow - (y - camera.y) * scale,
        scale,
    };
}

/** The point on the ground (y = 0) under a screen point: { x, z }, or null
 * for a point at or above the horizon, whose ray never reaches the ground. */
export function screenToGround(camera, sx, sy) {
    const below = sy - camera.eyeRow;
    if (below <= 0 || camera.y <= 0) return null;
    const depth = (camera.focal * camera.y) / below;
    return {
        x: camera.x + ((sx - centre(camera)) * depth) / camera.focal,
        z: camera.z - depth,
    };
}

/** The point on the upright plane at depth `z` under a screen point:
 * { x, y }. The road walks the Butt along such a plane, so dragging it maps
 * the finger to the same x wherever on its body the finger is. */
export function screenToPlane(camera, sx, sy, z = 0) {
    const depth = camera.z - z;
    return {
        x: camera.x + ((sx - centre(camera)) * depth) / camera.focal,
        y: camera.y - ((sy - camera.eyeRow) * depth) / camera.focal,
    };
}

/** The depth `z` at which the ground is drawn at screen row `row`. */
export function groundZAtRow(camera, row) {
    return camera.z - (camera.focal * camera.y) / (row - camera.eyeRow);
}
