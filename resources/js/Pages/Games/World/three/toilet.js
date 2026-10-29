import { FOOTPRINTS } from "./footprints.js";

// A close-coupled porcelain toilet against the bathroom's tiled back wall,
// facing into the room. Like the room's other fixture models it is one unit
// tall, with its back at z = 0.
const HALF = FOOTPRINTS.toilet.w / 2;
const DEPTH = FOOTPRINTS.toilet.d;
const PORCELAIN = "#f8fafc";
const SHADOW = "#cbd5e1";
const SEAT = "#e2e8f0";
const WATER = "#bfdbfe";

export function toiletModel(THREE) {
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
        new THREE.MeshStandardMaterial({ color, roughness: 0.24, ...more });

    // The tank sits flush to the wall with a small chrome flush button.
    add(
        new THREE.BoxGeometry(HALF * 1.5, 0.42, 0.16),
        material(PORCELAIN),
        0,
        0.78,
        0.08
    );
    add(
        new THREE.CylinderGeometry(0.025, 0.025, 0.012, 20),
        material("#cbd5e1", { metalness: 0.75, roughness: 0.2 }),
        0,
        1,
        0.08
    );

    // A sturdy pedestal supports the rounded bowl projecting into the room.
    add(
        new THREE.CylinderGeometry(0.15, 0.19, 0.36, 32),
        material(PORCELAIN),
        0,
        0.19,
        0.29
    );
    const bowl = add(
        new THREE.SphereGeometry(1, 40, 24),
        material(PORCELAIN),
        0,
        0.42,
        0.31
    );
    bowl.scale.set(HALF * 0.94, 0.21, 0.19);
    const water = add(
        new THREE.CircleGeometry(1, 40),
        material(WATER, { roughness: 0.12, metalness: 0.08 }),
        0,
        0.47,
        0.33
    );
    water.rotation.x = -Math.PI / 2;
    water.scale.set(HALF * 0.52, 0.12, 1);
    // The closed seat and lid read clearly from the room's camera.
    const seat = add(
        new THREE.TorusGeometry(0.17, 0.025, 10, 40),
        material(SEAT),
        0,
        0.58,
        0.32
    );
    seat.rotation.x = Math.PI / 2;
    seat.scale.set(1.2, 0.82, 1);
    add(
        new THREE.BoxGeometry(HALF * 1.34, 0.035, 0.025),
        material(SEAT),
        0,
        0.58,
        0.14
    );

    // A porcelain foot at floor level gives the fixture a grounded outline.
    add(
        new THREE.CylinderGeometry(0.18, 0.2, 0.055, 32),
        material(SHADOW),
        0,
        0.028,
        0.29
    );
    return model;
}
