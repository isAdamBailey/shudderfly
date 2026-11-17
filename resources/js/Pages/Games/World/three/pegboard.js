import { FOOTPRINTS } from "./footprints.js";

// The Garage's tool pegboard (issue #227): a brown board of peg holes in
// a wooden frame, hung with a hammer, a wrench, a saw and a coil of hose.
// One unit tall, FOOTPRINTS.pegboard wide, standing on y = 0, flat on its
// wall.

const BOARD = "#a16207";
const FRAME = "#78350f";
const STEEL = "#94a3b8";

export function pegboardModel(THREE) {
    const { w, d } = FOOTPRINTS.pegboard;
    const group = new THREE.Group();
    // One material per finish, shared by everything in it.
    const materials = new Map();
    const material = (color, more) => {
        const key = color + JSON.stringify(more);
        if (!materials.has(key)) {
            materials.set(
                key,
                new THREE.MeshStandardMaterial({
                    color,
                    roughness: 0.75,
                    ...more,
                })
            );
        }
        return materials.get(key);
    };
    const add = (geometry, color, x, y, z, more = {}) => {
        const mesh = new THREE.Mesh(geometry, material(color, more));
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };

    add(new THREE.BoxGeometry(w, 1, d / 2), BOARD, 0, 0.5, d / 4);
    for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) {
        add(new THREE.BoxGeometry(0.06, 1, d), FRAME, x, 0.5, d / 2);
    }
    for (const y of [0.03, 0.97]) {
        add(new THREE.BoxGeometry(w, 0.06, d), FRAME, 0, y, d / 2);
    }
    // The peg holes, one instanced dot each.
    const holes = new THREE.InstancedMesh(
        new THREE.CircleGeometry(0.012, 6),
        new THREE.MeshBasicMaterial({ color: "#3f2a12" }),
        13 * 8
    );
    const at = new THREE.Matrix4();
    let n = 0;
    for (let i = 0; i < 13; i += 1) {
        for (let j = 0; j < 8; j += 1) {
            at.makeTranslation(
                -w / 2 + 0.12 + (i * (w - 0.24)) / 12,
                0.1 + j * 0.115,
                d / 2 + 0.002
            );
            holes.setMatrixAt(n, at);
            n += 1;
        }
    }
    group.add(holes);

    const out = d / 2 + 0.03;
    // A hammer: its handle and head.
    add(new THREE.BoxGeometry(0.05, 0.42, 0.04), "#b45309", -0.5, 0.48, out);
    add(new THREE.BoxGeometry(0.2, 0.08, 0.06), STEEL, -0.5, 0.72, out, {
        metalness: 0.7,
        roughness: 0.3,
    });
    // A wrench.
    add(new THREE.BoxGeometry(0.05, 0.46, 0.03), STEEL, -0.2, 0.5, out, {
        metalness: 0.8,
        roughness: 0.25,
    });
    add(
        new THREE.TorusGeometry(0.06, 0.02, 8, 16, Math.PI * 1.5),
        STEEL,
        -0.2,
        0.77,
        out,
        { metalness: 0.8, roughness: 0.25 }
    );
    // A saw: its blade and handle.
    const blade = add(
        new THREE.BoxGeometry(0.42, 0.14, 0.01),
        "#cbd5e1",
        0.18,
        0.45,
        out,
        { metalness: 0.8, roughness: 0.2 }
    );
    blade.rotation.z = -0.12;
    add(new THREE.BoxGeometry(0.1, 0.16, 0.04), "#dc2626", 0.42, 0.5, out);
    // A coil of green hose.
    add(
        new THREE.TorusGeometry(0.13, 0.035, 8, 24),
        "#16a34a",
        0.55,
        0.62,
        out
    );
    return group;
}
