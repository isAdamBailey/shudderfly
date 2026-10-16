import { MACHINE_COLORS } from "../minigames/TootSlots/machineColors.js";
import { FOOTPRINTS } from "./footprints.js";

// Guster's washing machine, where Toot Catch is played: a white front
// loader against his back wall, a toot-green control panel across its top
// with a dial and two buttons, and a round chrome-rimmed door whose window
// shows his greens tumbling inside, over a kick plate.
//
// Built one unit tall, standing on y = 0, its middle on x = 0 and its back
// on z = 0, facing +z, so it stands flat against a wall, for the cast kit's
// modelMesh() to size and pose like a prop.

// The cabinet: half its width and its depth.
const HALF = FOOTPRINTS["washing-machine"].w / 2;
const DEPTH = FOOTPRINTS["washing-machine"].d;
// Its kick plate, and the control panel across the top of its face.
const PLINTH = 0.04;
const PANEL = { y: 0.84, h: 0.14 };
const PANEL_MID = PANEL.y + PANEL.h / 2;
// The door: its middle up the face and its window's radius.
const DOOR = { y: 0.44, r: 0.24 };
// The washing seen through the window: [x, y, radius, colour].
const WASHING = [
    [-0.08, -0.1, 0.1, MACHINE_COLORS.green],
    [0.09, -0.06, 0.09, MACHINE_COLORS.greenLight],
    [0, -0.16, 0.08, MACHINE_COLORS.cloud],
];

const ENAMEL = "#f8fafc";
const SHADOW = "#57534e";
const CHROME = "#d4d4d8";
const GLASS = "#1e3a5f";

/**
 * The washing machine, as a Group (see the top of this file).
 */
export function washingMachineModel(THREE) {
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
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, ...more });
    const enamel = material(ENAMEL, { roughness: 0.35 });
    const chrome = material(CHROME, { metalness: 0.9, roughness: 0.2 });
    const green = material(MACHINE_COLORS.green);

    // The cabinet, on a dark kick plate.
    add(
        new THREE.BoxGeometry(HALF * 2, 1 - PLINTH, DEPTH),
        enamel,
        0,
        PLINTH + (1 - PLINTH) / 2,
        DEPTH / 2
    );
    add(
        new THREE.BoxGeometry(HALF * 2 - 0.04, PLINTH, DEPTH - 0.03),
        material(SHADOW, { roughness: 0.8 }),
        0,
        PLINTH / 2,
        (DEPTH - 0.03) / 2
    );

    // The control panel: green, with a chrome dial and two gold buttons,
    // and the soap drawer at its left.
    add(
        new THREE.PlaneGeometry(HALF * 2 - 0.04, PANEL.h),
        green,
        0,
        PANEL_MID,
        DEPTH + 0.002
    );
    add(
        new THREE.BoxGeometry(0.2, PANEL.h - 0.04, 0.012),
        enamel,
        -HALF + 0.14,
        PANEL_MID,
        DEPTH + 0.006
    );
    add(
        new THREE.CylinderGeometry(0.04, 0.045, 0.03, 20).rotateX(Math.PI / 2),
        chrome,
        HALF - 0.12,
        PANEL_MID,
        DEPTH + 0.015
    );
    const button = new THREE.CylinderGeometry(0.016, 0.016, 0.014, 12).rotateX(
        Math.PI / 2
    );
    const gold = material(MACHINE_COLORS.gold);
    for (const x of [0.04, 0.1]) {
        add(button, gold, x, PANEL_MID, DEPTH + 0.008);
    }

    // The door: a chrome rim round a dark window, the washing inside it,
    // and a handle at its right.
    add(
        new THREE.TorusGeometry(DOOR.r, 0.03, 10, 40),
        chrome,
        0,
        DOOR.y,
        DEPTH + 0.02
    );
    add(
        new THREE.CircleGeometry(DOOR.r, 40),
        material(GLASS, { roughness: 0.1, metalness: 0.3 }),
        0,
        DOOR.y,
        DEPTH + 0.004
    );
    // Each a hair in front of the last, so where they overlap none flickers.
    WASHING.forEach(([x, y, r, color], i) => {
        add(
            new THREE.CircleGeometry(r, 20),
            material(color, { roughness: 0.9 }),
            x,
            DOOR.y + y,
            DEPTH + 0.006 + i * 0.002
        );
    });
    add(
        new THREE.BoxGeometry(0.03, 0.1, 0.03),
        chrome,
        DOOR.r + 0.04,
        DOOR.y,
        DEPTH + 0.02
    );

    return model;
}
