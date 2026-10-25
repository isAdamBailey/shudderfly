import { fromView, toView, turned } from "./views.js";

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
 * In a room the camera can face any of its four walls (issue #183): `view`
 * turns the room under it (views.js), and the camera's x, y, z are in that
 * view's frame, where the faced wall is the back wall. Every function here
 * but groundZAtRow() (a depth, for the road) still takes and gives room
 * points, so callers needn't know which way the camera faces.
 *
 * camera = {
 *   x, y, z,  // position in world units, in the view's frame
 *   focal,    // px per world unit at 1 unit of depth
 *   eyeRow,   // screen row (px from the top) level with the camera
 *   lensX,    // optional: px the view is shifted sideways (0 = centred)
 *   w, h,     // the stage, px
 *   view,     // optional: { wall, size } it faces (views.js); none is back
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
    // Every overlay is placed through here each frame: the road and a room
    // facing back skip the turn.
    if (turned(camera.view)) ({ x, z } = toView(camera.view, { x, z }));
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
    return fromView(camera.view, {
        x: camera.x + ((sx - centre(camera)) * depth) / camera.focal,
        z: camera.z - depth,
    });
}

/** World units per screen px on the plane at depth `z`. */
function perPxAt(camera, z) {
    return (camera.z - z) / camera.focal;
}

/** How much of the upright plane through room point `at` ({ x, z }),
 * facing the camera, is across the stage: { from, to }, the room points
 * ({ x, z }) on it at the stage's left and right edges. */
export function spanAt(camera, at) {
    const { z } = toView(camera.view, at);
    const perPx = perPxAt(camera, z);
    return {
        from: fromView(camera.view, {
            x: camera.x - centre(camera) * perPx,
            z,
        }),
        to: fromView(camera.view, {
            x: camera.x + (camera.w - centre(camera)) * perPx,
            z,
        }),
    };
}

/** The depth at which the ground is drawn at screen row `row`: `z` in the
 * view's frame, the distance from the faced wall (the road has no view). */
export function groundZAtRow(camera, row) {
    return camera.z - (camera.focal * camera.y) / (row - camera.eyeRow);
}

/** The room point ({ x, y, z }) under a screen point on the upright plane
 * through room point `at` ({ x, z }), facing the camera (where a thing
 * held there is carried). Null at or behind the camera. */
export function screenToPlane(camera, sx, sy, at) {
    const { z } = toView(camera.view, at);
    const perPx = perPxAt(camera, z);
    if (perPx <= 0) return null;
    return fromView(camera.view, {
        x: camera.x + (sx - centre(camera)) * perPx,
        y: camera.y - (sy - camera.eyeRow) * perPx,
        z,
    });
}
