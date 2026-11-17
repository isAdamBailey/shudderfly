import { sectionPoses } from "../scenes/garageDoorLayout.js";
import { canvasTexture } from "./useWorldRenderer.js";
import { worldNight, worldTheme } from "./themes.js";

// The Garage's door (issue #227) on its back wall: a white sectional door
// in a wooden frame, its hinged sections running up the opening and back
// under the ceiling in a pair of tracks (scenes/garageDoorLayout.js), the
// opener hung from the ceiling past their end on a rail, and through the
// opening, the driveway down to the street in the season's colours, by
// day or by night.
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
const PX = 512; // the backdrop's canvas, across

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

/** Door `door` ({ w, h, sections }) under a ceiling `wallHeight` up, in
 * the light of seasonal `theme`, shut: { group, show(open), setNight(n),
 * setLit(on), light }: `light` is where the opener's light hangs, just
 * under its lens. */
export function garageDoor(THREE, door, { theme, wallHeight }) {
    const { w, h } = door;
    const { up, out } = UNIT;
    const group = new THREE.Group();
    const material = (color, more = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...more });
    const box = (size, mat, at, parent = group) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
        mesh.position.set(...at);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };

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
    const steel = material(STEEL, { metalness: 0.6, roughness: 0.4 });
    const reach = h + 10;
    for (const side of [-1, 1]) {
        box([4, 4, reach], steel, [side * (w / 2 - 4), h + 6, reach / 2]);
    }
    const unitAt = h + up + UNIT.h / 2;
    const rail = out + h - UNIT.d / 2;
    box([6, 6, rail], steel, [0, h + 16, rail / 2]);
    // The opener on its straps from the ceiling, and its lens under it,
    // lit while its light is on.
    const unitZ = h + out;
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

    /** Lays the sections out `open` of the way up (0 shut, 1 open). */
    function show(open) {
        for (const [i, pose] of sectionPoses(door, open).entries()) {
            sections[i].position.set(0, pose.y, pose.z + SECTION_Z);
            sections[i].rotation.x = pose.tilt;
        }
    }
    show(0);

    return {
        group,
        show,
        /** The night's driveway `n` of the way over the day's. */
        setNight(n) {
            dark.opacity = n;
            // Only what shows is drawn.
            darkView.visible = n > 0;
            dayView.visible = n < 1;
        },
        light: { x: 0, y: unitAt - UNIT.h / 2 - 6, z: unitZ },
        /** Lights the opener's lens, or puts it out. */
        setLit(on) {
            lens.material.emissiveIntensity = on ? 1.8 : 0;
        },
    };
}
