import { FOOTPRINTS } from "./footprints.js";

// The Cockroach's armchair, where Cockroach Fart is played: a wingback in
// deep red velvet against the Nest's back wall, its high back buttoned in
// brass, rolled arms, a plump seat cushion, on four short legs of dark oak.
//
// Built one unit tall (the back's top), standing on y = 0, its middle on
// x = 0 and its back on z = 0, facing +z, so it stands flat against a wall,
// for the cast kit's modelMesh() to size and pose like a prop.

// The chair across its arms, its depth, and its cushion's top.
const HALF = FOOTPRINTS.armchair.w / 2;
const DEPTH = FOOTPRINTS.armchair.d;
const CUSHION = 0.45;
// Its legs, the seat on them under its cushion, and the arms either side
// of it: each arm `w` wide, rolled over at its top (`roll` its radius).
const LEGS = 0.1;
const CUSHION_H = 0.07;
const SEAT_H = CUSHION - LEGS - CUSHION_H;
const ARM = { w: 0.12, top: 0.6, roll: 0.06 };
// The back, behind the seat between the arms, and its wings.
const BACK = { d: 0.1, half: HALF - ARM.w };
const WING = { w: 0.06, y: ARM.top, h: 0.34, d: 0.16 };

const VELVET = "#7f1d1d";
const VELVET_DARK = "#5c1414";
const OAK = "#2e1a0d";
const BRASS = "#d4a73a";

/**
 * The armchair, as a Group (see the top of this file).
 */
export function armchairModel(THREE) {
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
        new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...more });
    const velvet = material(VELVET);
    const dark = material(VELVET_DARK);
    const oak = material(OAK, { roughness: 0.6 });
    const brass = material(BRASS, { metalness: 0.7, roughness: 0.3 });

    // Four short legs, turned in oak.
    const leg = new THREE.CylinderGeometry(0.025, 0.018, LEGS, 10);
    for (const x of [-HALF + 0.06, HALF - 0.06]) {
        for (const z of [0.05, DEPTH - 0.05]) {
            add(leg, oak, x, LEGS / 2, z);
        }
    }

    // The seat, and its cushion a little proud of it.
    add(
        new THREE.BoxGeometry(BACK.half * 2, SEAT_H, DEPTH),
        dark,
        0,
        LEGS + SEAT_H / 2,
        DEPTH / 2
    );
    add(
        new THREE.BoxGeometry(BACK.half * 2 - 0.01, CUSHION_H, DEPTH - BACK.d),
        velvet,
        0,
        CUSHION - CUSHION_H / 2,
        BACK.d + (DEPTH - BACK.d) / 2 + 0.01
    );

    // The arms, rolled over at their tops.
    const armH = ARM.top - LEGS;
    const arm = new THREE.BoxGeometry(ARM.w, armH, DEPTH);
    const roll = new THREE.CylinderGeometry(
        ARM.roll,
        ARM.roll,
        DEPTH,
        16
    ).rotateX(Math.PI / 2);
    for (const sx of [-1, 1]) {
        add(arm, velvet, sx * (HALF - ARM.w / 2), LEGS + armH / 2, DEPTH / 2);
        add(roll, velvet, sx * (HALF - ARM.roll), ARM.top, DEPTH / 2);
    }

    // The high back, rounded over its top, buttoned in brass, and its
    // wings standing forward either side, over the arms.
    const backH = 1 - BACK.half * 0.3 - LEGS;
    add(
        new THREE.BoxGeometry(BACK.half * 2, backH, BACK.d),
        velvet,
        0,
        LEGS + backH / 2,
        BACK.d / 2
    );
    add(
        new THREE.CylinderGeometry(
            BACK.half,
            BACK.half,
            BACK.d,
            24,
            1,
            false,
            -Math.PI / 2,
            Math.PI
        )
            .rotateX(-Math.PI / 2)
            .scale(1, 0.3, 1),
        velvet,
        0,
        LEGS + backH,
        BACK.d / 2
    );
    const button = new THREE.SphereGeometry(0.012, 8, 6);
    for (const [x, y] of [
        [-0.12, 0.62],
        [0, 0.62],
        [0.12, 0.62],
        [-0.06, 0.76],
        [0.06, 0.76],
        [0, 0.88],
    ]) {
        add(button, brass, x, y, BACK.d + 0.004);
    }
    const wing = new THREE.BoxGeometry(WING.w, WING.h, WING.d);
    for (const sx of [-1, 1]) {
        add(
            wing,
            dark,
            sx * (BACK.half + WING.w / 2),
            WING.y + WING.h / 2,
            BACK.d + WING.d / 2
        );
    }

    return model;
}
