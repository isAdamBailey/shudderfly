import { FOOTPRINTS } from "./footprints.js";

// The Butt's House oven, where Costco Food Poop's pizza bakes: a white
// range between the kitchen counters, a black cooktop with four burners
// level with the worktop, a backguard with its clock, a row of knobs, and
// an oven door with a long chrome handle and a window lit warm inside.
//
// Built one unit tall (the backguard's top), standing on y = 0, its middle
// on x = 0 and its back on z = 0, facing +z, so it stands flat against a
// wall, for the cast kit's modelMesh() to size and pose like a prop.

// The range: half its width, its depth, and the cooktop's height (the
// counters' worktop, GamesWorld::KITCHEN_COUNTER, at the oven's size).
const HALF = FOOTPRINTS.oven.w / 2;
const DEPTH = FOOTPRINTS.oven.d;
const COOKTOP = FOOTPRINTS.oven.top;
// The control strip across the front under the cooktop, and the oven door
// under it, over a drawer.
const STRIP = { y: 0.76, h: 0.08 };
const DRAWER = { y: 0.04, h: 0.12 };
// The backguard, along the back of the cooktop.
const GUARD = { d: 0.06, h: 1 - COOKTOP };
// The burners, as [x, z, radius].
const BURNERS = [
    [-0.24, 0.13, 0.08],
    [0.24, 0.13, 0.08],
    [-0.24, 0.29, 0.065],
    [0.24, 0.29, 0.065],
];

const ENAMEL = "#f8fafc";
const BLACK = "#18181b";
const COIL = "#3f3f46";
const CHROME = "#d4d4d8";
const GLOW = "#f97316";

/**
 * The oven, as a Group (see the top of this file).
 */
export function ovenModel(THREE) {
    const model = new THREE.Group();
    const add = (geometry, material, x, y, z) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        model.add(mesh);
        return mesh;
    };
    const enamel = new THREE.MeshStandardMaterial({
        color: ENAMEL,
        roughness: 0.35,
    });
    const black = new THREE.MeshStandardMaterial({
        color: BLACK,
        roughness: 0.25,
        metalness: 0.2,
    });
    const coil = new THREE.MeshStandardMaterial({
        color: COIL,
        roughness: 0.6,
        metalness: 0.4,
    });
    const chrome = new THREE.MeshStandardMaterial({
        color: CHROME,
        metalness: 0.9,
        roughness: 0.2,
    });

    // The body, on its plinth, and its black cooktop.
    const bodyH = COOKTOP - 0.02 - DRAWER.y;
    add(
        new THREE.BoxGeometry(HALF * 2, bodyH, DEPTH),
        enamel,
        0,
        DRAWER.y + bodyH / 2,
        DEPTH / 2
    );
    add(
        new THREE.BoxGeometry(HALF * 2, 0.02, DEPTH),
        black,
        0,
        COOKTOP - 0.01,
        DEPTH / 2
    );
    for (const [x, z, r] of BURNERS) {
        add(
            new THREE.TorusGeometry(r, 0.012, 8, 24).rotateX(Math.PI / 2),
            coil,
            x,
            COOKTOP + 0.006,
            z
        );
        add(
            new THREE.TorusGeometry(r * 0.5, 0.01, 8, 18).rotateX(Math.PI / 2),
            coil,
            x,
            COOKTOP + 0.006,
            z
        );
    }

    // The backguard, with a little clock in its middle.
    add(
        new THREE.BoxGeometry(HALF * 2, GUARD.h, GUARD.d),
        enamel,
        0,
        COOKTOP + GUARD.h / 2,
        GUARD.d / 2
    );
    add(
        new THREE.PlaneGeometry(0.16, 0.07),
        new THREE.MeshStandardMaterial({
            color: "#052e16",
            emissive: new THREE.Color("#22c55e"),
            emissiveIntensity: 0.6,
            roughness: 0.3,
        }),
        0,
        COOKTOP + GUARD.h / 2,
        GUARD.d + 0.002
    );

    // The control strip and its knobs, one for each burner and the oven's.
    const front = DEPTH;
    add(
        new THREE.BoxGeometry(HALF * 2 - 0.04, STRIP.h, 0.01),
        black,
        0,
        STRIP.y,
        front + 0.005
    );
    const knob = new THREE.CylinderGeometry(0.026, 0.03, 0.03, 16).rotateX(
        Math.PI / 2
    );
    for (const x of [-0.42, -0.3, -0.18, 0.18, 0.3, 0.42]) {
        add(knob, chrome, x, STRIP.y, front + 0.025);
    }

    // The oven door: a window lit warm (something's baking), framed in
    // black, with a chrome bar of a handle along its top.
    const doorY0 = DRAWER.y + DRAWER.h + 0.02;
    const doorY1 = STRIP.y - STRIP.h / 2 - 0.02;
    const doorH = doorY1 - doorY0;
    add(
        new THREE.BoxGeometry(HALF * 2 - 0.06, doorH, 0.02),
        enamel,
        0,
        doorY0 + doorH / 2,
        front + 0.01
    );
    add(
        new THREE.BoxGeometry(HALF * 1.3, doorH * 0.58, 0.01),
        black,
        0,
        doorY0 + doorH * 0.42,
        front + 0.022
    );
    add(
        new THREE.PlaneGeometry(HALF * 1.1, doorH * 0.44),
        new THREE.MeshStandardMaterial({
            color: "#431407",
            emissive: new THREE.Color(GLOW),
            emissiveIntensity: 0.55,
            roughness: 0.2,
        }),
        0,
        doorY0 + doorH * 0.42,
        front + 0.028
    );
    add(
        new THREE.CylinderGeometry(0.014, 0.014, HALF * 1.5, 10).rotateZ(
            Math.PI / 2
        ),
        chrome,
        0,
        doorY1 - 0.05,
        front + 0.06
    );
    const bracket = new THREE.BoxGeometry(0.016, 0.016, 0.04);
    for (const sx of [-1, 1]) {
        add(bracket, chrome, sx * HALF * 0.7, doorY1 - 0.05, front + 0.03);
    }

    // The drawer under it, with its own handle, on a dark plinth.
    add(
        new THREE.BoxGeometry(HALF * 2 - 0.06, DRAWER.h, 0.02),
        enamel,
        0,
        DRAWER.y + DRAWER.h / 2,
        front + 0.01
    );
    add(
        new THREE.BoxGeometry(HALF * 0.6, 0.014, 0.02),
        chrome,
        0,
        DRAWER.y + DRAWER.h * 0.7,
        front + 0.03
    );
    add(
        new THREE.BoxGeometry(HALF * 2 - 0.02, DRAWER.y, DEPTH - 0.03),
        black,
        0,
        DRAWER.y / 2,
        (DEPTH - 0.03) / 2
    );

    return model;
}
