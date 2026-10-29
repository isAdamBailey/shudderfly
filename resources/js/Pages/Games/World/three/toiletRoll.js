// A wall-mounted toilet roll: a chrome axle, white paper roll and a short
// sheet hanging down, placed beside the toilet at seat height.
export function toiletRollModel(THREE) {
    const group = new THREE.Group();
    const add = (geometry, color, x, y, z, more = {}) => {
        const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...more })
        );
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };

    add(new THREE.BoxGeometry(0.45, 1, 0.035), "#f8fafc", 0, 0.5, 0.015, {
        metalness: 0.72,
        roughness: 0.24,
    });
    add(
        new THREE.CylinderGeometry(0.22, 0.22, 0.45, 28).rotateZ(Math.PI / 2),
        "#ffffff",
        0,
        0.56,
        0.14
    ).scale.z = 0.42;
    add(
        new THREE.CylinderGeometry(0.035, 0.035, 0.45, 16).rotateZ(Math.PI / 2),
        "#94a3b8",
        0,
        0.56,
        0.14,
        { metalness: 0.8, roughness: 0.2 }
    );
    const sheet = add(new THREE.PlaneGeometry(0.18, 0.28), "#ffffff", 0.08, 0.31, 0.23);
    sheet.rotation.z = -0.08;
    return group;
}
