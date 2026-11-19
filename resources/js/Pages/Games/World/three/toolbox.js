import { FOOTPRINTS } from "./footprints.js";

// The plumber's toolbox on the bathroom floor (Butts Not Working): a red
// steel box with a darker lid, two latches on its front and a carry handle
// on top, built to its footprint (footprints.js) with its back to the wall.
export function toolboxModel(THREE) {
    const { w, d, top } = FOOTPRINTS.toolbox;
    const group = new THREE.Group();
    const steel = (color, more = {}) =>
        new THREE.MeshStandardMaterial({
            color,
            roughness: 0.4,
            metalness: 0.35,
            ...more,
        });
    const chrome = steel("#cbd5e1", { roughness: 0.2, metalness: 0.85 });
    const add = (geometry, material, x, y, z) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };

    // The box, a little inside the lid all round.
    const lid = 0.12;
    const body = top - lid;
    add(
        new THREE.BoxGeometry(w - 0.04, body, d - 0.04),
        steel("#dc2626"),
        0,
        body / 2,
        d / 2
    );
    add(
        new THREE.BoxGeometry(w, lid, d),
        steel("#991b1b"),
        0,
        body + lid / 2,
        d / 2
    );

    // Latches holding the lid down, on the front.
    for (const x of [-w * 0.3, w * 0.3]) {
        add(new THREE.BoxGeometry(0.14, 0.16, 0.04), chrome, x, body, d);
    }

    // The handle: two posts and a bar between them.
    const post = 0.2;
    const across = w * 0.28;
    for (const x of [-across, across]) {
        add(
            new THREE.BoxGeometry(0.06, post, 0.06),
            chrome,
            x,
            top + post / 2,
            d / 2
        );
    }
    add(
        new THREE.CylinderGeometry(0.05, 0.05, across * 2 + 0.1, 16).rotateZ(
            Math.PI / 2
        ),
        steel("#111827", { metalness: 0.1, roughness: 0.7 }),
        0,
        top + post,
        d / 2
    );
    return group;
}
