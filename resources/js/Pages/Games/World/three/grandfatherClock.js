import { dialTexture } from "./clockFaces.js";
import { FOOTPRINTS } from "./footprints.js";

// The Cockroach's grandfather clock, where Cockroach Fight is played: a
// tall case of dark oak against the Nest's back wall, a brass pendulum
// swinging behind the glass of its trunk, and a hood with a cream face (the
// hall clocks' dial, clockFaces.js) under a carved crown.
//
// Its userData `swing(time, still)` poses the pendulum `time` s into the
// room's clock, at an end of its swing every `beat` s (when it ticks,
// Room3D.vue), and hangs it still under reduced motion; whether it moved.
//
// Built one unit tall (the crown's top), standing on y = 0, its middle on
// x = 0 and its back on z = 0, facing +z, so it stands flat against a wall,
// for the cast kit's modelMesh() to size and pose like a prop.

// The case at its widest (the plinth and the crown) and deepest (the hood).
const HALF = FOOTPRINTS["grandfather-clock"].w / 2;
const DEPTH = FOOTPRINTS["grandfather-clock"].d;
// Its three parts, bottom up: the plinth, the narrower trunk, the hood.
const PLINTH = { y: 0, h: 0.18, half: HALF - 0.01, d: DEPTH - 0.01 };
const TRUNK = { y: PLINTH.h, h: 0.48, half: HALF - 0.04, d: DEPTH - 0.03 };
const HOOD = { y: TRUNK.y + TRUNK.h, h: 0.26, half: HALF - 0.02, d: DEPTH };
// The face, in the middle of the hood, and the crown over it.
const FACE = { y: HOOD.y + HOOD.h / 2, r: 0.095 };
const CROWN = { y: HOOD.y + HOOD.h, h: 1 - HOOD.y - HOOD.h };

const OAK = "#4a2c17";
const OAK_DARK = "#2e1a0d";
const BRASS = "#d4a73a";
const CREAM = "#f5ecd7";
const GLASS = "#1a1410";

// Seconds per swing of the pendulum: it ticks at the end of each.
const BEAT = 1;
// How far it swings either way, radians: its bob stays inside the window.
const SWING = 0.12;

/**
 * The grandfather clock, as a Group (see the top of this file).
 */
export function grandfatherClockModel(THREE) {
    const model = new THREE.Group();
    const add = (geometry, material, x, y, z) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        model.add(mesh);
        return mesh;
    };
    const material = (color, more = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...more });
    const oak = material(OAK);
    const dark = material(OAK_DARK, { roughness: 0.7 });
    const brass = material(BRASS, { metalness: 0.7, roughness: 0.3 });

    // The case: plinth, trunk and hood, with a dark moulding at each joint.
    for (const part of [PLINTH, TRUNK, HOOD]) {
        add(
            new THREE.BoxGeometry(part.half * 2, part.h, part.d),
            oak,
            0,
            part.y + part.h / 2,
            part.d / 2
        );
    }
    // [y, w, d] of each: the foot, and over the plinth and the trunk.
    for (const [y, w, d] of [
        [0.01, HALF * 2, DEPTH - 0.01],
        [TRUNK.y, HALF * 2 - 0.02, DEPTH],
        [HOOD.y, HALF * 2 - 0.02, DEPTH],
    ]) {
        add(new THREE.BoxGeometry(w, 0.02, d), dark, 0, y, d / 2);
    }

    // The trunk's window: the dark inside of the case, the pendulum hung
    // from the top of it, and a pane of glass over both.
    const windowW = TRUNK.half * 2 - 0.06;
    const windowH = TRUNK.h - 0.08;
    const windowY = TRUNK.y + TRUNK.h / 2;
    add(
        new THREE.PlaneGeometry(windowW, windowH),
        material(GLASS, { roughness: 0.9 }),
        0,
        windowY,
        TRUNK.d + 0.002
    );
    const rod = windowH * 0.7;
    const pendulum = new THREE.Group();
    pendulum.position.set(0, windowY + windowH / 2 - 0.02, TRUNK.d + 0.006);
    for (const [geometry, y] of [
        [new THREE.BoxGeometry(0.008, rod, 0.004), -rod / 2],
        [
            new THREE.CylinderGeometry(0.04, 0.04, 0.01, 24).rotateX(
                Math.PI / 2
            ),
            -rod,
        ],
    ]) {
        const mesh = new THREE.Mesh(geometry, brass);
        mesh.position.y = y;
        mesh.castShadow = true;
        pendulum.add(mesh);
    }
    model.add(pendulum);
    add(
        new THREE.PlaneGeometry(windowW, windowH),
        material("#ffffff", {
            transparent: true,
            opacity: 0.12,
            roughness: 0.05,
            metalness: 0.2,
        }),
        0,
        windowY,
        TRUNK.d + 0.014
    );
    model.userData.beat = BEAT;
    model.userData.swing = (time, still) => {
        const angle = still ? 0 : SWING * Math.cos((Math.PI * time) / BEAT);
        if (angle === pendulum.rotation.z) return false;
        pendulum.rotation.z = angle;
        return true;
    };

    // The face: the hall clocks' dial at ten past ten, in a brass ring.
    add(
        new THREE.CircleGeometry(FACE.r, 32),
        material("#ffffff", {
            map: dialTexture(THREE, CREAM, 10, 10),
            roughness: 0.8,
        }),
        0,
        FACE.y,
        HOOD.d + 0.002
    );
    add(
        new THREE.TorusGeometry(FACE.r, 0.012, 8, 32),
        brass,
        0,
        FACE.y,
        HOOD.d + 0.004
    );

    // The crown: a cornice the case's full width, a carved arch over the
    // face, and a brass finial on top.
    add(
        new THREE.BoxGeometry(HALF * 2, 0.025, DEPTH),
        dark,
        0,
        CROWN.y + 0.0125,
        DEPTH / 2
    );
    const archR = HALF - 0.04;
    const archH = CROWN.h - 0.025 - 0.015;
    add(
        new THREE.CylinderGeometry(
            archR,
            archR,
            0.04,
            24,
            1,
            false,
            -Math.PI / 2,
            Math.PI
        )
            .rotateX(-Math.PI / 2)
            .scale(1, archH / archR, 1),
        oak,
        0,
        CROWN.y + 0.025,
        DEPTH - 0.03
    );
    add(
        new THREE.SphereGeometry(0.015, 12, 8),
        brass,
        0,
        1 - 0.015,
        DEPTH - 0.03
    );

    return model;
}
