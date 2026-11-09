// A freestanding control altar for Guster's exhibit: walnut plinth, enamel
// console, brass controls and a warm central indicator. It is a landmark for
// the personal soundboard, not a speaker; playback happens only in the user's
// browser.
export function soundAltarModel(THREE) {
    const group = new THREE.Group();
    const add = (geometry, material, x, y, z) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    const material = (color, more = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...more });
    const wood = material("#392116", { roughness: 0.58 });
    const darkWood = material("#24150f", { roughness: 0.62 });
    const enamel = material("#14554c", { metalness: 0.18, roughness: 0.32 });
    const brass = material("#d2a64a", { metalness: 0.72, roughness: 0.28 });
    const black = material("#15191b", { roughness: 0.3 });
    const glow = material("#ffcf6b", {
        emissive: "#ff8c27",
        emissiveIntensity: 0.8,
        roughness: 0.3,
    });

    // A substantial stepped base makes the console feel planted in the room.
    add(new THREE.BoxGeometry(0.95, 0.08, 0.58), darkWood, 0, 0.04, 0.29);
    add(new THREE.BoxGeometry(0.84, 0.48, 0.48), wood, 0, 0.32, 0.29);
    add(new THREE.BoxGeometry(0.88, 0.035, 0.51), brass, 0, 0.12, 0.29);
    add(new THREE.BoxGeometry(0.78, 0.035, 0.43), enamel, 0, 0.57, 0.29);

    // The sloped face points toward the room entrance, with a readable row of
    // knobs and a central dial; no tiny decorative text that would blur in 3D.
    const face = add(
        new THREE.BoxGeometry(0.7, 0.2, 0.035),
        black,
        0,
        0.69,
        0.475
    );
    face.rotation.x = -0.3;
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 32), brass, 0, 0.69, 0.51);
    add(new THREE.CylinderGeometry(0.072, 0.072, 0.028, 32), black, 0, 0.69, 0.53);
    add(new THREE.SphereGeometry(0.026, 16, 12), glow, 0, 0.69, 0.55);

    for (const x of [-0.24, -0.14, 0.14, 0.24]) {
        add(new THREE.CylinderGeometry(0.026, 0.032, 0.035, 16), brass, x, 0.69, 0.536);
        add(new THREE.BoxGeometry(0.008, 0.045, 0.025), darkWood, x, 0.73, 0.542);
    }

    // Speaker grilles flank the controls on the front of the cabinet.
    for (const x of [-0.23, 0.23]) {
        add(new THREE.BoxGeometry(0.19, 0.19, 0.018), darkWood, x, 0.34, 0.54);
        for (let y = 0.27; y <= 0.41; y += 0.035) {
            add(new THREE.BoxGeometry(0.145, 0.008, 0.01), brass, x, y, 0.555);
        }
    }

    // A small brass cap above the face gives it a ceremonial silhouette.
    add(new THREE.CylinderGeometry(0.11, 0.15, 0.08, 8), brass, 0, 0.86, 0.27);
    add(new THREE.SphereGeometry(0.07, 20, 14), enamel, 0, 0.91, 0.27);
    add(new THREE.SphereGeometry(0.022, 14, 10), glow, 0, 0.93, 0.31);

    return group;
}
