// Wall clocks in the hall, each a different shape. Names match
// GamesWorld::CLOCKS (a test keeps the lists in step). Drawn into a square
// canvas; the transparent ground is the silhouette.

export const CLOCK_FACES = [
    "round",
    "school",
    "octagon",
    "cuckoo",
    "sunburst",
    "arch",
    "hex",
    "banjo",
];

const FINISH = {
    sunburst: { roughness: 0.35, metalness: 0.55 },
    banjo: { roughness: 0.45, metalness: 0.15 },
};

/** Roughness and metalness for `face`, so brass reads as brass and wood as wood. */
export function clockFinish(face) {
    return FINISH[face] ?? { roughness: 0.82, metalness: 0 };
}

function poly(ctx, points) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
}

function ngon(cx, cy, r, n, rot = -Math.PI / 2) {
    return Array.from({ length: n }, (_, i) => {
        const a = rot + (i / n) * Math.PI * 2;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
}

function wood(ctx, x, y, w, h, light, dark) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, light);
    g.addColorStop(0.45, dark);
    g.addColorStop(1, light);
    return g;
}

function grain(ctx, color) {
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.28;
    ctx.lineWidth = 2;
    const { width: w, height: h } = ctx.canvas;
    for (let i = 1; i <= 6; i++) {
        const y = (h * i) / 7;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(w * 0.5, y + (i % 2 ? 6 : -6), w, y);
        ctx.stroke();
    }
    ctx.restore();
}

/** Hour and minute hands. 12 is up. */
function hands(ctx, cx, cy, r, hour, minute) {
    const m = (minute / 60) * Math.PI * 2 - Math.PI / 2;
    const h =
        ((hour % 12) / 12) * Math.PI * 2 +
        (minute / 60) * (Math.PI / 6) -
        Math.PI / 2;
    ctx.strokeStyle = "#1c1917";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(h) * r * 0.48, cy + Math.sin(h) * r * 0.48);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, r * 0.055);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(m) * r * 0.72, cy + Math.sin(m) * r * 0.72);
    ctx.stroke();
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
}

function ticks(ctx, cx, cy, r) {
    ctx.strokeStyle = "#44403c";
    ctx.lineCap = "butt";
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const inner = i % 3 === 0 ? 0.68 : 0.82;
        ctx.lineWidth = i % 3 === 0 ? r * 0.07 : r * 0.035;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * inner, cy + Math.sin(a) * r * inner);
        ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
        ctx.stroke();
    }
}

function dial(ctx, cx, cy, r, paper, hour, minute) {
    ctx.fillStyle = paper;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a8a29e";
    ctx.lineWidth = r * 0.06;
    ctx.stroke();
    ticks(ctx, cx, cy, r);
    hands(ctx, cx, cy, r, hour, minute);
}

function round(ctx, s) {
    const c = s / 2;
    const r = s * 0.46;
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.fillStyle = wood(ctx, c - r, c - r, r * 2, r * 2, "#e7c9a0", "#8a5a2b");
    ctx.fill();
    grain(ctx, "#6b3f1d");
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#5c3a1e";
    ctx.lineWidth = s * 0.025;
    ctx.stroke();
    dial(ctx, c, s * 0.42, s * 0.26, "#f6f1e7", 10, 10);
    ctx.fillStyle = "#e7e5e4";
    ctx.beginPath();
    ctx.arc(c, s * 0.76, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c2410c";
    ctx.beginPath();
    ctx.arc(c, s * 0.82, s * 0.035, 0, Math.PI * 2);
    ctx.fill();
}

function school(ctx, s) {
    const m = s * 0.06;
    const w = s - m * 2;
    ctx.beginPath();
    ctx.roundRect(m, m, w, w, s * 0.06);
    ctx.fillStyle = wood(ctx, m, m, w, w, "#3f6212", "#1a2e05");
    ctx.fill();
    grain(ctx, "#14532d");
    ctx.strokeStyle = "#14532d";
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
    const face = s * 0.62;
    const x = (s - face) / 2;
    ctx.fillStyle = "#fafaf9";
    ctx.fillRect(x, x, face, face);
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = s * 0.015;
    ctx.strokeRect(x, x, face, face);
    dial(ctx, s / 2, s / 2, face * 0.46, "#fafaf9", 8, 20);
}

function octagon(ctx, s) {
    const c = s / 2;
    const pts = ngon(c, c, s * 0.46, 8);
    poly(ctx, pts);
    ctx.fillStyle = wood(ctx, 0, 0, s, s, "#7c4a2d", "#3f2415");
    ctx.fill();
    grain(ctx, "#3f2415");
    poly(ctx, pts);
    ctx.strokeStyle = "#3f2415";
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
    dial(ctx, c, c, s * 0.26, "#f3e6d0", 4, 45);
}

function cuckoo(ctx, s) {
    const roof = [
        [s * 0.5, s * 0.04],
        [s * 0.08, s * 0.4],
        [s * 0.92, s * 0.4],
    ];
    poly(ctx, roof);
    ctx.fillStyle = "#7f1d1d";
    ctx.fill();
    ctx.fillStyle = wood(ctx, s * 0.14, s * 0.36, s * 0.72, s * 0.58, "#d6b48a", "#8d5e34");
    ctx.fillRect(s * 0.14, s * 0.36, s * 0.72, s * 0.58);
    ctx.save();
    ctx.beginPath();
    ctx.rect(s * 0.14, s * 0.36, s * 0.72, s * 0.58);
    grain(ctx, "#6b4423");
    ctx.restore();
    ctx.fillStyle = "#44403c";
    ctx.fillRect(s * 0.4, s * 0.58, s * 0.2, s * 0.28);
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.ellipse(s * 0.5, s * 0.66, s * 0.07, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ea580c";
    ctx.beginPath();
    ctx.moveTo(s * 0.56, s * 0.66);
    ctx.lineTo(s * 0.66, s * 0.64);
    ctx.lineTo(s * 0.56, s * 0.7);
    ctx.fill();
    dial(ctx, s / 2, s * 0.42, s * 0.13, "#f8fafc", 12, 0);
}

function sunburst(ctx, s) {
    const c = s / 2;
    const rays = 16;
    for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / rays) * Math.PI * 2 - Math.PI / 2;
        const mid = (a0 + a1) / 2;
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.lineTo(c + Math.cos(a0) * s * 0.28, c + Math.sin(a0) * s * 0.28);
        ctx.lineTo(c + Math.cos(mid) * s * 0.48, c + Math.sin(mid) * s * 0.48);
        ctx.lineTo(c + Math.cos(a1) * s * 0.28, c + Math.sin(a1) * s * 0.28);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? "#fbbf24" : "#d97706";
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(c, c, s * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#fde68a";
    ctx.fill();
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
    dial(ctx, c, c, s * 0.16, "#fffbeb", 2, 10);
}

function arch(ctx, s) {
    const x = s * 0.22;
    const w = s * 0.56;
    ctx.beginPath();
    ctx.moveTo(x, s * 0.96);
    ctx.lineTo(x, s * 0.38);
    ctx.arc(s / 2, s * 0.38, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, s * 0.96);
    ctx.closePath();
    ctx.fillStyle = wood(ctx, x, 0, w, s, "#9a3412", "#431407");
    ctx.fill();
    grain(ctx, "#431407");
    dial(ctx, s / 2, s * 0.4, s * 0.18, "#f5f5f4", 6, 30);
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = s * 0.015;
    ctx.strokeRect(s * 0.38, s * 0.62, s * 0.24, s * 0.26);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(s / 2, s * 0.78, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
}

function hex(ctx, s) {
    const c = s / 2;
    const pts = ngon(c, c, s * 0.46, 6, Math.PI / 6);
    poly(ctx, pts);
    ctx.fillStyle = wood(ctx, 0, 0, s, s, "#fde68a", "#d97706");
    ctx.fill();
    grain(ctx, "#b45309");
    poly(ctx, pts);
    ctx.strokeStyle = "#92400e";
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
    dial(ctx, c, c, s * 0.24, "#fffbeb", 9, 15);
}

function banjo(ctx, s) {
    const c = s / 2;
    ctx.fillStyle = wood(ctx, s * 0.32, s * 0.42, s * 0.36, s * 0.5, "#a16207", "#713f12");
    ctx.beginPath();
    ctx.moveTo(s * 0.36, s * 0.48);
    ctx.lineTo(s * 0.64, s * 0.48);
    ctx.lineTo(s * 0.56, s * 0.82);
    ctx.lineTo(s * 0.44, s * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c, s * 0.32, s * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = wood(ctx, c - s * 0.28, s * 0.04, s * 0.56, s * 0.56, "#fcd34d", "#b45309");
    ctx.fill();
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = s * 0.02;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(c, s * 0.9, s * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = "#92400e";
    ctx.fill();
    dial(ctx, c, s * 0.32, s * 0.18, "#fafaf9", 5, 40);
}

const PAINT = { round, school, octagon, cuckoo, sunburst, arch, hex, banjo };

/** Paints `face` into `ctx`'s canvas. */
export function paintClock(ctx, face) {
    const paint = PAINT[face];
    if (!paint) throw new Error(`Unknown clock "${face}"`);
    const { width: s, height } = ctx.canvas;
    ctx.clearRect(0, 0, s, height);
    paint(ctx, s);
}

/** A texture of `face` for a lit, cut-out plane. */
export function clockTexture(THREE, face, size = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) paintClock(ctx, face);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}
