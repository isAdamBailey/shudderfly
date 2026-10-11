import { canvasTexture } from "./useWorldRenderer.js";

// The Butt's House radio: an old wooden cathedral radio, its arched top
// over a cloth speaker grille behind wooden fretwork, a round dial lit from
// behind and three knobs. Drawn into a square canvas like the clocks
// (clockFaces.js); the transparent ground is the silhouette. A second
// canvas, black but for the dial, is its glow (an emissive map), so the
// dial shines in the dark while the wood stays wood.

// Where things are in the canvas, as shares of its size.
const BODY = { left: 0.2, right: 0.8, shoulder: 0.44, top: 0.05, bottom: 0.95 };
const GRILLE = {
    left: 0.3,
    right: 0.7,
    shoulder: 0.42,
    top: 0.15,
    bottom: 0.6,
};
const DIAL = { x: 0.5, y: 0.73, r: 0.1 };
const KNOBS = [
    { x: 0.31, y: 0.8, r: 0.05 },
    { x: 0.69, y: 0.8, r: 0.05 },
    { x: 0.5, y: 0.885, r: 0.035 },
];

// The dial's backlight: the emissive colour its glow map tints.
const GLOW = "#ffb347";
// The canvases' size, px.
const SIZE = 256;

/** A cathedral arch `box` (shares) in a canvas `s` square: straight sides
 * up to its shoulder, then a pointed arch to its top. */
function arch(ctx, s, { left, right, shoulder, top, bottom }) {
    const l = left * s;
    const r = right * s;
    const mid = (l + r) / 2;
    ctx.beginPath();
    ctx.moveTo(l, bottom * s);
    ctx.lineTo(l, shoulder * s);
    ctx.bezierCurveTo(
        l,
        (shoulder - 0.2) * s,
        mid - 0.06 * s,
        top * s,
        mid,
        top * s
    );
    ctx.bezierCurveTo(
        mid + 0.06 * s,
        top * s,
        r,
        (shoulder - 0.2) * s,
        r,
        shoulder * s
    );
    ctx.lineTo(r, bottom * s);
    ctx.closePath();
}

function walnut(ctx, s) {
    const g = ctx.createLinearGradient(BODY.left * s, 0, BODY.right * s, 0);
    g.addColorStop(0, "#4a2a12");
    g.addColorStop(0.3, "#8b5a2b");
    g.addColorStop(0.55, "#6b3f1d");
    g.addColorStop(1, "#3d220e");
    return g;
}

function grain(ctx, s) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "#2a1608";
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = Math.max(1, s / 160);
    for (let i = 1; i <= 14; i++) {
        const x = (BODY.left + ((BODY.right - BODY.left) * i) / 15) * s;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(
            x + (i % 2 ? 5 : -5),
            s * 0.35,
            x + (i % 3 ? -4 : 4),
            s * 0.7,
            x,
            s
        );
        ctx.stroke();
    }
    ctx.restore();
}

function body(ctx, s) {
    // The plinth it stands on, a little wider than the cabinet.
    ctx.fillStyle = "#3d220e";
    ctx.beginPath();
    ctx.roundRect(0.16 * s, 0.9 * s, 0.68 * s, 0.07 * s, 0.015 * s);
    ctx.fill();

    arch(ctx, s, BODY);
    ctx.fillStyle = walnut(ctx, s);
    ctx.fill();
    ctx.lineWidth = s * 0.018;
    ctx.strokeStyle = "#2a1608";
    ctx.stroke();
    grain(ctx, s);

    // A lighter veneer band inside the edge.
    arch(ctx, s, {
        left: 0.24,
        right: 0.76,
        shoulder: 0.44,
        top: 0.1,
        bottom: 0.66,
    });
    ctx.lineWidth = s * 0.012;
    ctx.strokeStyle = "#b07a45";
    ctx.stroke();
}

function grille(ctx, s) {
    arch(ctx, s, GRILLE);
    ctx.fillStyle = "#3a2a1c";
    ctx.fill();
    // The cloth's weave.
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "#5c4630";
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    for (let p = 0; p < s; p += Math.max(3, s / 64)) {
        ctx.beginPath();
        ctx.moveTo(p, 0);
        ctx.lineTo(p, s);
        ctx.moveTo(0, p);
        ctx.lineTo(s, p);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Wooden fretwork over it: gothic slats, and a sunrise arc across.
    ctx.strokeStyle = "#7a4a22";
    ctx.lineWidth = s * 0.022;
    ctx.lineCap = "round";
    const l = GRILLE.left * s;
    const r = GRILLE.right * s;
    for (let i = 1; i <= 4; i++) {
        const x = l + ((r - l) * i) / 5;
        ctx.beginPath();
        ctx.moveTo(x, GRILLE.bottom * s);
        ctx.lineTo(x, (GRILLE.top + 0.07 + Math.abs(i - 2.5) * 0.06) * s);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0.5 * s, 0.52 * s, 0.14 * s, Math.PI, 0);
    ctx.stroke();
    ctx.restore();

    arch(ctx, s, GRILLE);
    ctx.lineWidth = s * 0.014;
    ctx.strokeStyle = "#2a1608";
    ctx.stroke();
}

/** The dial: its face glows amber when `lit` is the glow map, and is drawn
 * in full (bezel, numbers, needle) otherwise. */
function dial(ctx, s, lit) {
    const cx = DIAL.x * s;
    const cy = DIAL.y * s;
    const r = DIAL.r * s;
    const face = ctx.createRadialGradient(cx, cy - r * 0.2, r * 0.1, cx, cy, r);
    face.addColorStop(0, lit ? "#ffffff" : "#fff4c8");
    face.addColorStop(0.6, lit ? "#ffd27a" : "#ffcf6e");
    face.addColorStop(1, lit ? "#b8641a" : "#d98a2b");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // The station marks round its top, and the needle, shadows on the light.
    ctx.strokeStyle = "#3d220e";
    ctx.lineCap = "round";
    for (let i = 0; i <= 10; i++) {
        const a = Math.PI * (1.1 + (0.8 * i) / 10);
        const inner = i % 5 === 0 ? 0.62 : 0.74;
        ctx.lineWidth = i % 5 === 0 ? r * 0.08 : r * 0.05;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * inner, cy + Math.sin(a) * r * inner);
        ctx.lineTo(cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88);
        ctx.stroke();
    }
    const needle = Math.PI * 1.62;
    ctx.strokeStyle = "#9f1239";
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.3);
    ctx.lineTo(
        cx + Math.cos(needle) * r * 0.86,
        cy + Math.sin(needle) * r * 0.86
    );
    ctx.stroke();
    if (lit) return;

    // A brass bezel round the glass, and the glass's shine.
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = r * 0.18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgb(255 255 255 / 0.45)";
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, Math.PI * 1.15, Math.PI * 1.45);
    ctx.stroke();
}

function knobs(ctx, s) {
    for (const k of KNOBS) {
        const cx = k.x * s;
        const cy = k.y * s;
        const r = k.r * s;
        const g = ctx.createRadialGradient(
            cx - r * 0.35,
            cy - r * 0.35,
            r * 0.1,
            cx,
            cy,
            r
        );
        g.addColorStop(0, "#a0714a");
        g.addColorStop(0.5, "#4a2a12");
        g.addColorStop(1, "#1f1007");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        // Its grip ridges and pointer.
        ctx.strokeStyle = "#1f1007";
        ctx.lineWidth = Math.max(1, r * 0.12);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#e7c9a0";
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * 0.45, cy - r * 0.55);
        ctx.stroke();
    }
}

/** Paints the radio into `ctx` (a square canvas). */
function paintRadio(ctx) {
    const s = ctx.canvas.width;
    ctx.clearRect(0, 0, s, s);
    body(ctx, s);
    grille(ctx, s);
    dial(ctx, s, false);
    knobs(ctx, s);
}

/** Paints the radio's glow into `ctx`: black, but for the lit dial. */
function paintRadioGlow(ctx) {
    const s = ctx.canvas.width;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, s, s);
    dial(ctx, s, true);
}

/** The radio's look, as kit.paintedMesh() options: its painting, the
 * glow that backlights its dial, and how its wood takes the light. */
export function radioLook(THREE) {
    return {
        texture: canvasTexture(THREE, SIZE, SIZE, paintRadio),
        glow: canvasTexture(THREE, SIZE, SIZE, paintRadioGlow),
        glowColor: GLOW,
        roughness: 0.45,
        metalness: 0.05,
    };
}
