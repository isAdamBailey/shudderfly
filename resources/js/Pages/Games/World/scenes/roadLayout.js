import { clamp } from "../composables/useGamesWorld.js";
import { groundZAtRow } from "../composables/projection.js";
import { jitter } from "@/utils/math";

/**
 * Where everything on the WebGL road goes, as pure numbers (issue #130). The
 * street is seen side-on from above and in front: from the back, the ridge,
 * a mid-distance row of trees and houses, the far side's buildings and its
 * pavement (where the roadside foods stand), the road, the near pavement, and
 * the near side's buildings and props. The Butt walks the pavement on either
 * side (its lanes). Everything is placed by the stage row it stands on, so
 * the street fills any stage the same way.
 *
 * World units are road px: the Butt's far lane is the plane z = 0, drawn at
 * 1 px per unit, so a road x is the same number it always was and
 * useGamesWorld's camera, deadzone and snap work unchanged.
 */

// Rows as fractions of the stage height, from the top.
export const ROWS = {
    horizon: 0.42, // where the ground meets the ridge
    mid: 0.44, // the mid-distance trees and houses' feet
    buildings: 0.5, // the far side's building fronts
    idlers: [0.52, 0.55, 0.58], // the roadside foods' feet, back to front
    far: 0.6, // the Butt's feet on the far pavement
    roadFar: 0.625, // the road's far kerb
    roadToot: 0.67, // a toot cloud drifting along the road
    manhole: 0.75, // the manholes, in the road's near half
    roadNear: 0.8, // the road's near kerb
    near: 0.86, // the Butt's feet on the near pavement
    nearBuildings: 0.95, // the near side's buildings and props
};

// The screen row level with the camera's eye: where the ground would meet
// the sky if it went on for ever. Lower gives the street more depth.
const EYE_ROW = 0.1;
// Focal length, in stage heights. Longer flattens the depth (the sides of
// buildings show less); shorter exaggerates it.
const FOCAL = 2.2;
// The ridge sits this many focal lengths away, so it scrolls at 1/4 of the
// road's speed, as the flat road's ridge did.
export const RIDGE_DEPTH = 4;
// The drifters (clouds, snow) ride with the camera this far away.
export const DRIFTER_DEPTH = 3;
// World units the camera shifts at full tilt peek. The lens shifts back by
// the same amount, so the Butt's plane holds still and the distance moves.
const PEEK = { x: 12, y: 6 };

// On-screen sizes, as the flat road's CSS clamp()s: [min px, share, max px]
// of the viewport's vmin (characters) or of the stage height (buildings,
// which have to fit between the sky and the street).
const SIZES = {
    butt: [52, 0.13, 88],
    idler: [32, 0.07, 52],
    building: [100, 0.24, 200], // far side, front wall
    nearBuilding: [70, 0.17, 140],
    mid: [36, 0.09, 80],
};
// A roof's height, as a share of its building's height to the eaves.
export const ROOF = 0.38;
// The flat road's drifter spots: rows and columns as stage shares, px size.
export const DRIFTERS = { count: 4, size: 38, drift: 60, period: 18 };

/** A share of `px`, clamped: [min px, share, max px]. */
export const screenSize = ([min, share, max], px) =>
    clamp(px * share, min, max);

/** The road's geometry for a stage `w` × `h` px, sizing characters by the
 * viewport's `vmin` px as the flat road's CSS did. */
export function roadLayout({ w, h, vmin }) {
    const focal = FOCAL * h;
    const eyeRow = EYE_ROW * h;
    const cameraY = (ROWS.far - EYE_ROW) * h;
    const base = { x: 0, y: cameraY, z: focal, focal, eyeRow, w, h };
    const zAt = (row) => groundZAtRow(base, row * h);
    /** px per world unit at depth z. */
    const scaleAt = (z) => focal / (focal - z);
    /** World units that come out at `px` on screen at depth z. */
    const units = (px, depth) => px / scaleAt(depth);

    const z = {
        horizon: zAt(ROWS.horizon),
        mid: zAt(ROWS.mid),
        buildings: zAt(ROWS.buildings),
        idlers: ROWS.idlers.map(zAt),
        far: 0,
        roadFar: zAt(ROWS.roadFar),
        roadNear: zAt(ROWS.roadNear),
        near: zAt(ROWS.near),
        nearBuildings: zAt(ROWS.nearBuildings),
        roadToot: zAt(ROWS.roadToot),
        manhole: zAt(ROWS.manhole),
        ridge: focal * (1 - RIDGE_DEPTH),
    };

    const sizes = {
        butt: screenSize(SIZES.butt, vmin),
        idlers: z.idlers.map((depth) =>
            units(screenSize(SIZES.idler, vmin), depth)
        ),
        building: units(screenSize(SIZES.building, h), z.buildings),
        nearBuilding: units(screenSize(SIZES.nearBuilding, h), z.nearBuildings),
        mid: units(screenSize(SIZES.mid, h), z.mid),
    };

    /** World units per screen px for an idler in `row`: useRoad hands the
     * idlers' toss offsets over in screen px. */
    const idlerPerPx = (row) => 1 / scaleAt(z.idlers[row]);

    /** The depth the Butt walks at in `lane` (0 far … 1 near). */
    const laneZ = (lane) => lane * z.near;

    /** Which side of the street a point on the ground at depth `depth` is. */
    const sideAt = (depth) => (depth > z.near / 2 ? "near" : "far");

    return {
        w,
        h,
        focal,
        eyeRow,
        cameraY,
        z,
        sizes,
        scaleAt,
        idlerPerPx,
        laneZ,
        sideAt,
    };
}

/** A building on the street, in world units: its front's middle at (x, z),
 * `width` × `height` to the eaves, `depth` back from the front, and `roof`
 * above the eaves. The far side's stand back from the road; the near side's
 * are smaller and face the camera. Sizes vary a little by x, the same every
 * visit. */
export function buildingBox(L, { x, side = "far" }) {
    const near = side === "near";
    const height =
        (near ? L.sizes.nearBuilding : L.sizes.building) *
        (0.9 + jitter(x) * 0.2);
    const width = height * (0.95 + jitter(x + 3) * 0.25);
    return {
        x,
        z: near ? L.z.nearBuildings : L.z.buildings,
        width,
        height,
        depth: width * (near ? 0.45 : 0.7),
        roof: height * ROOF,
    };
}

/** The projection.js camera for the road: following useGamesWorld's
 * camera.x (the left edge of the view on the Butt's plane), shifted by the
 * tilt peek (each -1..1). `butt` ({ x, z }) is where the Butt is: off the far
 * lane its depth magnifies its distance from the middle of the screen, so
 * the camera slides to keep it at the screen x the flat road (and
 * useGamesWorld's deadzone) would, and the peek holds its depth still. */
export function roadCamera(layout, cameraX, peekX = 0, peekY = 0, butt = null) {
    const dx = peekX * PEEK.x;
    const dy = -peekY * PEEK.y;
    const half = layout.w / 2;
    const scale = butt ? layout.scaleAt(butt.z) : 1;
    const centre = butt
        ? butt.x - (butt.x - cameraX - half) / scale
        : cameraX + half;
    return {
        x: centre + dx,
        y: layout.cameraY + dy,
        z: layout.focal,
        focal: layout.focal,
        // Shifted back as far as the peek moved the Butt, at its depth.
        eyeRow: layout.eyeRow - dy * scale,
        lensX: dx * scale,
        w: layout.w,
        h: layout.h,
    };
}
