import { STAIRS, wallFacing } from "./roomLayout.js";
import { box, mergeParts } from "./streetGeometry.js";

/**
 * A room's stairs (issue #130): a door with `stairs: "up"` or `"down"` on a
 * side wall is drawn as a real flight rather than a card. Up is a run of
 * wooden steps along the wall, rising toward the back of the room under a
 * handrail. Down is a stairwell: an opening in the floor along the wall,
 * railed on the room side, its steps going down from the back toward the
 * front, so the camera looks onto them (a flight going down away from it
 * would be hidden under the floor). `THREE` is passed in, as in
 * streetGeometry.js.
 */

// A step down into the stairwell is this tall; up, the flight climbs to
// this share of the walls' height, under the ceiling edge.
const DOWN_RISE = 16;
const UP_TOP = 0.88;
const RAIL = { height: 70, post: 5, bar: 4 };
const WOOD = ["#b45309", "#a16207"]; // alternate steps
const RAIL_WOOD = "#451a03";
const WELL_WALL = "#7c2d12"; // panelling down the well

/** Where the flight lies on the floor, in world units: { x0, x1, z0, z1 }
 * (x across, z from back to front). A down flight's opening in the floor. */
export function stairsFootprint(item) {
    const edge = item.x + wallFacing(item.wall).x * STAIRS.width;
    return {
        x0: Math.min(item.x, edge),
        x1: Math.max(item.x, edge),
        z0: item.z - STAIRS.run / 2,
        z1: item.z + STAIRS.run / 2,
    };
}

/** The stairs for door `item`, in a room whose walls are `wallHeight`
 * tall, as one geometry in world space with its colours in its vertices. */
export function stairsGeometry(THREE, item, wallHeight) {
    const { x0, x1, z0, z1 } = stairsFootprint(item);
    const up = item.stairs === "up";
    const tread = STAIRS.run / STAIRS.steps;
    const rise = up ? (wallHeight * UP_TOP) / STAIRS.steps : DOWN_RISE;
    const bottom = -rise * (STAIRS.steps + 1);
    const across = x1 - x0;
    const mid = (x0 + x1) / 2;
    // The room side of the flight, where the rail runs.
    const railX = wallFacing(item.wall).x < 0 ? x0 + RAIL.post : x1 - RAIL.post;
    const parts = [];

    // Step i is the i-th from where the flight starts: up, i treads back
    // from the front edge, solid from the floor to its top; down, i treads
    // forward from the back, from the bottom of the well to its top.
    for (let i = 0; i < STAIRS.steps; i += 1) {
        const top = up ? (i + 1) * rise : -(i + 1) * rise;
        const base = up ? 0 : bottom;
        const z = up ? z1 - (i + 0.5) * tread : z0 + (i + 0.5) * tread;
        parts.push(
            box(
                THREE,
                WOOD[i % 2],
                [across, top - base, tread],
                [mid, (top + base) / 2, z]
            )
        );
    }

    const post = (z, y) =>
        box(
            THREE,
            RAIL_WOOD,
            [RAIL.post, RAIL.height, RAIL.post],
            [railX, y + RAIL.height / 2, z]
        );

    if (up) {
        // Posts on the bottom and top steps, a rail sloping between them.
        const first = z1 - tread / 2;
        const last = z0 + tread / 2;
        const fall = (STAIRS.steps - 1) * rise;
        parts.push(post(first, rise), post(last, rise * STAIRS.steps));
        const length = Math.hypot(first - last, fall);
        parts.push(
            box(THREE, RAIL_WOOD, [RAIL.bar, RAIL.bar, length], [0, 0, 0])
                .rotateX(Math.atan2(fall, first - last))
                .translate(
                    railX,
                    rise + RAIL.height + fall / 2,
                    (first + last) / 2
                )
        );
    } else {
        // The well's four walls, so you never see past its steps into the
        // space under the floor.
        const lining = 4;
        const wall = (size, x, z) =>
            box(THREE, WELL_WALL, size, [x, bottom / 2, z]);
        parts.push(
            wall([across, -bottom, lining], mid, z0 + lining / 2),
            wall([across, -bottom, lining], mid, z1 - lining / 2),
            wall([lining, -bottom, STAIRS.run], x0 + lining / 2, item.z),
            wall([lining, -bottom, STAIRS.run], x1 - lining / 2, item.z)
        );
        // A level rail along the opening's room side, on posts; the back
        // is left open, where you step down.
        const from = z0 + tread;
        const end = z1 - RAIL.post;
        for (let n = 0; n <= 3; n += 1) {
            parts.push(post(from + ((end - from) * n) / 3, 0));
        }
        parts.push(
            box(
                THREE,
                RAIL_WOOD,
                [RAIL.bar, RAIL.bar, z1 - from],
                [railX, RAIL.height, (from + z1) / 2]
            )
        );
    }

    return mergeParts(THREE, parts);
}

/**
 * A room's floor, `width` × `depth`, lying on y = 0 with its texture across
 * it as a plain plane's would be, with `wells` (stairsFootprint()s) cut out.
 */
export function floorGeometry(THREE, width, depth, wells = []) {
    if (wells.length === 0) {
        return new THREE.PlaneGeometry(width, depth)
            .rotateX(-Math.PI / 2)
            .translate(width / 2, 0, depth / 2);
    }
    // Drawn in x, -z, then laid flat: the shape's y is the room's -z.
    const rect = (x0, x1, z0, z1) => {
        const path = new THREE.Path();
        path.moveTo(x0, -z1);
        path.lineTo(x1, -z1);
        path.lineTo(x1, -z0);
        path.lineTo(x0, -z0);
        path.closePath();
        return path;
    };
    const shape = new THREE.Shape(rect(0, width, 0, depth).getPoints());
    shape.holes = wells.map((w) => rect(w.x0, w.x1, w.z0, w.z1));
    const geometry = new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
    // UVs across the whole floor, 0..1, as a PlaneGeometry has them.
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) {
        uv.setXY(i, position.getX(i) / width, 1 - position.getZ(i) / depth);
    }
    return geometry;
}
