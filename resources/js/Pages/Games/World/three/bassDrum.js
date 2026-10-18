import { BASS_DRUM, HEAD_OUT } from "../scenes/drumLayout.js";
import { box, mergeParts, paint } from "../scenes/streetGeometry.js";

// The Cockroach's bass drum: a big deep-red shell on its side, its calfskin
// heads in dark hoops drawn tight by rods, hung in a wooden cradle. Hit,
// it swings in its cradle, harder the nearer the middle, and a ripple runs
// out across its head. Under reduced motion it only ripples, without
// moving.
//
// Built in world units in its own space (scenes/drumLayout.js): facing +z,
// its middle on x = 0, standing on y = 0. The room poses it.

const SHELL = "#7f1d1d";
const HOOP = "#2a1a10";
const ROD = "#c9a24a";
// Aged calfskin heads, yellowed like parchment, a little lit of their own
// so the head you hit shows pale against the candlelit room.
const HEAD = "#e6d3a3";
const HEAD_GLOW = 0.35;
const WOOD = "#4a2a14";

// How long a hit's swing lasts, s, how far it swings (radians) and how
// fast (radians a second).
const SWING = { life: 1.6, amount: 0.05, rate: 9 };
// A ripple across the head: how long it runs, s, and how many are kept.
const RIPPLE = { life: 0.7, pool: 4 };
// The tension rods round each hoop.
const RODS = 12;

/** The shell, hoops and rods: one geometry, its middle on the origin. */
function body(THREE) {
    const { radius: r, shell, hoop } = BASS_DRUM;
    // A cylinder along z, `deep` deep, at `at` out of the wall.
    const drum = (color, radius, deep, at) =>
        paint(
            THREE,
            new THREE.CylinderGeometry(radius, radius, deep, 40)
                .rotateX(Math.PI / 2)
                .translate(0, 0, at),
            color
        );
    const parts = [
        drum(SHELL, r - 2, shell - 2 * hoop, 0),
        // The hoops, a ring round each head's rim: a solid one covered
        // the head.
        ...[-1, 1].map((side) =>
            paint(
                THREE,
                new THREE.TorusGeometry(r + 1, hoop / 2, 8, 48).translate(
                    0,
                    0,
                    side * HEAD_OUT
                ),
                HOOP
            )
        ),
    ];
    // The rods, lugged along the shell between the hoops.
    for (let i = 0; i < RODS; i += 1) {
        const a = (i / RODS) * Math.PI * 2;
        parts.push(
            box(
                THREE,
                ROD,
                [4, 4, shell - 2 * hoop],
                [Math.cos(a) * (r + 1), Math.sin(a) * (r + 1), 0]
            )
        );
    }
    return mergeParts(THREE, parts);
}

/** The cradle it hangs in, on the floor: one geometry. */
function cradle(THREE) {
    const { radius: r, y, z } = BASS_DRUM;
    const parts = [];
    // A crossbar under the drum, and a post up each side to the pins it
    // hangs from, each post on a foot back to the wall.
    const reach = r + 18;
    parts.push(box(THREE, WOOD, [reach * 2 + 20, 10, 12], [0, 26, z]));
    for (const side of [-1, 1]) {
        parts.push(
            box(THREE, WOOD, [10, y + 10, 10], [side * reach, (y + 10) / 2, z]),
            box(THREE, WOOD, [12, 8, 2 * z], [side * reach, 4, z])
        );
    }
    return mergeParts(THREE, parts);
}

/**
 * The drum, as { group, hit(edge), tick(dt, reduced) }: `hit` strikes its
 * head `edge` out from the middle (0 to 1); `tick` animates and says
 * whether anything moved. Its meshes are freed with the room (disposeTree).
 */
export function bassDrum(THREE) {
    const { radius: r, y, z } = BASS_DRUM;
    const group = new THREE.Group();

    // What swings: the drum hangs from pins at its middle's height, so it
    // turns about them.
    const swinging = new THREE.Group();
    swinging.position.set(0, y, z);
    group.add(swinging);

    const wood = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.55,
    });
    const stand = new THREE.Mesh(cradle(THREE), wood);
    stand.castShadow = true;
    stand.receiveShadow = true;
    group.add(stand);
    const drum = new THREE.Mesh(body(THREE), wood);
    drum.castShadow = true;
    drum.receiveShadow = true;
    swinging.add(drum);

    // The heads, front and back.
    const skin = new THREE.MeshStandardMaterial({
        color: HEAD,
        roughness: 0.8,
        emissive: new THREE.Color(HEAD),
        emissiveIntensity: HEAD_GLOW,
    });
    const headShape = new THREE.CircleGeometry(r, 40);
    for (const side of [-1, 1]) {
        const head = new THREE.Mesh(headShape, skin);
        head.position.z = side * HEAD_OUT;
        if (side < 0) head.rotation.y = Math.PI;
        swinging.add(head);
    }

    // Ripples on the front head, reused round a pool.
    const rippleShape = new THREE.RingGeometry(0.86, 1, 40);
    const ripples = [];
    for (let i = 0; i < RIPPLE.pool; i += 1) {
        const mesh = new THREE.Mesh(
            rippleShape,
            new THREE.MeshBasicMaterial({
                color: "#7c5a3a",
                transparent: true,
                opacity: 0,
                depthWrite: false,
            })
        );
        mesh.position.z = HEAD_OUT + 1;
        mesh.visible = false;
        swinging.add(mesh);
        ripples.push({ mesh, age: null });
    }
    let nextRipple = 0;

    let swing = null;

    return {
        group,

        /** Strikes the head `edge` (0 to 1) out from its middle: a hit near
         * the middle swings it harder. */
        hit(edge = 0) {
            swing = { t: 0, strength: 1 - 0.6 * edge };
            const slot = ripples[nextRipple];
            nextRipple = (nextRipple + 1) % ripples.length;
            slot.age = 0;
        },

        /** Advances by `dt` s; whether anything moved. */
        tick(dt, reduced = false) {
            let changed = false;
            if (swing) {
                swing.t += dt;
                const left = Math.max(0, 1 - swing.t / SWING.life);
                swinging.rotation.x = reduced
                    ? 0
                    : SWING.amount *
                      swing.strength *
                      left *
                      Math.sin(swing.t * SWING.rate);
                if (left === 0) swing = null;
                changed = true;
            }
            for (const ripple of ripples) {
                if (ripple.age === null) continue;
                ripple.age += dt;
                const share = ripple.age / RIPPLE.life;
                if (share >= 1) {
                    ripple.age = null;
                    ripple.mesh.visible = false;
                } else {
                    ripple.mesh.visible = true;
                    ripple.mesh.scale.setScalar(r * (0.1 + 0.85 * share));
                    ripple.mesh.material.opacity = 0.6 * (1 - share);
                }
                changed = true;
            }
            return changed;
        },
    };
}
