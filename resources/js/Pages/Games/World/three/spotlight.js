// A theatre spotlight for the auditorium, hung from the curtain's valance:
// a black can in a yoke clamped to a pipe, tipped down and back to shine
// onto the stage behind the curtain, its lens lit while its light is on. It
// is a lamp of the room's (a toy that switches its light), so the room hangs
// the light at its lens (userData.bulb up, userData.lens out in z, back
// toward the stage) and lights the lens (userData.setOn).
//
// Built one unit tall (the clamp's top), standing on y = 0, its middle on
// x = 0 and z = 0, facing +z (toward the audience), for the cast kit's
// modelMesh() to size and pose like a prop.

const BLACK = "#18181b";
const STEEL = "#52525b";
const LENS = "#fef3c7";
const LENS_LIT = "#fde68a";
// The can's pivot in the yoke, and how far it's tipped from pointing
// straight down toward the stage (-z), radians.
const PIVOT = 0.348;
const TIP = 0.65;
// The can: its radius and length; the lens at its lower end.
const CAN = { radius: 0.2, length: 0.5 };
// How brightly the lens glows while it's on.
const GLOW_ON = 2.5;

/**
 * The spotlight, as a Group (see the top of this file).
 */
export function spotlightModel(THREE) {
    const model = new THREE.Group();
    const black = new THREE.MeshStandardMaterial({
        color: BLACK,
        metalness: 0.4,
        roughness: 0.5,
    });
    const steel = new THREE.MeshStandardMaterial({
        color: STEEL,
        metalness: 0.8,
        roughness: 0.35,
    });
    const lens = new THREE.MeshStandardMaterial({
        color: LENS,
        emissive: new THREE.Color(LENS_LIT),
        emissiveIntensity: 0,
        roughness: 0.2,
    });
    const add = (parent, geometry, material, [x, y, z]) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        parent.add(mesh);
        return mesh;
    };

    // The clamp on its pipe, and the stem down to the yoke.
    add(
        model,
        new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12).rotateZ(Math.PI / 2),
        steel,
        [0, 0.95, 0]
    );
    add(model, new THREE.BoxGeometry(0.1, 0.12, 0.12), black, [0, 0.88, 0]);
    add(
        model,
        new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8),
        steel,
        [0, 0.76, 0]
    );
    // The yoke: a bar over the can and an arm down each side to its pivot.
    const half = CAN.radius + 0.04;
    add(
        model,
        new THREE.BoxGeometry(half * 2 + 0.04, 0.04, 0.05),
        black,
        [0, 0.68, 0]
    );
    for (const side of [-1, 1]) {
        add(model, new THREE.BoxGeometry(0.04, 0.68 - PIVOT, 0.05), black, [
            side * half,
            (0.68 + PIVOT) / 2,
            0,
        ]);
    }

    // The can, tipped on its pivot: along its own y, the lens at -y.
    const can = new THREE.Group();
    can.position.set(0, PIVOT, 0);
    can.rotation.x = TIP;
    model.add(can);
    add(
        can,
        new THREE.CylinderGeometry(
            CAN.radius * 0.8,
            CAN.radius,
            CAN.length,
            24
        ),
        black,
        [0, 0, 0]
    );
    add(
        can,
        new THREE.TorusGeometry(CAN.radius, 0.02, 8, 24).rotateX(Math.PI / 2),
        steel,
        [0, -CAN.length / 2, 0]
    );
    add(
        can,
        new THREE.CircleGeometry(CAN.radius * 0.9, 24).rotateX(Math.PI / 2),
        lens,
        [0, -CAN.length / 2 - 0.005, 0]
    ).castShadow = false;

    model.userData.setOn = (on) => {
        lens.emissiveIntensity = on ? GLOW_ON : 0;
    };
    // The lens, where the light shines from: up the model, and back in z
    // where the can is tipped toward the stage.
    const along = -CAN.length / 2 - 0.005;
    model.userData.bulb = PIVOT + along * Math.cos(TIP);
    model.userData.lens = along * Math.sin(TIP);
    return model;
}
