import {
    carriageTurns,
    ROLL_UP,
    rollUpPose,
    sectionPoses,
    topEdge,
} from "../scenes/garageDoorLayout.js";
import { canvasTexture } from "./useWorldRenderer.js";
import { worldNight, worldTheme } from "./themes.js";

// The Garage's door (issue #227) on its back wall, in a wooden frame, in
// any of three styles (composables/useGarageStyles.js GARAGE_DOORS), all
// built up front so a swap only shows another (setStyle()):
// - `sectional`, white, its hinged sections running up the opening and
//   back under the ceiling in a pair of tracks, pulled by the opener on
//   its rail;
// - `roll-up`, corrugated metal slats that wind onto a coil over the top;
// - `carriage`, a pair of wooden doors that swing out, away from the
//   room.
// The opener hangs from the ceiling whichever it is, and through the
// opening is the driveway down to the street in the season's colours, by
// day or by night. The poses are scenes/garageDoorLayout.js's.
//
// Built in world units in the door's own space: the wall on z = 0, its
// middle on x = 0, the floor y = 0. The room poses it and hangs it with
// the back wall. Room3D.vue's opener (scenes/garageOpener.js) says where
// the door is (show()) and whether its light is on (setLit()).

const WHITE = "#f8fafc";
const RIB = "#e2e8f0";
const STEEL = "#64748b";
const OPENER = "#e7e5e4";
// The frame round the opening, units wide.
const JAMB = 12;
// How far a section is out from the wall, so the backdrop is behind it.
const SECTION_Z = 4;
const SECTION_DEPTH = 4;
const BACKDROP_Z = 1.5;
// The opener: its box, how far it hangs `out` past the end of the
// track and `up` off the door's top. Its light hangs under its lens
// (`light`, which the room moves the opener's lamp to).
const UNIT = { w: 70, h: 36, d: 60, out: 50, up: 36 };
// The emergency release: red, hanging from the trolley down to its
// handle `bottom` up (still over the Butt's head), the trolley `z` out
// past the door's top edge on its arm.
const RELEASE = "#dc2626";
const ROPE = { bottom: 230, z: 22 };
const PX = 512; // the backdrop's canvas, across
// The opener's readout of how many times the door has gone up: its size
// on the unit's face, units, and its canvas, px.
const READOUT = { w: 40, h: 13, px: [160, 52], digits: 4 };
// The roll-up door: its slats' steel, and how far through they are.
const SLAT = { color: "#9ca3af", rib: "#6b7280", depth: 3 };
// The carriage doors: their wood, its trim and iron, how thick they are
// and how far out they hang, and how much darker one gets turned all the
// way out.
const CARRIAGE = {
    wood: "#9a6a3f",
    trim: "#6f4626",
    iron: "#1f2937",
    depth: 4,
    z: 5,
    shade: 0.5,
};

/** Paints the opener's readout, `w` × `h` px, showing `count`: red
 * digits, at least READOUT.digits of them, on black. */
export function paintReadout(ctx, w, h, count) {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, w, h);
    const text = String(count).padStart(READOUT.digits, "0");
    // Smaller to fit, once there are more digits than the readout's.
    const size = Math.min(h * 0.8, (w * 0.9) / (text.length * 0.62));
    ctx.font = `bold ${size}px ui-monospace, Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = size / 4;
    ctx.fillStyle = "#f87171";
    ctx.fillText(text, w / 2, h / 2 + size * 0.05);
}

/** Paints the driveway out of the opening, `w` × `h` px, in look `look`
 * (worldTheme() or worldNight()), with stars when it's `night`. */
function paintDriveway(ctx, w, h, look, night) {
    const horizon = h * 0.42;
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, look.skyTop);
    sky.addColorStop(1, look.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, horizon);
    if (night) {
        ctx.fillStyle = "#fefce8";
        for (let i = 0; i < 40; i += 1) {
            // Scattered the same way every time.
            const x = (i * 97.3) % w;
            const y = (i * 53.7) % (horizon * 0.9);
            ctx.fillRect(x, y, 2, 2);
        }
    }
    // The houses over the street, low against the sky.
    for (let i = 0; i < 5; i += 1) {
        const x = (i + 0.1) * (w / 5);
        const tall = horizon * (0.22 + 0.08 * (i % 2));
        ctx.fillStyle = look.walls[i % look.walls.length];
        ctx.fillRect(x, horizon - tall, w / 6, tall);
        ctx.fillStyle = look.roofs[i % look.roofs.length];
        ctx.beginPath();
        ctx.moveTo(x - 6, horizon - tall);
        ctx.lineTo(x + w / 12, horizon - tall - tall * 0.5);
        ctx.lineTo(x + w / 6 + 6, horizon - tall);
        ctx.fill();
    }
    // The pavement over the way, the street and its line, this side's
    // pavement, then the lawn either side of the driveway.
    const bands = [
        [look.pavement, 0.05],
        [look.road, 0.13],
        [look.pavement, 0.05],
    ];
    let y = horizon;
    for (const [color, share] of bands) {
        ctx.fillStyle = color;
        ctx.fillRect(0, y, w, h * share);
        y += h * share;
    }
    ctx.fillStyle = look.roadLine;
    const line = horizon + h * (0.05 + 0.065);
    for (let x = 10; x < w; x += 60) ctx.fillRect(x, line - 2, 32, 4);
    ctx.fillStyle = look.grass;
    ctx.fillRect(0, y, w, h - y);
    // The driveway, wider as it comes up to the door.
    ctx.fillStyle = look.pavement;
    ctx.beginPath();
    ctx.moveTo(w * 0.38, y);
    ctx.lineTo(w * 0.62, y);
    ctx.lineTo(w * 0.92, h);
    ctx.lineTo(w * 0.08, h);
    ctx.fill();
    // Night falls on the ground as it does on the street's ridge.
    if (night) {
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = look.ridgeTint;
        ctx.fillRect(0, horizon, w, h - horizon);
        ctx.globalCompositeOperation = "source-over";
    }
}

/** The sectional door's sections and their hardware (tracks, rail,
 * trolley and the red release rope) in `group`, for door `door` under a
 * ceiling, the rail out to the opener's `rail` long at `railY`:
 * { group, show(open) }. */
function sectionalDoor(
    THREE,
    door,
    { add, box, material, steel, rail, railY }
) {
    const { w, h } = door;
    const group = new THREE.Group();
    // The sections, each pivoted on its bottom edge to tip as it rounds
    // the top of the opening: white, ribbed, the top one windowed.
    const tall = h / door.sections;
    const white = material(WHITE, { roughness: 0.45 });
    const rib = material(RIB, { roughness: 0.5 });
    const glass = material("#1e3a5f", { roughness: 0.15, metalness: 0.3 });
    const sections = Array.from({ length: door.sections }, (_, i) => {
        const pivot = new THREE.Group();
        box([w - 2, tall - 1, SECTION_DEPTH], white, [0, tall / 2, 0], pivot);
        for (const at of [0.3, 0.7]) {
            box(
                [w - 24, 3, 1.5],
                rib,
                [0, tall * at, SECTION_DEPTH / 2],
                pivot
            );
        }
        if (i === door.sections - 1) {
            const panes = 4;
            const pane = (w - 60) / panes;
            for (let n = 0; n < panes; n += 1) {
                box(
                    [pane - 16, tall * 0.4, 1],
                    glass,
                    [
                        -w / 2 + 30 + pane * (n + 0.5),
                        tall / 2,
                        SECTION_DEPTH / 2,
                    ],
                    pivot
                );
            }
        }
        group.add(pivot);
        return pivot;
    });

    // The tracks out under the ceiling, either side, as far as the door
    // goes back, and the opener's rail down the middle to it.
    const reach = h + 10;
    for (const side of [-1, 1]) {
        box(
            [4, 4, reach],
            steel,
            [side * (w / 2 - 4), h + 6, reach / 2],
            group
        );
    }
    box([6, 6, rail], steel, [0, railY, rail / 2], group);
    // The trolley on the rail, which the opener pulls along with the
    // door's top (show()), and hanging from it the red emergency release
    // rope with its T handle.
    const trolley = new THREE.Group();
    group.add(trolley);
    box([12, 10, 18], steel, [0, railY, 0], trolley);
    const red = material(RELEASE, { roughness: 0.7 });
    const rope = railY - ROPE.bottom;
    add(
        new THREE.CylinderGeometry(0.9, 0.9, rope, 8),
        red,
        [0, ROPE.bottom + rope / 2, 0],
        trolley,
        false
    );
    add(
        new THREE.CylinderGeometry(2.4, 2.4, 16, 12).rotateZ(Math.PI / 2),
        red,
        [0, ROPE.bottom - 2, 0],
        trolley,
        false
    );

    return {
        group,
        show(open) {
            for (const [i, pose] of sectionPoses(door, open).entries()) {
                sections[i].position.set(0, pose.y, pose.z + SECTION_Z);
                sections[i].rotation.x = pose.tilt;
            }
            // A fixed arm out from the door's top edge.
            trolley.position.z = topEdge(door, open).z + ROPE.z;
        },
    };
}

/** The roll-up door's slats in their guides and its coil over the top,
 * in `group`, for door `door`: { group, show(open) }. */
function rollUpDoor(THREE, door, { add, box, material }) {
    const { w, h } = door;
    const group = new THREE.Group();
    const steel = material(SLAT.color, { metalness: 0.55, roughness: 0.45 });
    const ribSteel = material(SLAT.rib, { metalness: 0.6, roughness: 0.4 });
    const most = Math.ceil(h / ROLL_UP.slat);
    // Each slat a unit tall, stretched to what of it is still hanging, a
    // ridge across its middle; instanced, so a door of slats is two draws.
    const instanced = (geometry, mat) => {
        const mesh = new THREE.InstancedMesh(geometry, mat, most);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    const slats = instanced(new THREE.BoxGeometry(w - 2, 1, SLAT.depth), steel);
    const ribs = instanced(new THREE.BoxGeometry(w - 6, 1, 1.5), ribSteel);
    // The heavier bar along the curtain's foot.
    const foot = box(
        [w - 2, 6, SLAT.depth + 2],
        ribSteel,
        [0, 3, SECTION_Z],
        group
    );
    // The guides up either side.
    for (const side of [-1, 1]) {
        box(
            [6, h, SLAT.depth + 4],
            ribSteel,
            [side * (w / 2 - 3), h / 2, SECTION_Z],
            group
        );
    }
    // The coil's drum just over the header, as far out as the fattest
    // coil (all the curtain wound on), between its end plates.
    const fattest = rollUpPose(door, 1).coil;
    const coilAt = [0, h + JAMB + fattest, 8 + fattest];
    const coil = add(
        new THREE.CylinderGeometry(1, 1, w - 16, 24).rotateZ(Math.PI / 2),
        steel,
        coilAt,
        group
    );
    for (const side of [-1, 1]) {
        add(
            new THREE.CylinderGeometry(fattest + 3, fattest + 3, 4, 24).rotateZ(
                Math.PI / 2
            ),
            ribSteel,
            [side * (w / 2 - 4), coilAt[1], coilAt[2]],
            group
        );
    }

    const place = new THREE.Matrix4();
    const scale = new THREE.Vector3();
    const at = new THREE.Vector3();
    const none = new THREE.Quaternion();
    /** Lays the curtain out `open` of the way up. */
    function show(open) {
        const pose = rollUpPose(door, open);
        pose.slats.forEach(({ y, tall }, i) => {
            at.set(0, y + tall / 2, SECTION_Z);
            slats.setMatrixAt(
                i,
                place.compose(at, none, scale.set(1, tall, 1))
            );
            at.z = SECTION_Z + SLAT.depth / 2;
            ribs.setMatrixAt(
                i,
                place.compose(at, none, scale.set(1, Math.min(4, tall), 1))
            );
        });
        slats.count = ribs.count = pose.slats.length;
        slats.instanceMatrix.needsUpdate = true;
        ribs.instanceMatrix.needsUpdate = true;
        foot.position.y = pose.bottom + 3;
        coil.scale.set(1, pose.coil, pose.coil);
    }
    // Culled by where the slats hang while it's shut, as far as they reach.
    show(0);
    slats.computeBoundingSphere();
    ribs.computeBoundingSphere();

    return { group, show };
}

/** The carriage doors, a pair hung from either jamb, in `group`, for door
 * `door`: { group, show(open) }. */
function carriageDoors(THREE, door, { add, box, material }) {
    const { w, h } = door;
    const group = new THREE.Group();
    const wide = w / 2 - 1;
    const tall = h - 2;
    const looks = {
        wood: material(CARRIAGE.wood, { roughness: 0.75 }),
        trim: material(CARRIAGE.trim, { roughness: 0.8 }),
        iron: material(CARRIAGE.iron, { metalness: 0.5, roughness: 0.5 }),
        glass: material("#1e3a5f", { roughness: 0.15, metalness: 0.3 }),
    };
    // Each look with its own colour, to darken from.
    const shades = Object.values(looks).map((mat) => [mat, mat.color.clone()]);
    const front = CARRIAGE.depth / 2;
    // A leaf, `side` -1 on the left, +1 on the right: its board, the rails
    // and stiles round it, a cross brace under a row of windows, the strap
    // hinges at its jamb and a handle at its meeting edge. Built out from
    // its hinge along -side (toward the middle).
    const leaves = [-1, 1].map((side) => {
        const pivot = new THREE.Group();
        pivot.position.set((side * w) / 2, 1, CARRIAGE.z);
        const leaf = new THREE.Group();
        leaf.position.x = (-side * wide) / 2;
        pivot.add(leaf);
        group.add(pivot);
        // What's on its face is too thin to cast a shadow worth a draw.
        const on = (size, mat, x, y, z = front) =>
            add(new THREE.BoxGeometry(...size), mat, [x, y, z], leaf, false);
        box([wide, tall, CARRIAGE.depth], looks.wood, [0, tall / 2, 0], leaf);
        // Boards, down the lower two thirds.
        for (let x = -wide / 2 + 20; x < wide / 2 - 10; x += 22) {
            on([1.5, tall * 0.64, 1], looks.trim, x, tall * 0.34);
        }
        const rail = 14;
        on([wide, rail, 2], looks.trim, 0, rail / 2);
        on([wide, rail, 2], looks.trim, 0, tall * 0.68);
        on([wide, rail, 2], looks.trim, 0, tall - rail / 2);
        on([rail, tall, 2], looks.trim, -wide / 2 + rail / 2, tall / 2);
        on([rail, tall, 2], looks.trim, wide / 2 - rail / 2, tall / 2);
        // The brace, corner to corner across the boards.
        const across = wide - 2 * rail;
        const up = tall * 0.68 - rail;
        const brace = on(
            [Math.hypot(across, up), 10, 2],
            looks.trim,
            0,
            rail / 2 + up / 2
        );
        brace.rotation.z = side * Math.atan2(up, across);
        // Windows over the top rail: three panes.
        const pane = (wide - 2 * rail - 16) / 3;
        for (let n = 0; n < 3; n += 1) {
            on(
                [pane, tall * 0.18, 1],
                looks.glass,
                -wide / 2 + rail + 8 + pane * (n + 0.5) + (n - 1) * 4,
                tall * 0.84,
                front + 0.5
            );
        }
        const hinge = side * (wide / 2 - 30);
        for (const y of [tall * 0.2, tall * 0.8]) {
            on([60, 6, 1], looks.iron, hinge, y, front + 1.5);
        }
        on(
            [4, 34, 3],
            looks.iron,
            -side * (wide / 2 - 24),
            tall * 0.5,
            front + 2
        );
        return pivot;
    });

    return {
        group,
        show(open) {
            const turns = carriageTurns(open);
            for (const [i, turn] of turns.entries()) {
                // Foreshortened toward its hinge, never quite to nothing:
                // open, a leaf stands edge on in its jamb.
                leaves[i].scale.x = Math.max(Math.cos(turn), 0.03);
            }
            const away = Math.sin(Math.abs(turns[0]));
            const k = 1 - CARRIAGE.shade * away;
            for (const [mat, color] of shades) {
                mat.color.copy(color).multiplyScalar(k);
            }
        },
    };
}

/** Each door style's builder, by its name in GARAGE_DOORS
 * (composables/useGarageStyles.js; a test keeps them in step). */
export const DOOR_STYLES = {
    sectional: sectionalDoor,
    "roll-up": rollUpDoor,
    carriage: carriageDoors,
};

/** Door `door` ({ w, h, sections }) under a ceiling `wallHeight` up, in
 * the light of seasonal `theme`, in style `style`, shut, its opener's
 * readout showing `count`: { group, show(open), setStyle(style),
 * setNight(n), setLit(on), setCount(n), light }: `light`
 * is where the opener's light hangs, just under its lens. */
export function garageDoor(
    THREE,
    door,
    { theme, wallHeight, style = "sectional", count = 0 }
) {
    const { w, h } = door;
    const { up, out } = UNIT;
    const group = new THREE.Group();
    const material = (color, more = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...more });
    // `casts` false for what's too thin to cast a shadow worth its draw.
    const add = (geometry, mat, at, parent = group, casts = true) => {
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.set(...at);
        mesh.castShadow = casts;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };
    const box = (size, mat, at, parent) =>
        add(new THREE.BoxGeometry(...size), mat, at, parent);

    // Out through the opening: the day's driveway, and the night's over
    // it, as dark mode falls (setNight()). Unlit, as a view outside is.
    const px = [PX, Math.round((PX * h) / w)];
    const drive = (look, night) =>
        new THREE.MeshBasicMaterial({
            map: canvasTexture(THREE, ...px, (ctx) =>
                paintDriveway(ctx, ...px, look, night)
            ),
            transparent: night,
            opacity: night ? 0 : 1,
            depthWrite: !night,
        });
    const day = drive(worldTheme(theme), false);
    const dark = drive(worldNight(theme), true);
    const [dayView, darkView] = [
        [day, BACKDROP_Z],
        [dark, BACKDROP_Z + 0.5],
    ].map(([mat, z]) => {
        const view = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        view.position.set(0, h / 2, z);
        group.add(view);
        return view;
    });
    darkView.visible = false;

    // The frame: a jamb up each side and the header over the top.
    const wood = material("#f5f5f4", { roughness: 0.8 });
    for (const side of [-1, 1]) {
        box([JAMB, h + JAMB, 8], wood, [
            side * (w / 2 + JAMB / 2),
            (h + JAMB) / 2,
            4,
        ]);
    }
    box([w + 2 * JAMB, JAMB, 8], wood, [0, h + JAMB / 2, 4]);

    // The opener on its straps from the ceiling, and its lens under it,
    // lit while its light is on. The sectional door's rail runs out to it.
    const unitAt = h + up + UNIT.h / 2;
    const unitZ = h + out;
    const steel = material(STEEL, { metalness: 0.6, roughness: 0.4 });
    box([UNIT.w, UNIT.h, UNIT.d], material(OPENER), [0, unitAt, unitZ]);
    for (const side of [-1, 1]) {
        const strap = wallHeight - (unitAt + UNIT.h / 2);
        if (strap > 0) {
            box([3, strap, 3], steel, [
                side * (UNIT.w / 2 - 6),
                unitAt + UNIT.h / 2 + strap / 2,
                unitZ,
            ]);
        }
    }
    const lens = box(
        [UNIT.w - 16, 3, UNIT.d - 16],
        material("#fefce8", {
            emissive: new THREE.Color("#fde68a"),
            emissiveIntensity: 0,
            roughness: 0.3,
        }),
        [0, unitAt - UNIT.h / 2 - 1.5, unitZ]
    );

    // Its readout on the face toward the room, unlit so it reads in the
    // dark, as an LED does.
    // One canvas, repainted as the count goes up.
    const readout = canvasTexture(THREE, ...READOUT.px, () => {});
    const drawReadout = (n) => {
        const ctx = readout.image.getContext("2d");
        if (!ctx) return;
        paintReadout(ctx, ...READOUT.px, n);
        readout.needsUpdate = true;
    };
    const display = new THREE.Mesh(
        new THREE.PlaneGeometry(READOUT.w, READOUT.h),
        new THREE.MeshBasicMaterial({ map: readout })
    );
    display.position.set(0, unitAt + 2, unitZ + UNIT.d / 2 + 0.3);
    group.add(display);
    drawReadout(count);

    const parts = { add, box, material, steel };
    // The sectional door's rail runs out to the opener.
    const rail = { rail: out + h - UNIT.d / 2, railY: h + 16 };
    const styles = Object.fromEntries(
        Object.entries(DOOR_STYLES).map(([name, build]) => [
            name,
            build(THREE, door, { ...parts, ...rail }),
        ])
    );
    for (const { group: built } of Object.values(styles)) group.add(built);

    let open = 0;
    let shown = null;
    /** Lays the door out `to` of the way up (0 shut, 1 open). */
    function show(to) {
        open = to;
        shown.show(open);
    }
    /** Shows door style `name` (the sectional for one there isn't), where
     * the last was. */
    function setStyle(name) {
        shown = styles[name] ?? styles.sectional;
        for (const built of Object.values(styles)) {
            built.group.visible = built === shown;
        }
        show(open);
    }
    setStyle(style);

    return {
        group,
        show,
        setStyle,
        /** The night's driveway `n` of the way over the day's. */
        setNight(n) {
            dark.opacity = n;
            // Only what shows is drawn.
            darkView.visible = n > 0;
            dayView.visible = n < 1;
        },
        light: { x: 0, y: unitAt - UNIT.h / 2 - 6, z: unitZ },
        /** Shows `n` on the opener's readout. */
        setCount: drawReadout,
        /** Lights the opener's lens, or puts it out. */
        setLit(on) {
            lens.material.emissiveIntensity = on ? 1.8 : 0;
        },
    };
}
