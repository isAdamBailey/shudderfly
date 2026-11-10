import { FOOTPRINTS } from "./footprints.js";

// The Butt's House microwave, where Brussels Sprout Chicken Pox starts: a
// white countertop oven on the kitchen's side counter, a black glass door
// with sprouts turning inside, a chrome handle, and a panel of buttons.
//
// Built one unit tall, standing on y = 0, its middle on x = 0 and its back
// on z = 0, facing +z, so it stands flat against a wall, for the cast kit's
// modelMesh() to size and pose like a prop.

// The cabinet: half its width, and how deep it is before the door. The
// door and handle stand a little proud of the footprint's depth.
const HALF = FOOTPRINTS.microwave.w / 2;
const CABINET_D = 0.4;
const FEET = 0.03;
// The door across the left of the face, and the control panel beside it.
const DOOR = { x: -0.16, w: 1.02, h: 0.78, y: 0.52 };
const PANEL = { x: 0.5, w: 0.34, h: 0.78, y: 0.52 };
// Sprouts seen through the window: [x, y, radius].
const SPROUTS = [
    [-0.32, 0.5, 0.07],
    [-0.16, 0.58, 0.055],
    [-0.1, 0.42, 0.06],
];

const ENAMEL = "#f8fafc";
const BLACK = "#18181b";
const CHROME = "#d4d4d8";
const SPROUT = "#4d7c0f";
const SPROUT_LIT = "#84cc16";

/**
 * The microwave, as a Group (see the top of this file).
 */
export function microwaveModel(THREE) {
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
    const chrome = new THREE.MeshStandardMaterial({
        color: CHROME,
        metalness: 0.9,
        roughness: 0.2,
    });

    // The cabinet, on short feet.
    const bodyH = 1 - FEET;
    add(
        new THREE.BoxGeometry(HALF * 2, bodyH, CABINET_D),
        enamel,
        0,
        FEET + bodyH / 2,
        CABINET_D / 2
    );
    add(
        new THREE.BoxGeometry(HALF * 1.7, FEET, CABINET_D - 0.06),
        black,
        0,
        FEET / 2,
        (CABINET_D - 0.06) / 2 + 0.02
    );

    // The door, with a window and a chrome handle down its right edge.
    const front = CABINET_D;
    add(
        new THREE.BoxGeometry(DOOR.w, DOOR.h, 0.016),
        enamel,
        DOOR.x,
        DOOR.y,
        front + 0.008
    );
    add(
        new THREE.BoxGeometry(DOOR.w - 0.16, DOOR.h - 0.16, 0.01),
        black,
        DOOR.x - 0.04,
        DOOR.y,
        front + 0.02
    );
    add(
        new THREE.PlaneGeometry(DOOR.w - 0.28, DOOR.h - 0.28),
        new THREE.MeshStandardMaterial({
            color: "#14532d",
            emissive: new THREE.Color("#365314"),
            emissiveIntensity: 0.45,
            roughness: 0.2,
        }),
        DOOR.x - 0.04,
        DOOR.y,
        front + 0.026
    );
    const sprout = new THREE.SphereGeometry(1, 14, 10);
    for (const [i, [x, y, r]] of SPROUTS.entries()) {
        add(
            sprout,
            new THREE.MeshStandardMaterial({
                color: i === 1 ? SPROUT_LIT : SPROUT,
                roughness: 0.6,
            }),
            x,
            y,
            front + 0.03
        ).scale.setScalar(r);
    }
    add(
        new THREE.CylinderGeometry(0.016, 0.016, DOOR.h * 0.55, 12),
        chrome,
        DOOR.x + DOOR.w / 2 - 0.06,
        DOOR.y,
        front + 0.09
    );

    // The control panel: a display and a grid of buttons.
    add(
        new THREE.BoxGeometry(PANEL.w, PANEL.h, 0.016),
        black,
        PANEL.x,
        PANEL.y,
        front + 0.008
    );
    add(
        new THREE.PlaneGeometry(PANEL.w - 0.1, 0.1),
        new THREE.MeshStandardMaterial({
            color: "#052e16",
            emissive: new THREE.Color("#22c55e"),
            emissiveIntensity: 0.6,
            roughness: 0.3,
        }),
        PANEL.x,
        PANEL.y + 0.24,
        front + 0.018
    );
    const button = new THREE.CylinderGeometry(0.028, 0.028, 0.012, 12).rotateX(
        Math.PI / 2
    );
    for (const y of [0.08, -0.04, -0.16]) {
        for (const x of [-0.07, 0.07]) {
            add(
                button,
                chrome,
                PANEL.x + x,
                PANEL.y + y,
                front + 0.02
            );
        }
    }

    // Slots along the top, sitting on the cabinet.
    for (const x of [-0.4, -0.28, -0.16]) {
        add(
            new THREE.BoxGeometry(0.07, 0.012, 0.16),
            black,
            x,
            1 + 0.004,
            CABINET_D * 0.45
        );
    }

    return model;
}
