/*
 * The butt rig as a solid figure seen from a three-quarter angle, slightly
 * from above. No Three.js and no Vue: the DOM paints `buttShapes()` and
 * WebGL builds `buttParts()` with the same view.
 *
 * Parts are in rig space (y up) before the view turn. Shapes are that figure
 * projected, feet on y = 0, far parts first.
 */

import { BUTT_RIG, sampleButtPose } from "./buttRig.js";

export const BUTT_COLORS = {
    highlight: "#ffe7d2",
    shade: "#a85a38",
    near: "#f2b184",
    far: "#d98458",
    leg: "#e09668",
    foot: "#c46b4e",
    cleft: "#7a3a2c",
};

/** Degrees. Yaw turns a rear view into a three-quarter one; pitch looks
 * down onto the cheeks. */
export const BUTT_VIEW = Object.freeze({ yaw: 52, pitch: 20, focal: 1.35 });

const BUTT_LIGHT = { x: -0.34, y: 0.42 };
const DEG = Math.PI / 180;

function place(body, offset) {
    const rad = body.rot * DEG;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        x: body.x + offset.x * cos - offset.y * sin,
        y: body.y + offset.x * sin + offset.y * cos,
        z: 0,
    };
}

/** Cheeks, legs, feet and the cleft in rig space, before the view turn. */
export function buttParts(pose = sampleButtPose("idle")) {
    const { body } = pose;
    const radius = BUTT_RIG.body.cheekRadius;
    const cheeks = BUTT_RIG.body.cheeks.map((cheek) => ({
        ...place(body, cheek),
        r: radius,
    }));
    const nearer = [...cheeks].sort((a, b) => turn(b).z - turn(a).z);
    nearer[0].color = BUTT_COLORS.near;
    nearer[1].color = BUTT_COLORS.far;

    const legW = BUTT_RIG.leg.width;
    const legs = [];
    const feet = [];
    for (const side of ["left", "right"]) {
        const hip = place(body, BUTT_RIG.hips[side]);
        const swing = (body.rot + pose[`${side}Leg`].rot) * DEG;
        const foot = {
            x: hip.x + Math.sin(swing) * BUTT_RIG.leg.length,
            y: hip.y - Math.cos(swing) * BUTT_RIG.leg.length,
            z: hip.z,
        };
        // A flat foot, longer than the leg is thick, toes toward +x
        // and a little toward the camera so the three-quarter view shows it.
        const length = 0.2;
        const height = 0.055;
        const width = 0.11;
        const out = side === "left" ? -1 : 1;
        const ankle = {
            x: foot.x,
            y: foot.y + height,
            z: foot.z,
        };
        legs.push({
            x1: hip.x,
            y1: hip.y,
            z1: hip.z,
            x2: ankle.x,
            y2: ankle.y,
            z2: ankle.z,
            width: legW,
            color: BUTT_COLORS.leg,
        });
        feet.push({
            x: foot.x + length * 0.32,
            y: height / 2,
            z: foot.z + 0.05 + out * 0.025,
            sx: length / 2,
            sy: height / 2,
            sz: width / 2,
            color: BUTT_COLORS.foot,
        });
    }

    const cleftX = (cheeks[0].x + cheeks[1].x) / 2;
    const cleftY = (cheeks[0].y + cheeks[1].y) / 2;
    const cleft = {
        x1: cleftX,
        y1: cleftY + radius * 0.28,
        z1: 0.05,
        x2: cleftX,
        y2: cleftY - radius * 0.62,
        z2: 0.05,
        width: radius * 0.16,
        color: BUTT_COLORS.cleft,
    };

    return { cheeks, legs, feet, cleft };
}

function turn(point) {
    const pitch = BUTT_VIEW.pitch * DEG;
    const yaw = BUTT_VIEW.yaw * DEG;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const y1 = point.y * cp - point.z * sp;
    const z1 = point.y * sp + point.z * cp;
    return {
        x: point.x * cy + z1 * sy,
        y: y1,
        z: -point.x * sy + z1 * cy,
    };
}

function project(point) {
    const viewed = turn(point);
    const scale = BUTT_VIEW.focal / (BUTT_VIEW.focal - viewed.z);
    return {
        x: viewed.x * scale,
        y: viewed.y * scale,
        z: viewed.z,
        scale,
    };
}

function shade(shape) {
    const across = shape.r ?? shape.rx ?? 0;
    const up = shape.r ?? shape.ry ?? 0;
    return {
        ...shape,
        highlight: BUTT_COLORS.highlight,
        shade: BUTT_COLORS.shade,
        lightX: shape.x + across * BUTT_LIGHT.x,
        lightY: shape.y + up * BUTT_LIGHT.y,
    };
}

/** How far the view turn drops the standing feet below y = 0, in rig units.
 * The WebGL figure shifts up by this. */
export function buttDrop(pose = sampleButtPose("idle")) {
    const { feet } = buttParts(pose);
    return Math.min(...feet.map((foot) => turn(foot).y - foot.sy));
}

/** Projected shapes for `pose`, lowest ink on y = 0, far to near. */
export function buttShapes(pose = sampleButtPose("idle")) {
    const { cheeks, legs, feet, cleft } = buttParts(pose);
    const shapes = [
        ...legs.map((leg) => {
            const a = project({ x: leg.x1, y: leg.y1, z: leg.z1 });
            const b = project({ x: leg.x2, y: leg.y2, z: leg.z2 });
            return {
                type: "leg",
                x1: a.x,
                y1: a.y,
                x2: b.x,
                y2: b.y,
                width: leg.width * ((a.scale + b.scale) / 2),
                color: leg.color,
                z: (a.z + b.z) / 2,
            };
        }),
        ...feet.map((foot) => {
            const p = project(foot);
            const toe = project({
                x: foot.x + foot.sx,
                y: foot.y,
                z: foot.z,
            });
            const up = project({
                x: foot.x,
                y: foot.y + foot.sy,
                z: foot.z,
            });
            return shade({
                type: "foot",
                x: p.x,
                y: p.y,
                rx: Math.hypot(toe.x - p.x, toe.y - p.y),
                ry: Math.hypot(up.x - p.x, up.y - p.y),
                color: foot.color,
                z: p.z,
            });
        }),
        ...cheeks.map((cheek) => {
            const p = project(cheek);
            return shade({
                type: "cheek",
                x: p.x,
                y: p.y,
                r: cheek.r * p.scale,
                color: cheek.color,
                z: p.z,
            });
        }),
    ];

    const top = project({ x: cleft.x1, y: cleft.y1, z: cleft.z1 });
    const bottom = project({ x: cleft.x2, y: cleft.y2, z: cleft.z2 });
    shapes.push({
        type: "cleft",
        x1: top.x,
        y1: top.y,
        x2: bottom.x,
        y2: bottom.y,
        width: cleft.width,
        color: cleft.color,
        z: Math.max(...shapes.map((shape) => shape.z)) + 0.02,
    });

    const inkBottom = (shape) => {
        if (shape.ry) return shape.y - shape.ry;
        if (shape.r) return shape.y - shape.r;
        return Math.min(shape.y1, shape.y2) - shape.width / 2;
    };
    const ground = Math.min(...shapes.map(inkBottom));
    for (const shape of shapes) {
        if (shape.r || shape.ry) {
            shape.y -= ground;
            shape.lightY = shape.y + (shape.r ?? shape.ry) * BUTT_LIGHT.y;
        } else {
            shape.y1 -= ground;
            shape.y2 -= ground;
        }
    }

    shapes.sort((a, b) => a.z - b.z);
    return shapes;
}

function boundsOf(shapes) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const add = (x, y, r) => {
        minX = Math.min(minX, x - r);
        maxX = Math.max(maxX, x + r);
        minY = Math.min(minY, y - r);
        maxY = Math.max(maxY, y + r);
    };
    for (const shape of shapes) {
        if (shape.rx) {
            add(shape.x, shape.y, 0);
            minX = Math.min(minX, shape.x - shape.rx);
            maxX = Math.max(maxX, shape.x + shape.rx);
            minY = Math.min(minY, shape.y - shape.ry);
            maxY = Math.max(maxY, shape.y + shape.ry);
        } else if (shape.r) add(shape.x, shape.y, shape.r);
        else {
            add(shape.x1, shape.y1, shape.width / 2);
            add(shape.x2, shape.y2, shape.width / 2);
        }
    }
    return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
    };
}

export const BUTT_FRAME = Object.freeze(boundsOf(buttShapes()));
