import { FOOTPRINTS } from "./footprints.js";

// The Butt's House fridge, where Toot Foods' snacks are kept: a tall cream
// fridge with the freezer on top, a long chrome handle on each door, and a
// few fruit magnets (and a drawing) stuck on the fridge door.
//
// Built one unit tall, standing on y = 0, its middle on x = 0 and its back
// on z = 0, facing +z, so it stands flat against a wall, for the cast kit's
// modelMesh() to size and pose like a prop.

// The cabinet: half its width and its depth.
const HALF = FOOTPRINTS.fridge.w / 2;
const DEPTH = FOOTPRINTS.fridge.d;
// Its plinth, and where the freezer door meets the fridge door.
const PLINTH = 0.03;
const SPLIT = 0.68;
// The gap between the doors, and how thick a door is.
const SEAM = 0.008;
const DOOR = 0.02;

const BODY = "#f5f1e8";
const DOOR_COLOR = "#fbf8f2";
const SHADOW = "#57534e";
const CHROME = "#d4d4d8";
// Magnets on the fridge door: [x, y, colour], with the drawing below them.
const MAGNETS = [
    [-0.12, 0.6, "#ef4444"],
    [0.02, 0.56, "#f59e0b"],
    [-0.06, 0.48, "#22c55e"],
];
const DRAWING = { x: -0.07, y: 0.38, w: 0.14, h: 0.12, tilt: 0.12 };

/**
 * The fridge, as a Group (see the top of this file).
 */
export function fridgeModel(THREE) {
    const model = new THREE.Group();
    const add = (geometry, material, x, y, z) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        model.add(mesh);
        return mesh;
    };
    const body = new THREE.MeshStandardMaterial({
        color: BODY,
        roughness: 0.45,
    });
    const doors = new THREE.MeshStandardMaterial({
        color: DOOR_COLOR,
        roughness: 0.35,
    });
    const dark = new THREE.MeshStandardMaterial({
        color: SHADOW,
        roughness: 0.8,
    });
    const chrome = new THREE.MeshStandardMaterial({
        color: CHROME,
        metalness: 0.9,
        roughness: 0.2,
    });

    // The cabinet, on a dark plinth, its top a little rounded off.
    const cabinet = 1 - PLINTH - 0.01;
    add(
        new THREE.BoxGeometry(HALF * 2, cabinet, DEPTH - DOOR),
        body,
        0,
        PLINTH + cabinet / 2,
        (DEPTH - DOOR) / 2
    );
    add(
        new THREE.BoxGeometry(HALF * 2 - 0.04, PLINTH, DEPTH - 0.03),
        dark,
        0,
        PLINTH / 2,
        (DEPTH - 0.03) / 2
    );
    add(
        new THREE.CylinderGeometry(0.01, 0.01, HALF * 2, 8).rotateZ(
            Math.PI / 2
        ),
        body,
        0,
        1 - 0.01,
        (DEPTH - DOOR) / 2
    );

    // The doors: the freezer over the fridge, a seam between.
    const front = DEPTH - DOOR / 2;
    const freezerH = 1 - 0.01 - SPLIT - SEAM / 2;
    const fridgeH = SPLIT - SEAM / 2 - PLINTH;
    add(
        new THREE.BoxGeometry(HALF * 2 - 0.01, freezerH, DOOR),
        doors,
        0,
        SPLIT + SEAM / 2 + freezerH / 2,
        front
    );
    add(
        new THREE.BoxGeometry(HALF * 2 - 0.01, fridgeH, DOOR),
        doors,
        0,
        PLINTH + fridgeH / 2,
        front
    );

    // A chrome handle down the hinge-free side of each door, on stand-offs.
    const handleX = HALF - 0.05;
    const handles = [
        [SPLIT + 0.04, SPLIT + 0.2],
        [SPLIT - 0.24, SPLIT - 0.04],
    ];
    const bracket = new THREE.BoxGeometry(0.016, 0.016, 0.03);
    for (const [from, to] of handles) {
        const z = DEPTH + 0.03;
        add(
            new THREE.CylinderGeometry(0.012, 0.012, to - from, 10),
            chrome,
            handleX,
            (from + to) / 2,
            z
        );
        for (const y of [from + 0.01, to - 0.01]) {
            add(bracket, chrome, handleX, y, DEPTH + 0.015);
        }
    }

    // Fruit magnets, and a drawing held up under them.
    const magnet = new THREE.SphereGeometry(0.018, 12, 8);
    for (const [x, y, color] of MAGNETS) {
        add(
            magnet,
            new THREE.MeshStandardMaterial({ color, roughness: 0.4 }),
            x,
            y,
            DEPTH + 0.008
        );
    }
    const drawing = add(
        new THREE.PlaneGeometry(DRAWING.w, DRAWING.h),
        new THREE.MeshStandardMaterial({ color: "#fef9c3", roughness: 0.9 }),
        DRAWING.x,
        DRAWING.y,
        DEPTH + 0.002
    );
    drawing.rotation.z = DRAWING.tilt;
    // Its scribble: a brown butt, of course, a cheek either side.
    const cheek = new THREE.CircleGeometry(0.03, 16);
    const crayon = new THREE.MeshStandardMaterial({
        color: "#b45309",
        roughness: 0.9,
    });
    for (const dx of [-0.02, 0.02]) {
        add(
            cheek,
            crayon,
            DRAWING.x + dx,
            DRAWING.y - 0.01,
            DEPTH + 0.004
        ).scale.set(1.3, 1, 1);
    }
    add(magnet, dark, DRAWING.x, DRAWING.y + DRAWING.h / 2, DEPTH + 0.01);

    return model;
}
