import { KEY_COUNT, KEY_WIDTH, keyX, ORGAN } from "../scenes/organLayout.js";
import { box, mergeParts, paint } from "../scenes/streetGeometry.js";

// The Cockroach's pipe organ: a dark carved case against the wall with a
// row of pipes on a ledge, deepest (and tallest) on the left, and a keydesk
// in front with one keyboard, stop knobs either side of a music desk and a
// pedalboard on the floor. A pipe stands over each white key: press the key
// and it goes down, and its pipe sounds: it shivers, glows and puffs air
// out of its top. Under reduced motion it only glows.
//
// Built in world units in its own space (scenes/organLayout.js): its back
// on z = 0 facing +z, its middle on x = 0, standing on y = 0. The room
// poses it on its wall. Its woodwork is one mesh coloured in its vertices.

const WOOD = "#3b2314";
const DARK = "#1c110a";
const TRIM = "#6b4423";
const GILT = "#a87f32";
const IVORY = "#efe4cc";
const EBONY = "#151010";
// Old spotted metal, the pipes' tin and lead.
const PIPE = "#cfc6b0";
const GLOW = "#ffb347";

// How long a pipe sounds after its key goes down, s: as long as the note.
const SOUNDING = 1.2;
// How brightly a sounding pipe glows, and how hard it shivers (a share of
// its width) and how fast (radians a second).
const GLOW_ON = 1.4;
const SHIVER = { amount: 0.07, rate: 55 };
// A key's press: how far down, held this long, then back up over this.
const DIP = { depth: 2.5, hold: 0.12, back: 0.2 };
// Air out of a sounding pipe's top: how many puffs, how far apart, s, how
// long each lasts and how far it rises.
const PUFF = { count: 3, gap: 0.09, life: 0.9, rise: 46, pool: 36 };

/** Pipe `n`'s height, radius and how far out from the case it stands:
 * tall and wide for the deep notes, shrinking to the squeaky ones, in two
 * staggered rows so the wide ones fit. */
function pipeSize(n) {
    const share = n / (KEY_COUNT - 1);
    const { tallest, shortest } = ORGAN.pipes;
    return {
        height: tallest * (shortest / tallest) ** share,
        radius: 7.5 * (3.2 / 7.5) ** share,
        z: ORGAN.rows[n % 2],
    };
}

/** The black keys' places: after the white keys A, C, D, F and G of each
 * octave (the keyboard runs A to G), never past the last white key. */
function blackKeys() {
    const after = [0, 2, 3, 5, 6];
    const places = [];
    for (let n = 0; n < KEY_COUNT - 1; n += 1) {
        if (after.includes(n % ORGAN.whiteKeys)) places.push(n);
    }
    return places;
}

/** The case, keydesk, black keys, stops and pedals: one geometry, as
 * vertex-coloured parts. */
function woodwork(THREE) {
    const { length: L, height: H, desk, keys, ledge } = ORGAN;
    const keysDeep = keys.front - keys.back;
    const parts = [
        // The case: a dark back between two towers, the ledge the pipes
        // stand on, and a cornice with a gilt band under it.
        box(THREE, DARK, [L - 20, H - ledge, 4], [0, (H + ledge) / 2, 2]),
        box(THREE, WOOD, [L, ledge, 10], [0, ledge / 2, 5]),
        box(THREE, TRIM, [L, 8, 38], [0, ledge - 4, 19]),
        box(THREE, WOOD, [L + 18, 14, 44], [0, H - 7, 22]),
        box(THREE, TRIM, [L + 8, 6, 40], [0, H - 17, 20]),
        box(THREE, GILT, [L - 28, 16, 3], [0, H - 30, 34]),
        // The keydesk, with cheeks at the keyboard's ends, a rail behind
        // the keys and a kick board under them.
        box(
            THREE,
            WOOD,
            [L - 24, desk.top, desk.depth],
            [0, desk.top / 2, desk.depth / 2]
        ),
        box(
            THREE,
            TRIM,
            [L - 20, 4, desk.depth + 6],
            [0, desk.top - 2, (desk.depth + 6) / 2]
        ),
        box(
            THREE,
            DARK,
            [L - 40, desk.top - 24, 2],
            [0, (desk.top - 24) / 2 + 6, desk.depth + 1]
        ),
        box(
            THREE,
            WOOD,
            [keys.to - keys.from, 14, 6],
            [0, desk.top + 7, keys.back - 3]
        ),
        // The music desk, leant back.
        box(THREE, TRIM, [130, 42, 3], [0, 0, 0])
            .rotateX(-0.28)
            .translate(0, desk.top + 34, keys.back - 12),
        box(THREE, WOOD, [134, 4, 8], [0, desk.top + 13, keys.back - 6]),
    ];
    for (const side of [-1, 1]) {
        const end = side * (L / 2 - 8);
        parts.push(
            // A tower up each side, with a spire on top.
            box(THREE, WOOD, [16, H, 40], [end, H / 2, 20]),
            paint(
                THREE,
                new THREE.ConeGeometry(10, 40, 4)
                    .rotateY(Math.PI / 4)
                    .translate(end, H + 20, 20),
                DARK
            ),
            box(
                THREE,
                WOOD,
                [10, 18, keysDeep + 4],
                [
                    side * (keys.to + 5),
                    desk.top + 9,
                    (keys.back + keys.front) / 2,
                ]
            ),
            // A stop jamb beside the music desk, with three rows of knobs.
            box(
                THREE,
                DARK,
                [44, 46, 4],
                [side * 100, desk.top + 34, keys.back - 10]
            )
        );
        for (let row = 0; row < 3; row += 1) {
            for (let col = 0; col < 3; col += 1) {
                parts.push(
                    paint(
                        THREE,
                        new THREE.CylinderGeometry(3, 3, 6, 10)
                            .rotateX(Math.PI / 2)
                            .translate(
                                side * 100 + (col - 1) * 12,
                                desk.top + 48 - row * 13,
                                keys.back - 5
                            ),
                        (row + col) % 2 ? IVORY : "#9f1239"
                    )
                );
            }
        }
    }
    // The black keys, which don't go down.
    for (const n of blackKeys()) {
        parts.push(
            box(
                THREE,
                EBONY,
                [KEY_WIDTH * 0.55, 6, 24],
                [keyX(n) + KEY_WIDTH / 2, keys.y + 2, keys.back + 12]
            )
        );
    }
    // A pedalboard on the floor.
    for (let p = 0; p < 13; p += 1) {
        parts.push(
            box(
                THREE,
                p % 2 ? DARK : TRIM,
                [8, 5, 36],
                [(p - 6) * 14, 3, desk.depth + 18]
            )
        );
    }
    return mergeParts(THREE, parts);
}

/**
 * The organ, as { group, press(n), tick(dt, reduced) }: `press` sounds key
 * (and pipe) `n`, 0 the deepest; `tick` animates and says whether anything
 * moved. Its meshes are freed with the room (disposeTree).
 */
export function pipeOrgan(THREE) {
    const group = new THREE.Group();

    const wood = new THREE.Mesh(
        woodwork(THREE),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })
    );
    wood.castShadow = true;
    wood.receiveShadow = true;
    group.add(wood);

    // White keys, each its own mesh so it can go down.
    const { keys: K, ledge } = ORGAN;
    const keyGeometry = new THREE.BoxGeometry(
        KEY_WIDTH - 0.8,
        6,
        K.front - K.back
    );
    const ivory = new THREE.MeshStandardMaterial({
        color: IVORY,
        roughness: 0.4,
    });
    const restY = K.y - 3;
    const keys = [];
    for (let n = 0; n < KEY_COUNT; n += 1) {
        const key = new THREE.Mesh(keyGeometry, ivory);
        key.position.set(keyX(n), restY, (K.back + K.front) / 2);
        key.receiveShadow = true;
        group.add(key);
        keys.push({ mesh: key, t: null });
    }

    // The pipes: a cone foot, a body and a dark mouth where the air
    // speaks, under one group each so a pipe shivers as one. Their shapes
    // are shared, a unit each scaled to the pipe; each has its own metal,
    // to glow while it sounds.
    const mouth = new THREE.MeshStandardMaterial({ color: DARK });
    const footShape = new THREE.CylinderGeometry(1, 0.25, 1, 16);
    const bodyShape = new THREE.CylinderGeometry(1, 1, 1, 16);
    const lipShape = new THREE.BoxGeometry(1.1, 0.9, 1);
    const pipes = [];
    for (let n = 0; n < KEY_COUNT; n += 1) {
        const { height, radius, z } = pipeSize(n);
        const foot = Math.min(32, height * 0.24);
        const metal = new THREE.MeshStandardMaterial({
            color: PIPE,
            metalness: 0.35,
            roughness: 0.45,
            emissive: new THREE.Color(GLOW),
            emissiveIntensity: 0,
        });
        const pipe = new THREE.Group();
        pipe.position.set(keyX(n), ledge, z);
        const cone = new THREE.Mesh(footShape, metal);
        cone.scale.set(radius, foot, radius);
        cone.position.y = foot / 2;
        const body = new THREE.Mesh(bodyShape, metal);
        body.scale.set(radius, height - foot, radius);
        body.position.y = foot + (height - foot) / 2;
        body.castShadow = true;
        const lip = new THREE.Mesh(lipShape, mouth);
        lip.scale.set(radius, radius, 1);
        lip.position.set(0, foot + radius * 0.6, radius);
        pipe.add(cone, body, lip);
        group.add(pipe);
        pipes.push({ group: pipe, metal, height, radius, sounding: 0 });
    }

    // Puffs of air, reused round a pool: pale and unlit, so they show in
    // the dark.
    const puffShape = new THREE.SphereGeometry(1, 10, 8);
    const puffs = [];
    for (let i = 0; i < PUFF.pool; i += 1) {
        const mesh = new THREE.Mesh(
            puffShape,
            new THREE.MeshBasicMaterial({
                color: "#e7e5e4",
                transparent: true,
                opacity: 0,
                depthWrite: false,
            })
        );
        mesh.visible = false;
        group.add(mesh);
        puffs.push({ mesh, age: 0, from: null, drift: 0, size: 1 });
    }
    let nextPuff = 0;

    let time = 0;
    // Set by tick(): no shivering or puffs under reduced motion.
    let still = false;

    function puff(n, delay) {
        const pipe = pipes[n];
        const slot = puffs[nextPuff];
        nextPuff = (nextPuff + 1) % puffs.length;
        slot.age = -delay;
        slot.from = {
            x: pipe.group.position.x,
            y: ledge + pipe.height,
            z: pipe.group.position.z,
        };
        slot.drift = (Math.random() - 0.5) * 14;
        slot.size = pipe.radius;
        slot.mesh.visible = false;
    }

    function showPuff(slot) {
        const share = slot.age / PUFF.life;
        const { mesh, from } = slot;
        mesh.visible = slot.age >= 0;
        if (!mesh.visible) return;
        const ease = 1 - (1 - share) ** 2;
        mesh.position.set(
            from.x + slot.drift * ease,
            from.y + PUFF.rise * ease,
            from.z + 18 * ease
        );
        mesh.scale.setScalar(slot.size * (0.5 + 1.6 * ease));
        mesh.material.opacity = 0.55 * (1 - share);
    }

    return {
        group,

        /** Sounds key `n`: down it goes, and its pipe speaks. */
        press(n) {
            const key = keys[n];
            const pipe = pipes[n];
            if (!key || !pipe) return;
            key.t = 0;
            pipe.sounding = 1;
            if (still) return;
            for (let i = 0; i < PUFF.count; i += 1) puff(n, i * PUFF.gap);
        },

        /** Advances by `dt` s; whether anything moved. */
        tick(dt, reduced = false) {
            still = reduced;
            time += dt;
            let changed = false;
            for (const key of keys) {
                if (key.t === null) continue;
                key.t += dt;
                const up = Math.max(0, (key.t - DIP.hold) / DIP.back);
                if (up >= 1) key.t = null;
                key.mesh.position.y = restY - DIP.depth * (1 - Math.min(1, up));
                changed = true;
            }
            for (const [n, pipe] of pipes.entries()) {
                if (pipe.sounding <= 0) continue;
                pipe.sounding = Math.max(0, pipe.sounding - dt / SOUNDING);
                const v = pipe.sounding;
                pipe.metal.emissiveIntensity = GLOW_ON * v;
                const wobble = still
                    ? 0
                    : SHIVER.amount * v * Math.sin(time * SHIVER.rate + n);
                pipe.group.scale.set(1 + wobble, 1, 1 - wobble);
                changed = true;
            }
            for (const slot of puffs) {
                if (!slot.from) continue;
                slot.age += dt;
                if (slot.age >= PUFF.life || still) {
                    slot.from = null;
                    slot.mesh.visible = false;
                } else {
                    showPuff(slot);
                }
                changed = true;
            }
            return changed;
        },
    };
}
