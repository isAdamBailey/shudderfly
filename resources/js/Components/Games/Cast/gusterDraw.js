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
 * (the viewer's left). Body parts are glossy blobs: a broad core, lumpy
 * sides in three tiers narrowing upward, and a curled tip leaning to his
 * left. Face parts sit on the core's front: two uneven eyes with dot pupils,
 * worried brows that flatten their tops, and a crooked row of teeth.
 */

import { GUSTER_COLORS } from "@/constants/characters.js";
import { boundsOf, project as projectTo } from "./figureView.js";

/** Degrees. A small yaw shows his lumpy side; pitch looks down onto his
 * tip. */
export const GUSTER_VIEW = Object.freeze({ yaw: -14, pitch: 10, focal: 3 });

const GUSTER_LIGHT = { x: -0.32, y: 0.46 };
const DEG = Math.PI / 180;

const CORE = { x: 0, y: 0.42, z: 0, rx: 0.4, ry: 0.4, rz: 0.32 };

const blob = (x, y, z, rx, ry, rz, color = GUSTER_COLORS.body, rot = 0) => ({
    type: "blob",
    x,
    y,
    z,
    rx,
    ry,
    rz,
    rot,
    color,
});

const BODY = [
    blob(0, 0.09, 0.02, 0.43, 0.09, 0.32, GUSTER_COLORS.base),
    blob(CORE.x, CORE.y, CORE.z, CORE.rx, CORE.ry, CORE.rz),
    // Bottom tier: the widest bulges, at the sides and toward the front.
    blob(-0.3, 0.17, 0.02, 0.19, 0.17, 0.22, GUSTER_COLORS.mid),
    blob(0.31, 0.17, 0.02, 0.19, 0.17, 0.22, GUSTER_COLORS.mid),
    blob(-0.14, 0.12, 0.12, 0.19, 0.12, 0.19, GUSTER_COLORS.mid),
    blob(0.15, 0.12, 0.12, 0.19, 0.12, 0.19, GUSTER_COLORS.mid),
    // Middle tier.
    blob(-0.33, 0.4, 0, 0.15, 0.16, 0.2),
    blob(0.34, 0.42, 0, 0.15, 0.16, 0.2),
    // Top tier, narrower.
    blob(-0.25, 0.6, 0, 0.15, 0.14, 0.18),
    blob(0.26, 0.62, 0, 0.14, 0.13, 0.17),
    // The dome, then the tip curling up to his left and back.
    blob(0.02, 0.7, -0.02, 0.27, 0.16, 0.22),
    blob(0.06, 0.82, -0.03, 0.13, 0.11, 0.11, undefined, -10),
    blob(0.11, 0.91, -0.05, 0.075, 0.085, 0.07, undefined, -22),
    blob(0.135, 0.985, -0.07, 0.04, 0.06, 0.04, undefined, -34),
];

// The shiny spots, as shares of a body part's radii from its centre: the
// DOM paints them; WebGL gets its shine from the light.
const GLOSS = [
    { part: 1, x: -0.35, y: 0.5, rx: 0.2, ry: 0.12, rot: 20 },
    { part: 10, x: -0.2, y: 0.35, rx: 0.3, ry: 0.18, rot: 10 },
    { part: 11, x: -0.15, y: 0.3, rx: 0.3, ry: 0.22, rot: -10 },
    { part: 12, x: -0.2, y: 0.2, rx: 0.3, ry: 0.4, rot: -22 },
    { part: 9, x: 0.1, y: 0.4, rx: 0.35, ry: 0.22, rot: -20 },
];

/** How far forward the core's front is at (x, y). */
function frontOf(x, y) {
    const k = 1 - ((x - CORE.x) / CORE.rx) ** 2 - ((y - CORE.y) / CORE.ry) ** 2;
    return CORE.z + CORE.rz * Math.sqrt(Math.max(k, 0));
}

/** A flat feature on the core's front, poking out by most of its depth. */
function feature(type, x, y, rx, ry, rot, color, depth = 0.03, out = 0) {
    return {
        type,
        x,
        y,
        z: frontOf(x, y) - depth * 0.4 + out,
        rx,
        ry,
        rz: depth,
        rot,
        color,
    };
}

function eyeParts(eye, inward, browTilt) {
    const white = feature(
        "eye",
        eye.x,
        eye.y,
        eye.rx,
        eye.ry,
        eye.rot,
        GUSTER_COLORS.eyeWhite
    );
    // Near the inner edge, looking a little up.
    const pupil = feature(
        "pupil",
        eye.x + inward * eye.rx * 0.32,
        eye.y + eye.ry * 0.08,
        eye.rx * 0.24,
        eye.rx * 0.24,
        0,
        GUSTER_COLORS.pupil,
        0.02,
        0.02
    );
    // Body-coloured, over the eye's top: it flattens it and slants it,
    // the inner end higher, for the worried look.
    const brow = feature(
        "brow",
        eye.x,
        eye.y + eye.ry + 0.012,
        eye.rx * 1.3,
        0.05,
        browTilt,
        GUSTER_COLORS.body,
        0.04,
        0.012
    );
    return [white, pupil, brow];
}

function faceParts() {
    // His right eye (the viewer's left) is the larger, and tilted.
    const right = eyeParts(
        { x: -0.125, y: 0.545, rx: 0.11, ry: 0.082, rot: 8 },
        1,
        16
    );
    const left = eyeParts(
        { x: 0.135, y: 0.535, rx: 0.085, ry: 0.07, rot: -4 },
        -1,
        -14
    );
    // A crooked grimace: a shade gap behind an uneven row of teeth that
    // drops a little to his left.
    const mouth = feature(
        "mouth",
        0.005,
        0.375,
        0.17,
        0.036,
        -4,
        GUSTER_COLORS.shade,
        0.025
    );
    const teeth = [
        [-0.12, 0.386, 0.045, 0.03],
        [-0.06, 0.384, 0.042, 0.036],
        [0, 0.378, 0.044, 0.033],
        [0.06, 0.371, 0.042, 0.038],
        [0.118, 0.366, 0.04, 0.028],
    ].map(([x, y, rx, ry]) =>
        feature("tooth", x, y, rx, ry, 0, GUSTER_COLORS.teeth, 0.02, 0.01)
    );
    // Drawn in this order: the mouth, then both eyes' whites, pupils and
    // brows.
    return [mouth, ...teeth, ...[0, 1, 2].flatMap((i) => [right[i], left[i]])];
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
    };
}

// The dark edge round his outline, in figure units.
const RIM = 0.009;

/** Projected shapes, his base on y = 0, back to front: a dark rim round
 * his outline, the body blobs far to near, the gloss spots, then his face
 * in a fixed order. Shapes marked `glossy` (the body blobs and his brows)
 * are all painted with one gloss, GUSTER_GLOSS, so they read as one lumpy
 * body; the rest are flat `color`. */
function gusterShapes() {
    const { body, face } = gusterParts();
    const projected = body.map(project);
    const blobs = [...projected].sort((a, b) => a.z - b.z);
    const rims = blobs.map((shape) => ({
        ...shape,
        type: "rim",
        rx: shape.rx + RIM,
        ry: shape.ry + RIM,
        color: GUSTER_COLORS.base,
    }));
    const gloss = GLOSS.map((spot) => {
        const part = projected[spot.part];
        return {
            type: "gloss",
            x: part.x + part.rx * spot.x,
            y: part.y + part.ry * spot.y,
            z: part.z,
            rx: part.rx * spot.rx,
            ry: part.ry * spot.ry,
            rot: spot.rot,
            color: GUSTER_COLORS.highlight,
        };
    });
    const shapes = [
        ...rims,
        ...blobs.map((shape) => ({ ...shape, glossy: true })),
        ...gloss,
        ...face.map(project).map((shape) => ({
            ...shape,
            glossy: shape.type === "brow",
        })),
    ];

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
