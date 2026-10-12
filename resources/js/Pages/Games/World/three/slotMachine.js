import {
    GUSTER_FRAME,
    GUSTER_GLOSS,
    GUSTER_SHAPES,
} from "@/Components/Games/Cast/gusterDraw.js";
import { MACHINE_COLORS } from "../minigames/TootSlots/machineColors.js";
import { canvasTexture } from "./useWorldRenderer.js";

// Guster's slot machine, Toot Slots, hung on his wall: a bright toot-green
// cabinet with a puffy green toot cloud on top, a window of three reels
// each showing his face (three Gusters, the win), a red payline across
// them, a coin tray under them, and a lever with a red knob at its side.
//
// Built one unit tall, standing on y = 0, its middle on x = 0 and its back
// on z = 0, facing +z, so it hangs flat on a wall, for the cast kit's
// modelMesh() to size and pose like a prop.

// The cabinet: half its width, its depth, and its top (the cloud sits on
// it).
const HALF = 0.3;
const DEPTH = 0.22;
const TOP = 0.72;
// The reels' window, on the cabinet's face.
const WINDOW = { y: 0.42, w: 0.48, h: 0.2 };
// The toot cloud: puffs, as [x, y, radius].
const PUFFS = [
    [-0.17, 0.8, 0.1],
    [0, 0.86, 0.14],
    [0.17, 0.8, 0.1],
    [-0.08, 0.76, 0.1],
    [0.09, 0.76, 0.1],
];
// The lever's arm, up the cabinet's right side, and its knob.
// Toward the front, so it shows on a machine seen face on.
const LEVER = { x: HALF + 0.05, z: 0.06, from: 0.3, to: 0.66, knob: 0.05 };

const CHROME = "#d4d4d8";

/** Guster as his cast drawing has him (GUSTER_SHAPES), `size` tall, his
 * middle at (x, y) of the canvas. */
function paintGuster(ctx, x, y, size) {
    const k = size / GUSTER_FRAME.height;
    const midX = GUSTER_FRAME.minX + GUSTER_FRAME.width / 2;
    const midY = GUSTER_FRAME.minY + GUSTER_FRAME.height / 2;
    // His shapes run y up; the canvas runs y down.
    const at = (px, py) => [x + (px - midX) * k, y - (py - midY) * k];
    const [gx, gy] = at(GUSTER_GLOSS.cx, GUSTER_GLOSS.cy);
    const gloss = ctx.createRadialGradient(
        gx,
        gy,
        0,
        gx,
        gy,
        GUSTER_GLOSS.r * k
    );
    for (const [stop, color] of GUSTER_GLOSS.stops) {
        gloss.addColorStop(stop, color);
    }
    for (const shape of GUSTER_SHAPES) {
        const [cx, cy] = at(shape.x, shape.y);
        ctx.globalAlpha = shape.type === "gloss" ? 0.55 : 1;
        ctx.fillStyle = shape.glossy ? gloss : shape.color;
        ctx.beginPath();
        ctx.ellipse(
            cx,
            cy,
            shape.rx * k,
            shape.ry * k,
            (-(shape.rot ?? 0) * Math.PI) / 180,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

/** Three reels, each showing Guster (three Gusters, the win), on white,
 * split by dark gaps, with the payline across them. */
function paintReels(ctx) {
    const { width: w, height: h } = ctx.canvas;
    ctx.fillStyle = MACHINE_COLORS.greenDark;
    ctx.fillRect(0, 0, w, h);
    const reel = w / 3;
    for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(i * reel + 4, 4, reel - 8, h - 8);
        paintGuster(ctx, i * reel + reel / 2, h / 2, h * 0.8);
    }
    ctx.fillStyle = MACHINE_COLORS.red;
    ctx.fillRect(0, h / 2 - 2, w, 4);
}

/**
 * The slot machine, as a Group (see the top of this file).
 */
export function slotMachineModel(THREE) {
    const model = new THREE.Group();
    const add = (geometry, material, x, y, z = 0) => {
        const mesh = new THREE.Mesh(geometry, material);
        // Forward of z = 0 by half the cabinet, its back on the wall.
        mesh.position.set(x, y, z + DEPTH / 2);
        mesh.receiveShadow = true;
        model.add(mesh);
        return mesh;
    };
    const green = new THREE.MeshStandardMaterial({
        color: MACHINE_COLORS.green,
        roughness: 0.4,
        metalness: 0.1,
    });
    const dark = new THREE.MeshStandardMaterial({
        color: MACHINE_COLORS.greenDark,
        roughness: 0.6,
    });
    const trim = new THREE.MeshStandardMaterial({
        color: MACHINE_COLORS.gold,
        metalness: 0.7,
        roughness: 0.3,
    });
    const chrome = new THREE.MeshStandardMaterial({
        color: CHROME,
        metalness: 0.9,
        roughness: 0.2,
    });

    // The cabinet, on a darker plinth, with a gold band round its top.
    add(
        new THREE.BoxGeometry(HALF * 2, TOP - 0.06, DEPTH),
        green,
        0,
        (TOP + 0.06) / 2
    );
    add(
        new THREE.BoxGeometry(HALF * 2 + 0.04, 0.06, DEPTH + 0.04),
        dark,
        0,
        0.03
    );
    add(
        new THREE.BoxGeometry(HALF * 2 + 0.02, 0.03, DEPTH + 0.02),
        trim,
        0,
        TOP - 0.015
    );

    // The reels' window, framed in gold.
    const face = DEPTH / 2;
    add(
        new THREE.BoxGeometry(WINDOW.w + 0.05, WINDOW.h + 0.05, 0.02),
        trim,
        0,
        WINDOW.y,
        face
    );
    const reels = new THREE.MeshStandardMaterial({
        map: canvasTexture(THREE, 192, 80, paintReels),
        roughness: 0.4,
    });
    add(
        new THREE.PlaneGeometry(WINDOW.w, WINDOW.h),
        reels,
        0,
        WINDOW.y,
        face + 0.011
    );

    // The coin tray, under the window.
    add(new THREE.BoxGeometry(0.34, 0.06, 0.08), dark, 0, 0.14, face + 0.03);

    // The toot cloud on top, glowing a little so it's green in the dark.
    const cloud = new THREE.MeshStandardMaterial({
        color: MACHINE_COLORS.cloud,
        emissive: new THREE.Color(MACHINE_COLORS.green),
        emissiveIntensity: 0.25,
        roughness: 0.95,
    });
    // One sphere, scaled to each puff.
    const puff = new THREE.SphereGeometry(1, 16, 12);
    for (const [x, y, r] of PUFFS) {
        // Clear of the wall behind it.
        add(puff, cloud, x, y, Math.max(0, r - DEPTH / 2)).scale.setScalar(r);
    }

    // The lever: a hub on the side, a chrome arm, a red knob.
    add(
        new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16).rotateZ(Math.PI / 2),
        dark,
        HALF + 0.03,
        LEVER.from,
        LEVER.z
    );
    add(
        new THREE.CylinderGeometry(0.018, 0.018, LEVER.to - LEVER.from, 8),
        chrome,
        LEVER.x,
        (LEVER.from + LEVER.to) / 2,
        LEVER.z
    );
    add(
        new THREE.SphereGeometry(LEVER.knob, 16, 12),
        new THREE.MeshStandardMaterial({
            color: MACHINE_COLORS.red,
            roughness: 0.3,
        }),
        LEVER.x,
        LEVER.to,
        LEVER.z
    );

    return model;
}
