import { clamp } from "../composables/useGamesWorld.js";
import { STAIRS, wallFacing } from "./roomLayout.js";
import { mergeParts, paint } from "./streetGeometry.js";

/**
 * A room's stairs (issue #130): a door with `stairs: "up"` or `"down"` on a
 * side wall is drawn as a spiral staircase rather than a card, and the Butt
 * climbs it (climbPose()). Its wooden treads wind one turn round an iron
 * pole, starting on the room side and heading first toward the back wall.
 * Up, they climb to a round opening at the top of the walls (rooms have no
 * ceiling), under a handrail on balusters. Down, they wind down a round
 * stairwell in the floor, railed round its edge but for where you step
 * on. `THREE` is passed in, as in streetGeometry.js.
 */

// Up, the treads climb to this share of the walls' height, under the
// opening; down, each is this much lower than the last.
const UP_TOP = 0.88;
const DOWN_RISE = 16;
const POLE = 6; // the pole's radius
const TREAD = 5; // a tread's thickness
const RAIL = { height: 70, bar: 4, baluster: 2.5 };
// The opening at the top: its iron collar's depth. It reaches as far round
// as anything does (OUTER), up to its wall.
const COLLAR_DEPTH = 10;
const OUTER = STAIRS.radius + STAIRS.over;
// The well's edge, past the treads, and how much of its rim is left open
// to step on by (the angle round from where the treads start, either way:
// [before, after]).
const WELL_OVER = 3;
const ENTRANCE = [Math.PI / 6, Math.PI / 3];
// How far out from the pole the Butt climbs.
const PATH = (POLE + STAIRS.radius) / 2 + 6;
const WOOD = ["#b45309", "#a16207"]; // alternate treads
const IRON = "#1f2937";
const OPENING = "#0a0a0a";
const WELL_WALL = "#7c2d12"; // panelling down the well

/** The spiral's middle (its pole) on the floor: { x, z }, out from its wall. */
export function stairsMiddle(item) {
    const face = wallFacing(item.wall);
    // Its collar (OUTER) just meets the wall.
    const out = STAIRS.gap + STAIRS.radius;
    return { x: item.x + face.x * out, z: (item.z ?? 0) + face.z * out };
}

/** Where the treads start round the pole, as an angle in the floor's
 * (x, z), and which way they wind (+1 or -1): from the room side, first
 * toward the back wall. */
function winding(item) {
    const face = wallFacing(item.wall);
    return {
        start: Math.atan2(face.z, face.x),
        turn: face.x > 0 || face.z < 0 ? -1 : 1,
    };
}

/** The round hole a spiral down cuts in the floor: { x, z, r }. */
export function stairsWell(item) {
    return { ...stairsMiddle(item), r: STAIRS.radius + WELL_OVER };
}

/** The square on the floor the spiral stands in, in world units: { x0, x1,
 * z0, z1 } (x across, z from back to front). */
export function stairsFootprint(item) {
    const { x, z } = stairsMiddle(item);
    return { x0: x - OUTER, x1: x + OUTER, z0: z - OUTER, z1: z + OUTER };
}

/** The spiral as you see it, as a box in world units: its footprint, up to
 * the opening at the top of the walls going up, or to its rail going down
 * (the treads below the floor are hidden by it). Its button covers this. */
export function stairsBounds(item, wallHeight) {
    return {
        ...stairsFootprint(item),
        y0: 0,
        y1: item.stairs === "up" ? wallHeight : RAIL.height,
    };
}

/** How high (up) or low (down, below 0) the spiral goes, units. */
function stairsHeight(item, wallHeight) {
    return item.stairs === "up"
        ? wallHeight * UP_TOP
        : -DOWN_RISE * STAIRS.treads;
}

/** The point `t` of the way along the Butt's path round the spiral (0 at
 * the foot, on the room side; 1 at the top, or the bottom going down): {
 * x, z, lift }, lift being its height above (or below) the floor. It
 * passes over the middle of each tread at the tread's top. */
export function spiralPoint(item, t, wallHeight) {
    const { x, z } = stairsMiddle(item);
    const { start, turn } = winding(item);
    const angle = start + turn * Math.PI * 2 * t;
    return {
        x: x + PATH * Math.cos(angle),
        z: z + PATH * Math.sin(angle),
        lift: t * stairsHeight(item, wallHeight),
    };
}

// A climb's share spent walking from where the Butt stood onto the foot of
// the spiral, and the part of the way round it fades out over.
const STEP_ON = 0.2;
const FADE = [0.7, 1];

/**
 * Where the Butt is `s` of the way through climbing `item` (0 to 1) from
 * `from` ({ x, z }), in a room whose walls are `wallHeight` tall: { x, z,
 * lift, opacity }. It walks onto the foot, then winds round and up (or
 * down), fading out as it goes into the opening (or the well). Arriving by
 * the stairs is the same climb backwards (s from 1 to 0) to where it
 * stands.
 */
export function climbPose(item, from, s, wallHeight) {
    if (s < STEP_ON) {
        const foot = spiralPoint(item, 0, wallHeight);
        const k = s / STEP_ON;
        return {
            x: from.x + (foot.x - from.x) * k,
            z: from.z + (foot.z - from.z) * k,
            lift: 0,
            opacity: 1,
        };
    }
    const t = (s - STEP_ON) / (1 - STEP_ON);
    const fade = clamp((t - FADE[0]) / (FADE[1] - FADE[0]), 0, 1);
    return { ...spiralPoint(item, t, wallHeight), opacity: 1 - fade };
}

// A staircase's arrow badge in the overlay, px across (Room3D.vue's
// .stairs-arrow is sized by it), and how far in from the stage's edge it's kept while the
// stairs are off it.
export const ARROW_PX = 52;
const EDGE_PX = 12;

/**
 * A staircase's button on a stage `w` × `h` px, from the screen rectangle
 * it's drawn in (`drawn`: { left, top, width, height }, which may run off
 * the stage): { x, y (its feet), width, height, pinned }. It covers the
 * part on the stage; with too little there for its arrow (a long hall
 * scrolled away from it), it's just its arrow, `pinned` to the nearer
 * edge ("left" or "right"; null otherwise) by their foot, so the
 * way up or down can always be seen and tapped.
 */
export function stairsButton(drawn, { w, h }) {
    const left = Math.max(0, drawn.left);
    const right = Math.min(w, drawn.left + drawn.width);
    const top = Math.max(0, drawn.top);
    const bottom = Math.min(h, drawn.top + drawn.height);
    if (right - left >= ARROW_PX + EDGE_PX && bottom > top) {
        return {
            x: (left + right) / 2,
            y: bottom,
            width: right - left,
            height: bottom - top,
            pinned: null,
        };
    }
    const pinned = drawn.left + drawn.width / 2 < w / 2 ? "left" : "right";
    const inset = EDGE_PX + ARROW_PX / 2;
    // Level with the foot of the stairs, where the Butt walks to (and low
    // on the stage, below the music player's tab halfway down its edge).
    const level = clamp(bottom - ARROW_PX, inset, h - inset);
    return {
        x: pinned === "left" ? inset : w - inset,
        y: level + ARROW_PX / 2,
        width: ARROW_PX,
        height: ARROW_PX,
        pinned,
    };
}

/** An upright cylinder `r` round from y0 to y1, its middle at (x, z), in
 * `color`. */
function cylinder(THREE, color, r, [y0, y1], { x, z }, sides = 12) {
    return paint(
        THREE,
        new THREE.CylinderGeometry(r, r, y1 - y0, sides).translate(
            x,
            (y0 + y1) / 2,
            z
        ),
        color
    );
}

/** A square rod `thick` across from point `a` to point `b` ({ x, y, z }),
 * in `color`. */
function rod(THREE, color, a, b, thick) {
    const along = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    const geometry = new THREE.BoxGeometry(thick, thick, along.length())
        .applyQuaternion(
            new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                along.normalize()
            )
        )
        .translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return paint(THREE, geometry, color);
}

/** A tread: a slice of a ring from the pole out to the spiral's edge,
 * between angles `a` and `b` round its middle, its top at `top`. */
function tread(THREE, color, middle, [a, b], top) {
    const [from, to] = a < b ? [a, b] : [b, a];
    const [r0, r1] = [POLE, STAIRS.radius];
    // Drawn in the floor's (x, z), as the shape's (x, y), then laid flat
    // so its thickness hangs down from y = 0.
    const shape = new THREE.Shape();
    shape.moveTo(r0 * Math.cos(from), r0 * Math.sin(from));
    shape.lineTo(r1 * Math.cos(from), r1 * Math.sin(from));
    shape.absarc(0, 0, r1, from, to, false);
    shape.lineTo(r0 * Math.cos(to), r0 * Math.sin(to));
    shape.absarc(0, 0, r0, to, from, true);
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: TREAD,
        bevelEnabled: false,
        curveSegments: 4,
    })
        .rotateX(Math.PI / 2)
        .translate(middle.x, top, middle.z);
    return paint(THREE, geometry, color);
}

/** Adds to `parts` a baluster standing on each of `feet` ({ x, y, z }) and
 * a rail along their tops, from each to the next. */
function railing(THREE, parts, feet) {
    const tops = feet.map((at) => ({ ...at, y: at.y + RAIL.height }));
    feet.forEach((at, i) => {
        parts.push(
            cylinder(THREE, IRON, RAIL.baluster, [at.y, tops[i].y], at, 6)
        );
        if (i > 0) parts.push(rod(THREE, IRON, tops[i - 1], tops[i], RAIL.bar));
    });
}

/** The point `r` out from `middle` at `angle` round it, `y` up. */
const round = (middle, r, angle, y) => ({
    x: middle.x + r * Math.cos(angle),
    y,
    z: middle.z + r * Math.sin(angle),
});

/** An open tube `r` round from y0 to y1, its middle at (x, z), in `color`,
 * seen from inside: the well's lining. */
function lining(THREE, color, r, [y0, y1], { x, z }) {
    const geometry = paint(
        THREE,
        new THREE.CylinderGeometry(r, r, y1 - y0, 32, 1, true),
        color
    );
    // Turned inside out: each face wound the other way, its normal in.
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    for (let i = 0; i < position.count; i += 3) {
        for (const attribute of [position, normal]) {
            const [ax, ay, az] = [
                attribute.getX(i + 1),
                attribute.getY(i + 1),
                attribute.getZ(i + 1),
            ];
            attribute.setXYZ(
                i + 1,
                attribute.getX(i + 2),
                attribute.getY(i + 2),
                attribute.getZ(i + 2)
            );
            attribute.setXYZ(i + 2, ax, ay, az);
        }
    }
    for (let i = 0; i < normal.count; i += 1) {
        normal.setXYZ(i, -normal.getX(i), -normal.getY(i), -normal.getZ(i));
    }
    return geometry.translate(x, (y0 + y1) / 2, z);
}

/** The stairs for door `item`, in a room whose walls are `wallHeight`
 * tall, as one geometry in world space with its colours in its vertices. */
export function stairsGeometry(THREE, item, wallHeight) {
    const middle = stairsMiddle(item);
    const { start, turn } = winding(item);
    const up = item.stairs === "up";
    const n = STAIRS.treads;
    const rise = stairsHeight(item, wallHeight) / n;
    const step = (Math.PI * 2) / n;
    const parts = [];

    // Tread i spans the i-th slice of the turn, its top where the Butt's
    // path crosses its middle (spiralPoint()).
    for (let i = 0; i < n; i += 1) {
        const a = start + turn * step * i;
        parts.push(
            tread(
                THREE,
                WOOD[i % 2],
                middle,
                [a, a + turn * step],
                (i + 0.5) * rise
            )
        );
    }

    const bottom = up ? 0 : rise * (n + 1);
    if (up) {
        // The pole, up into the opening; a baluster at the outer edge of
        // each tread, and the handrail winding from one to the next.
        parts.push(cylinder(THREE, IRON, POLE, [0, wallHeight], middle));
        const edge = STAIRS.radius - 3;
        railing(
            THREE,
            parts,
            Array.from({ length: n }, (_, i) =>
                round(
                    middle,
                    edge,
                    start + turn * step * (i + 0.5),
                    (i + 0.5) * rise
                )
            )
        );
        // The opening at the top of the walls: dark, in an iron collar.
        parts.push(
            cylinder(
                THREE,
                OPENING,
                OUTER - 4,
                [wallHeight - 2, wallHeight],
                middle,
                32
            ),
            cylinder(
                THREE,
                IRON,
                OUTER,
                [wallHeight - COLLAR_DEPTH, wallHeight - 2],
                middle,
                32
            )
        );
    } else {
        // The well: lined, with a floor at its bottom, so you never see
        // past its treads into the space under the room.
        const well = stairsWell(item);
        parts.push(
            lining(THREE, WELL_WALL, well.r, [bottom, 0], middle),
            cylinder(
                THREE,
                WELL_WALL,
                well.r,
                [bottom - 2, bottom],
                middle,
                32
            ),
            cylinder(THREE, IRON, POLE, [bottom, RAIL.height + 6], middle)
        );
        // A rail round the rim on posts, open on the room side, where the
        // treads start.
        const rim = well.r + 2;
        const from = start - turn * ENTRANCE[0];
        const span = Math.PI * 2 - ENTRANCE[0] - ENTRANCE[1];
        const posts = 9;
        railing(
            THREE,
            parts,
            Array.from({ length: posts + 1 }, (_, k) =>
                round(middle, rim, from - (turn * span * k) / posts, 0)
            )
        );
    }

    return mergeParts(THREE, parts);
}

/**
 * A room's floor, `width` × `depth`, lying on y = 0 with its texture across
 * it as a plain plane's would be, with `wells` (stairsWell()s) cut out.
 */
export function floorGeometry(THREE, width, depth, wells = []) {
    if (wells.length === 0) {
        return new THREE.PlaneGeometry(width, depth)
            .rotateX(-Math.PI / 2)
            .translate(width / 2, 0, depth / 2);
    }
    // Drawn in x, -z, then laid flat: the shape's y is the room's -z.
    const shape = new THREE.Shape();
    shape.moveTo(0, -depth);
    shape.lineTo(width, -depth);
    shape.lineTo(width, 0);
    shape.lineTo(0, 0);
    shape.closePath();
    shape.holes = wells.map((w) => {
        const hole = new THREE.Path();
        hole.absarc(w.x, -w.z, w.r, 0, Math.PI * 2, false);
        return hole;
    });
    const geometry = new THREE.ShapeGeometry(shape, 24).rotateX(-Math.PI / 2);
    // UVs across the whole floor, 0..1, as a PlaneGeometry has them.
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) {
        uv.setXY(i, position.getX(i) / width, 1 - position.getZ(i) / depth);
    }
    return geometry;
}
