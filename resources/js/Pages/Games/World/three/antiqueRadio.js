import { canvasTexture } from "./useWorldRenderer.js";

// The Butt's House radio: an old wooden cathedral radio, modelled rather
// than painted, so the room's lamps and daylight fall on it. A lacquered
// walnut cabinet with an arched top and rounded edges on a plinth, a cloth
// speaker grille in a raised moulding behind wooden fretwork, a big round
// dial under a glass dome in a brass bezel, and four turned knobs. The dial is
// backlit while the radio plays (userData.setOn) and dark when it's off.
//
// Built one unit tall, standing on y = 0, its middle on x = 0 and z = 0,
// facing +z, for the cast kit's modelMesh() to size and pose like a prop.

// The cabinet: half its width, how deep, where its straight sides end and
// its arch starts, its top, and how round its edges are.
const HALF = 0.33;
const DEPTH = 0.26;
const SHOULDER = 0.5;
const APEX = 0.97;
const BEVEL = 0.025;
const PLINTH = { w: 0.76, h: 0.05, d: DEPTH + 0.08 };
// The grille's arch, inside the cabinet's.
const GRILLE = { half: 0.22, bottom: 0.42, shoulder: 0.58, apex: 0.88 };
// Clear of the grille's moulding above it, bezel and all.
const DIAL = { y: 0.235, r: 0.13 };
// How far round the dial's glass dome reaches from its top, radians.
const DOME = 0.6;
// Tuning and volume either side of the dial, and a small pair under them.
const KNOBS = [
    { x: -0.245, y: 0.27, r: 0.042 },
    { x: 0.245, y: 0.27, r: 0.042 },
    { x: -0.245, y: 0.14, r: 0.028 },
    { x: 0.245, y: 0.14, r: 0.028 },
];

const WALNUT = "#7a4a24";
const DARK_WOOD = "#3d220e";
const MOULDING = "#a8733f";
const FRET = "#6b3f1d";
const BAKELITE = "#2a1608";
const BRASS = "#c9a227";
// The dial's backlight, and its paper unlit.
const GLOW = "#ffb347";
const GLOW_ON = 1.6;
const DIAL_OFF = "#8a7a60";

/** A cathedral arch: straight sides from `bottom` up to `shoulder`, then
 * a pointed arch to `apex`, `half` either side of x = 0. */
function archShape(THREE, { half, bottom, shoulder, apex }) {
    const rise = apex - shoulder;
    const shape = new THREE.Shape();
    shape.moveTo(-half, bottom);
    shape.lineTo(-half, shoulder);
    shape.bezierCurveTo(
        -half,
        shoulder + rise * 0.75,
        -half * 0.2,
        apex,
        0,
        apex
    );
    shape.bezierCurveTo(
        half * 0.2,
        apex,
        half,
        shoulder + rise * 0.75,
        half,
        shoulder
    );
    shape.lineTo(half, bottom);
    shape.closePath();
    return shape;
}

/** Walnut grain to wrap the wood in: dark streaks running up it, over
 * white so the material's colour shows through. */
function paintGrain(ctx) {
    const s = ctx.canvas.width;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#5c3a1e";
    ctx.lineWidth = 2;
    for (let i = 0; i < 28; i++) {
        const x = (i / 28) * s;
        ctx.globalAlpha = 0.18 + (i % 3) * 0.08;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(
            x + (i % 2 ? 6 : -6),
            s * 0.35,
            x + (i % 3 ? -5 : 5),
            s * 0.7,
            x,
            s
        );
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

/** The speaker cloth's weave. */
function paintCloth(ctx) {
    const s = ctx.canvas.width;
    ctx.fillStyle = "#4a3824";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#6b5236";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let p = 0; p < s; p += 3) {
        ctx.moveTo(p, 0);
        ctx.lineTo(p, s);
        ctx.moveTo(0, p);
        ctx.lineTo(s, p);
    }
    ctx.stroke();
}

/** The dial's paper: station marks and numbers round its top, and a red
 * needle. It is its glow map too, so the marks stay dark on the light. */
function paintDial(ctx) {
    const s = ctx.canvas.width;
    const c = s / 2;
    const face = ctx.createRadialGradient(c, c * 0.85, c * 0.1, c, c, c);
    face.addColorStop(0, "#fff7d6");
    face.addColorStop(0.65, "#ffd98a");
    face.addColorStop(1, "#e0953a");
    ctx.fillStyle = face;
    ctx.fillRect(0, 0, s, s);

    ctx.strokeStyle = "#3d220e";
    ctx.fillStyle = "#3d220e";
    ctx.lineCap = "round";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${Math.round(s * 0.09)}px Georgia, serif`;
    for (let i = 0; i <= 20; i++) {
        const a = Math.PI * (1.1 + (0.8 * i) / 20);
        const major = i % 5 === 0;
        const inner = major ? 0.66 : 0.76;
        ctx.lineWidth = major ? s * 0.022 : s * 0.012;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(a) * c * inner, c + Math.sin(a) * c * inner);
        ctx.lineTo(c + Math.cos(a) * c * 0.88, c + Math.sin(a) * c * 0.88);
        ctx.stroke();
        if (major) {
            ctx.fillText(
                String(55 + i * 5),
                c + Math.cos(a) * c * 0.48,
                c + Math.sin(a) * c * 0.48
            );
        }
    }
    const needle = Math.PI * 1.36;
    ctx.strokeStyle = "#9f1239";
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.moveTo(c, c + c * 0.35);
    ctx.lineTo(
        c + Math.cos(needle) * c * 0.86,
        c + Math.sin(needle) * c * 0.86
    );
    ctx.stroke();
}

/** A turned knob `r` across, standing out of the front along +z: a skirt,
 * a waist and a domed cap, spun round its axis. */
function knobGeometry(THREE, r) {
    const profile = [
        [0, 0],
        [r, 0],
        [r, r * 0.35],
        [r * 0.8, r * 0.5],
        [r * 0.78, r * 0.75],
        [r * 0.55, r * 0.95],
        [0, r],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(profile, 24).rotateX(Math.PI / 2);
}

/**
 * The radio, as a Group (see the top of this file). `userData.setOn(on)`
 * lights or darkens its dial.
 */
export function radioModel(THREE) {
    const model = new THREE.Group();
    // Only the cabinet and plinth cast shadows (`casts`): the small parts
    // on its front would cost a shadow draw each for nothing.
    const add = (geometry, material, [x, y, z] = [0, 0, 0], casts = false) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = casts;
        mesh.receiveShadow = true;
        model.add(mesh);
        return mesh;
    };
    const front = DEPTH / 2 + BEVEL;

    // The cabinet, lacquered (a clear coat over the wood catches the
    // lamps), its edges rounded, on a darker plinth.
    const grain = canvasTexture(THREE, 128, 128, paintGrain);
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    add(
        new THREE.ExtrudeGeometry(
            archShape(THREE, {
                half: HALF,
                bottom: PLINTH.h,
                shoulder: SHOULDER,
                apex: APEX,
            }),
            {
                depth: DEPTH,
                bevelEnabled: true,
                bevelThickness: BEVEL,
                bevelSize: BEVEL,
                bevelSegments: 4,
                curveSegments: 24,
            }
        ).translate(0, 0, -DEPTH / 2),
        new THREE.MeshPhysicalMaterial({
            color: WALNUT,
            map: grain,
            roughness: 0.5,
            clearcoat: 0.8,
            clearcoatRoughness: 0.25,
        }),
        [0, 0, 0],
        true
    );
    add(
        new THREE.BoxGeometry(PLINTH.w, PLINTH.h, PLINTH.d),
        new THREE.MeshStandardMaterial({ color: DARK_WOOD, roughness: 0.6 }),
        [0, PLINTH.h / 2, 0],
        true
    );

    // The grille: cloth on the front, a fine weave, framed by a raised
    // moulding.
    const cloth = canvasTexture(THREE, 64, 64, paintCloth);
    cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping;
    cloth.repeat.set(4, 4);
    add(
        new THREE.ShapeGeometry(archShape(THREE, GRILLE), 24),
        new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.95 }),
        [0, 0, front + 0.001]
    );
    const frame = archShape(THREE, {
        half: GRILLE.half + 0.03,
        bottom: GRILLE.bottom - 0.03,
        shoulder: GRILLE.shoulder,
        apex: GRILLE.apex + 0.035,
    });
    frame.holes.push(archShape(THREE, GRILLE));
    add(
        new THREE.ExtrudeGeometry(frame, {
            depth: 0.012,
            bevelEnabled: true,
            bevelThickness: 0.006,
            bevelSize: 0.006,
            bevelSegments: 2,
            curveSegments: 24,
        }),
        new THREE.MeshStandardMaterial({
            color: MOULDING,
            map: grain,
            roughness: 0.45,
        }),
        [0, 0, front]
    );

    // Fretwork over the cloth: gothic slats, tallest in the middle, and an
    // arc across them like a rising sun.
    const fret = new THREE.MeshStandardMaterial({
        color: FRET,
        roughness: 0.55,
    });
    for (const [x, top] of [
        [-0.13, 0.66],
        [-0.045, 0.8],
        [0.045, 0.8],
        [0.13, 0.66],
    ]) {
        const h = top - GRILLE.bottom;
        add(new THREE.BoxGeometry(0.022, h, 0.014), fret, [
            x,
            GRILLE.bottom + h / 2,
            front + 0.008,
        ]);
    }
    add(new THREE.TorusGeometry(0.15, 0.009, 8, 32, Math.PI), fret, [
        0,
        0.5,
        front + 0.012,
    ]);

    // The dial: its paper (lit from behind while it plays) in a brass
    // bezel, under a glass dome.
    const paper = canvasTexture(THREE, 128, 128, paintDial);
    const dial = new THREE.MeshStandardMaterial({
        map: paper,
        emissiveMap: paper,
        emissive: new THREE.Color(GLOW),
        emissiveIntensity: 0,
        color: DIAL_OFF,
        roughness: 0.6,
    });
    add(new THREE.CircleGeometry(DIAL.r, 32), dial, [0, DIAL.y, front + 0.004]);
    add(
        new THREE.TorusGeometry(DIAL.r, 0.016, 12, 48),
        new THREE.MeshStandardMaterial({
            color: BRASS,
            metalness: 0.9,
            roughness: 0.3,
        }),
        [0, DIAL.y, front + 0.006]
    );
    // A cap of a sphere whose rim is the bezel.
    const domeR = DIAL.r / Math.sin(DOME);
    add(
        new THREE.SphereGeometry(domeR, 24, 8, 0, Math.PI * 2, 0, DOME).rotateX(
            Math.PI / 2
        ),
        new THREE.MeshStandardMaterial({
            color: "#ffffff",
            transparent: true,
            opacity: 0.18,
            roughness: 0.05,
        }),
        [0, DIAL.y, front + 0.006 - domeR * Math.cos(DOME)]
    );

    // Knobs: bakelite, each with a cream pointer line on its cap.
    const bakelite = new THREE.MeshStandardMaterial({
        color: BAKELITE,
        roughness: 0.35,
    });
    const pointer = new THREE.MeshStandardMaterial({ color: "#e7c9a0" });
    for (const k of KNOBS) {
        add(knobGeometry(THREE, k.r), bakelite, [k.x, k.y, front]);
        const line = add(
            new THREE.BoxGeometry(k.r * 0.15, k.r * 0.7, 0.004),
            pointer,
            [k.x + k.r * 0.2, k.y + k.r * 0.25, front + k.r + 0.001]
        );
        line.rotation.z = -0.6;
    }

    model.userData.setOn = (on) => {
        dial.emissiveIntensity = on ? GLOW_ON : 0;
        dial.color.set(on ? "#ffffff" : DIAL_OFF);
    };
    return model;
}
