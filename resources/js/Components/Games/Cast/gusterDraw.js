/*
 * Guster (issue #164) as a solid figure, seen almost from the front and a
 * little from above. No Three.js and no Vue: the DOM paints GUSTER_SVG and
 * WebGL builds `gusterParts()` with the same view.
 *
 * He has no limbs, so he has no rig: he is one rigid body, and his moves
 * (idle, bounce, toot) squash and lift the whole of him, as they do an emoji.
 *
 * Parts are ellipsoids in figure space before the view turn: y up, his flat
 * base on y = 0, his face toward +z, about one unit tall. His right is -x
 * (the viewer's left). Body parts are glossy blobs that make one smooth,
 * soft cloud: a broad core on a wide bottom, gentle lobes up his sides, and
 * a dome that rounds into one thin stem leaning to his left. Face parts sit
 * on the core's front: two uneven eyes with small dot pupils, worried brows
 * that flatten their tops, and one wide grimace: teeth cut straight by his
 * lip above and scalloped below, its corners creased up into his cheeks.
 */

import { GUSTER_COLORS } from "@/constants/characters.js";
import { boundsOf, project as projectTo } from "./figureView.js";

/** Degrees. A small yaw shows his rounded side; a slight pitch looks onto
 * his top, near enough level to meet his eyes. */
export const GUSTER_VIEW = Object.freeze({ yaw: -10, pitch: 4, focal: 3 });

const GUSTER_LIGHT = { x: -0.32, y: 0.46 };
const DEG = Math.PI / 180;

/**
 * A glossy body part. `rim: false` leaves it out of his dark outline (his
 * smooth bottom has none); `gloss` is a shiny streak on it, as shares of its
 * radii from its centre: the DOM paints it, WebGL gets its shine from the
 * light.
 */
const blob = (
    x,
    y,
    z,
    rx,
    ry,
    rz,
    { color = GUSTER_COLORS.body, rot = 0, rim = true, gloss = null } = {}
) => ({
    type: "blob",
    x,
    y,
    z,
    rx,
    ry,
    rz,
    rot,
    color,
    glossy: true,
    rim,
    gloss,
});

const BODY = [
    // A soft cloud: one wide, smooth bottom on a flat base, broadest low
    // down like a pear, and lobes above it tucked mostly inside his core, so
    // his outline only swells gently.
    blob(0, 0.07, 0.03, 0.3, 0.07, 0.26, {
        color: GUSTER_COLORS.mid,
        rim: false,
    }),
    blob(0, 0.45, 0, 0.46, 0.43, 0.34),
    blob(0, 0.26, 0.03, 0.5, 0.26, 0.33, {
        color: GUSTER_COLORS.mid,
        rim: false,
    }),
    // Side lobes.
    blob(-0.24, 0.42, 0, 0.24, 0.27, 0.23),
    blob(0.25, 0.43, 0, 0.24, 0.27, 0.23),
    // Shoulders, narrower; a soft glint on his left one.
    blob(-0.17, 0.65, 0, 0.22, 0.18, 0.21),
    blob(0.18, 0.66, 0, 0.21, 0.17, 0.2, {
        gloss: { x: 0.05, y: 0.45, rx: 0.4, ry: 0.2, rot: -20 },
    }),
    // The dome, rounding up into one thin stem, like a garlic bulb's, that
    // leans a little to his left. A long glint runs down the stem.
    blob(0.01, 0.71, -0.02, 0.34, 0.21, 0.26, {
        gloss: { x: -0.25, y: 0.45, rx: 0.3, ry: 0.15, rot: 12 },
    }),
    blob(0.035, 0.84, -0.04, 0.15, 0.12, 0.13),
    blob(0.055, 0.94, -0.05, 0.055, 0.09, 0.05, {
        rot: -6,
        gloss: { x: -0.3, y: 0.1, rx: 0.3, ry: 0.8, rot: -4 },
    }),
    blob(0.072, 1.02, -0.05, 0.036, 0.08, 0.032, {
        rot: -10,
        gloss: { x: -0.3, y: 0, rx: 0.3, ry: 0.8, rot: -8 },
    }),
    blob(0.088, 1.08, -0.05, 0.022, 0.045, 0.02, { rot: -16 }),
];

/** How far forward his body's front is at (x, y): the nearest of his
 * blobs there, seen straight on. */
export function gusterFront(x, y) {
    let front = -Infinity;
    for (const part of BODY) {
        const k =
            1 - ((x - part.x) / part.rx) ** 2 - ((y - part.y) / part.ry) ** 2;
        if (k >= 0) front = Math.max(front, part.z + part.rz * Math.sqrt(k));
    }
    return front;
}

/** A flat feature on his body's front, poking out by most of its `depth`
 * (and `out` more). A wide one takes a deep `depth`, and a matching
 * negative `out`, so its ends sink into his curve rather than float off it.
 * `glossy` ones are body-coloured and glossed like his body. */
function feature(
    type,
    x,
    y,
    rx,
    ry,
    rot,
    color,
    { depth = 0.03, out = 0, glossy = false } = {}
) {
    return {
        type,
        x,
        y,
        z: gusterFront(x, y) - depth * 0.4 + out,
        rx,
        ry,
        rz: depth,
        rot,
        color,
        glossy,
    };
}

function eyeParts(eye, look, browTilt) {
    const white = feature(
        "eye",
        eye.x,
        eye.y,
        eye.rx,
        eye.ry,
        eye.rot,
        GUSTER_COLORS.eyeWhite
    );
    // A small dot in the upper half, `look` of the way toward his nose: he
    // looks up and out at you.
    const pupil = feature(
        "pupil",
        eye.x + look * eye.rx,
        eye.y + eye.ry * 0.22,
        eye.rx * 0.17,
        eye.rx * 0.17,
        0,
        GUSTER_COLORS.pupil,
        { depth: 0.02, out: 0.02 }
    );
    // Over the eye's top: it flattens it and slants it, the inner end
    // higher, for the worried look.
    const brow = feature(
        "brow",
        eye.x,
        eye.y + eye.ry + 0.03,
        eye.rx * 1.3,
        0.05,
        browTilt,
        GUSTER_COLORS.body,
        { depth: 0.04, out: 0.012, glossy: true }
    );
    return [white, pupil, brow];
}

const MOUTH = { x: 0.005, y: 0.37, rx: 0.17 };

function mouthParts() {
    // One wide grimace: a shade gap behind a white bar of teeth, its
    // bottom edge scalloped by a row of uneven bumps.
    const gap = feature(
        "mouth",
        MOUTH.x,
        MOUTH.y - 0.002,
        MOUTH.rx + 0.008,
        0.036,
        0,
        GUSTER_COLORS.shade,
        { depth: 0.06, out: -0.021 }
    );
    const bar = feature(
        "tooth",
        MOUTH.x,
        MOUTH.y + 0.008,
        MOUTH.rx,
        0.036,
        0,
        GUSTER_COLORS.teeth,
        { depth: 0.06, out: -0.014 }
    );
    const bumps = [
        [-0.125, 0.026, 0.024],
        [-0.065, 0.032, 0.03],
        [-0.005, 0.03, 0.027],
        [0.055, 0.033, 0.031],
        [0.115, 0.027, 0.023],
    ].map(([dx, rx, ry]) =>
        feature(
            "tooth",
            MOUTH.x + dx,
            MOUTH.y - 0.012,
            rx,
            ry,
            0,
            GUSTER_COLORS.teeth,
            { depth: 0.02, out: 0.01 }
        )
    );
    // His upper lip, over the top of the teeth: it cuts their top edge
    // straight.
    const lip = feature(
        "lip",
        MOUTH.x,
        MOUTH.y + 0.052,
        MOUTH.rx + 0.05,
        0.03,
        0,
        GUSTER_COLORS.body,
        { depth: 0.08, out: -0.01, glossy: true }
    );
    // The corners curl up and out into his cheeks, a nervous smile.
    const creases = [-1, 1].map((side) =>
        feature(
            "crease",
            MOUTH.x + side * (MOUTH.rx + 0.012),
            MOUTH.y + 0.03,
            0.007,
            0.03,
            -side * 35,
            GUSTER_COLORS.shade,
            { depth: 0.02, out: 0.016 }
        )
    );
    return [gap, bar, ...bumps, lip, ...creases];
}

function faceParts() {
    // His right eye (the viewer's left) is the larger and rounder, its
    // pupil in the middle; his left is flatter, its pupil toward his nose.
    const right = eyeParts(
        { x: -0.13, y: 0.54, rx: 0.115, ry: 0.09, rot: 6 },
        0.05,
        14
    );
    const left = eyeParts(
        { x: 0.135, y: 0.525, rx: 0.09, ry: 0.07, rot: -6 },
        -0.2,
        -12
    );
    // Drawn in this order: the mouth, then both eyes' whites, pupils and
    // brows.
    return [...mouthParts(), ...[0, 1, 2].flatMap((i) => [right[i], left[i]])];
}

/** Guster's body and face in figure space, before the view turn. */
export function gusterParts() {
    return { body: BODY, face: faceParts() };
}

function project(part) {
    const p = projectTo(part, GUSTER_VIEW);
    const yaw = GUSTER_VIEW.yaw * DEG;
    const pitch = GUSTER_VIEW.pitch * DEG;
    // The outline of a turned ellipsoid, near enough for a small turn.
    const rx = Math.hypot(part.rx * Math.cos(yaw), part.rz * Math.sin(yaw));
    const ry = Math.hypot(part.ry * Math.cos(pitch), part.rz * Math.sin(pitch));
    return {
        type: part.type,
        x: p.x,
        y: p.y,
        z: p.z,
        rx: rx * p.scale,
        ry: ry * p.scale,
        rot: part.rot,
        color: part.color,
        glossy: Boolean(part.glossy),
    };
}

// The thin dark edge round his outline, in figure units: enough to keep
// him apart from a green background, no more.
const RIM = 0.005;

/** Projected shapes, his base on y = 0, back to front: a dark rim round
 * his outline (but his bottom), the body blobs far to near, the gloss
 * streaks, then his face in a fixed order. Shapes marked `glossy` (the body
 * blobs, his brows and lip) are all painted with one gloss, GUSTER_GLOSS, so
 * they read as one lumpy body; the rest are flat `color`. */
function gusterShapes() {
    const { body, face } = gusterParts();
    const parts = body.map((part) => [part, project(part)]);
    const blobs = parts.map(([, shape]) => shape).sort((a, b) => a.z - b.z);
    const rims = parts
        .filter(([part]) => part.rim)
        .map(([, shape]) => ({
            ...shape,
            type: "rim",
            rx: shape.rx + RIM,
            ry: shape.ry + RIM,
            color: GUSTER_COLORS.shade,
            glossy: false,
        }));
    const gloss = parts
        .filter(([part]) => part.gloss)
        .map(([{ gloss: spot }, shape]) => ({
            type: "gloss",
            x: shape.x + shape.rx * spot.x,
            y: shape.y + shape.ry * spot.y,
            z: shape.z,
            rx: shape.rx * spot.rx,
            ry: shape.ry * spot.ry,
            rot: spot.rot,
            color: GUSTER_COLORS.highlight,
            glossy: false,
        }));
    const shapes = [...rims, ...blobs, ...gloss, ...face.map(project)];

    const ground = Math.min(...blobs.map((shape) => shape.y - shape.ry));
    for (const shape of shapes) shape.y -= ground;
    return shapes;
}

export const GUSTER_SHAPES = Object.freeze(gusterShapes());
export const GUSTER_FRAME = Object.freeze(boundsOf(GUSTER_SHAPES));

/** The one radial gloss his body blobs share, lit from the upper left, in
 * the shapes' space (y up). */
export const GUSTER_GLOSS = Object.freeze({
    cx: GUSTER_FRAME.minX + GUSTER_FRAME.width * (0.5 + GUSTER_LIGHT.x * 0.5),
    cy: GUSTER_FRAME.minY + GUSTER_FRAME.height * (0.5 + GUSTER_LIGHT.y * 0.5),
    r: GUSTER_FRAME.height * 0.8,
    stops: [
        [0, GUSTER_COLORS.highlight],
        [0.3, GUSTER_COLORS.body],
        [0.75, GUSTER_COLORS.mid],
        [1, GUSTER_COLORS.shade],
    ],
});

const round = (n) => Number(n.toFixed(3));

const ellipses = GUSTER_SHAPES.map((shape, index) => {
    const [cx, cy] = [round(shape.x), round(shape.y)];
    return Object.freeze({
        type: shape.type,
        cx,
        cy,
        rx: round(shape.rx),
        ry: round(shape.ry),
        transform: shape.rot ? `rotate(${shape.rot} ${cx} ${cy})` : null,
        opacity: shape.type === "gloss" ? 0.55 : null,
        // A rotated part fills in its own turned space, so it takes a copy
        // of the gloss turned back the other way, or it wouldn't match the
        // body next to it.
        gloss: shape.glossy ? (shape.rot ? `-${index}` : "") : null,
        color: shape.color,
    });
});

/**
 * Guster as SVG, worked out once for both his drawers (GusterGlyph.vue and
 * gusterSvgMarkup()): the `viewBox`, the `flip` that turns his y-up shapes
 * the SVG way up, his width per unit of height (`aspect`), the `glosses`
 * (GUSTER_GLOSS, and a turned copy per rotated glossy part: an id `suffix`
 * and a `transform`), and an `ellipses` attribute list in paint order. An
 * ellipse's `gloss` is the suffix of the gloss it fills with, each drawing
 * naming the ids; with none it fills with `color`.
 */
export const GUSTER_SVG = Object.freeze({
    viewBox: [
        GUSTER_FRAME.minX,
        GUSTER_FRAME.minY,
        GUSTER_FRAME.width,
        GUSTER_FRAME.height,
    ]
        .map(round)
        .join(" "),
    flip: `translate(0 ${round(
        GUSTER_FRAME.minY + GUSTER_FRAME.maxY
    )}) scale(1 -1)`,
    aspect: round(GUSTER_FRAME.width / GUSTER_FRAME.height),
    glosses: [
        { suffix: "", transform: null },
        ...ellipses
            .map((e, index) => [e, GUSTER_SHAPES[index].rot])
            .filter(([e]) => e.gloss)
            .map(([e, rot]) => ({
                suffix: e.gloss,
                transform: `rotate(${-rot} ${e.cx} ${e.cy})`,
            })),
    ],
    gloss: {
        cx: round(GUSTER_GLOSS.cx),
        cy: round(GUSTER_GLOSS.cy),
        r: round(GUSTER_GLOSS.r),
    },
    ellipses,
});

/** Guster as standalone SVG markup, one em tall, for a page that can't
 * import modules (maintenance.blade.php, which a test holds to this). `id`
 * names his gloss gradient. */
export function gusterSvgMarkup(id) {
    const { cx, cy, r } = GUSTER_SVG.gloss;
    const stops = GUSTER_GLOSS.stops
        .map(([at, color]) => `<stop offset="${at}" stop-color="${color}"/>`)
        .join("");
    const gradients = GUSTER_SVG.glosses
        .map(({ suffix, transform }) => {
            const turn = transform ? ` gradientTransform="${transform}"` : "";
            return `<radialGradient id="${id}${suffix}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}"${turn}>${stops}</radialGradient>`;
        })
        .join("");
    const ellipses = GUSTER_SVG.ellipses
        .map((e) => {
            const turn = e.transform ? ` transform="${e.transform}"` : "";
            const fade = e.opacity ? ` opacity="${e.opacity}"` : "";
            const fill = e.gloss === null ? e.color : `url(#${id}${e.gloss})`;
            return `<ellipse cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}"${turn} fill="${fill}"${fade}/>`;
        })
        .join("");
    return (
        `<svg viewBox="${GUSTER_SVG.viewBox}" style="height:1em;width:${GUSTER_SVG.aspect}em;overflow:visible" aria-hidden="true">` +
        `<defs>${gradients}</defs><g transform="${GUSTER_SVG.flip}">${ellipses}</g></svg>`
    );
}
