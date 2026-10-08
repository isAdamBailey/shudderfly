import { clamp } from "../composables/useGamesWorld.js";
import { groundZAtRow } from "../composables/projection.js";
import { IDLER_ROWS } from "../composables/useRoad.js";

/**
 * Where everything on the WebGL road goes, as pure numbers (issue #130). The
 * road keeps the flat road's layout: the same rows of the stage for the
 * horizon, the landmarks, the roadside idlers and the Butt, at the same
 * on-screen sizes. Depth comes from where each row falls on the ground.
 *
 * World units are road px: the Butt walks the plane z = 0, which is drawn at
 * 1 px per unit, so a road x is the same number it always was and
 * useGamesWorld's camera, deadzone and snap work unchanged.
 */

// Rows as fractions of the stage height, from the top.
export const ROWS = {
    horizon: 0.6, // where the ground meets the ridge
    landmark: 0.61, // the landmarks' feet
    idlers: [0.64, 0.68, 0.72], // the idlers' feet, by row back from the road
    butt: 0.78, // the Butt's feet
    roadNear: 0.86, // the near edge of the road
};

// Focal length, in stage heights. Longer flattens the depth; shorter
// exaggerates it.
const FOCAL = 2.2;
// The ridge sits this many focal lengths away, so it scrolls at 1/4 of the
// road's speed, as the flat road's ridge did.
export const RIDGE_DEPTH = 4;
// The drifters (clouds, snow) ride with the camera this far away.
export const DRIFTER_DEPTH = 3;
// World units the camera shifts at full tilt peek. The lens shifts back by
// the same amount, so the Butt's plane holds still and the distance moves.
const PEEK = { x: 12, y: 6 };

// On-screen sizes, as the flat road's CSS clamp()s: [min px, vmin share,
// max px].
const SIZES = {
    butt: [52, 0.13, 88],
    idler: [32, 0.07, 52],
    landmark: [80, 0.2, 144],
};
// The flat road's drifter spots: rows and columns as stage shares, px size.
export const DRIFTERS = { count: 4, size: 38, drift: 60, period: 18 };

const screenSize = ([min, share, max], vmin) => clamp(vmin * share, min, max);

/** The road's geometry for a stage `w` × `h` px, sizing things by the
 * viewport's `vmin` px as the flat road's CSS did. */
export function roadLayout({ w, h, vmin }) {
    const focal = FOCAL * h;
    const eyeRow = 0;
    const cameraY = ROWS.butt * h;
    const base = { x: 0, y: cameraY, z: focal, focal, eyeRow, w, h };
    const zAt = (row) => groundZAtRow(base, row * h);
    /** px per world unit at depth z. */
    const scaleAt = (z) => focal / (focal - z);

    const z = {
        horizon: zAt(ROWS.horizon),
        landmark: zAt(ROWS.landmark),
        idlers: ROWS.idlers.slice(0, IDLER_ROWS).map(zAt),
        butt: 0,
        roadNear: zAt(ROWS.roadNear),
        ridge: focal * (1 - RIDGE_DEPTH),
    };

    // World sizes that come out at the flat road's px at each depth.
    const sizes = {
        butt: screenSize(SIZES.butt, vmin),
        idlers: z.idlers.map(
            (depth) => screenSize(SIZES.idler, vmin) / scaleAt(depth)
        ),
        landmark: screenSize(SIZES.landmark, vmin) / scaleAt(z.landmark),
    };

    return { w, h, focal, eyeRow, cameraY, z, sizes, scaleAt };
}

/** The projection.js camera for the road: following useGamesWorld's
 * camera.x (the left edge of the view on the Butt's plane), shifted by the
 * tilt peek (each -1..1). */
export function roadCamera(layout, cameraX, peekX = 0, peekY = 0) {
    const dx = peekX * PEEK.x;
    const dy = -peekY * PEEK.y;
    return {
        x: cameraX + layout.w / 2 + dx,
        y: layout.cameraY + dy,
        z: layout.focal,
        focal: layout.focal,
        eyeRow: layout.eyeRow - dy,
        lensX: dx,
        w: layout.w,
        h: layout.h,
    };
}
