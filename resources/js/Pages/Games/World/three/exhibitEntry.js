import { canvasTexture } from "./useWorldRenderer.js";

// The door into Guster's exhibit gets the pomp of a museum grand opening,
// interpreted by somebody whose entire design vocabulary is toilets and toots.
export function exhibitEntryModel(THREE) {
    const group = new THREE.Group();
    const add = (geometry, material, x, y, z) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    const enamel = new THREE.MeshStandardMaterial({
        color: "#277a54",
        roughness: 0.34,
        metalness: 0.18,
    });
    const dark = new THREE.MeshStandardMaterial({
        color: "#321914",
        roughness: 0.58,
    });
    const brass = new THREE.MeshStandardMaterial({
        color: "#e9b94e",
        roughness: 0.3,
        metalness: 0.68,
    });
    const puff = new THREE.MeshStandardMaterial({
        color: "#a4d85c",
        roughness: 0.65,
        emissive: "#376321",
        emissiveIntensity: 0.16,
    });

    // A throne-like frame: green enamel pillars, brass caps, and a dark transom.
    for (const x of [-0.39, 0.39]) {
        add(new THREE.BoxGeometry(0.09, 0.82, 0.1), enamel, x, 0.41, 0.02);
        add(new THREE.CylinderGeometry(0.075, 0.09, 0.045, 16), brass, x, 0.82, 0.02);
        add(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 16), brass, x, 0.1, 0.02);
    }
    add(new THREE.BoxGeometry(0.92, 0.12, 0.12), dark, 0, 0.91, 0.02);
    add(new THREE.BoxGeometry(0.86, 0.025, 0.14), brass, 0, 0.84, 0.02);

    // The opening between the pillars is a door, set just behind their front
    // faces so the wall behind the frame doesn't show through. A dark leaf,
    // a brass-edged green panel split by a rail, a kick plate, hinges and a
    // knob. The plaque hangs on the leaf's upper half.
    add(new THREE.BoxGeometry(0.72, 0.83, 0.055), dark, 0, 0.415, 0.0345);
    add(new THREE.BoxGeometry(0.56, 0.36, 0.012), brass, 0, 0.3, 0.074);
    add(new THREE.BoxGeometry(0.44, 0.26, 0.016), enamel, 0, 0.3, 0.084);
    add(new THREE.BoxGeometry(0.56, 0.04, 0.012), brass, 0, 0.3, 0.105);
    add(new THREE.BoxGeometry(0.72, 0.1, 0.016), brass, 0, 0.05, 0.076);
    for (const y of [0.16, 0.42, 0.68]) {
        add(new THREE.BoxGeometry(0.045, 0.08, 0.016), brass, -0.325, y, 0.074);
    }
    add(new THREE.BoxGeometry(0.08, 0.16, 0.014), brass, 0.31, 0.42, 0.078);
    add(new THREE.SphereGeometry(0.034, 16, 12), brass, 0.31, 0.42, 0.108);

    // An absurdly formal plaque: a toilet-seat medallion with a little toot
    // cloud floating over it, like the exhibit has a royal coat of arms.
    const seat = add(
        new THREE.TorusGeometry(0.13, 0.025, 8, 28),
        enamel,
        0,
        0.89,
        0.105
    );
    seat.scale.set(1.18, 0.78, 1);
    add(new THREE.BoxGeometry(0.055, 0.11, 0.045), brass, 0, 0.91, 0.08);
    for (const [x, y, r] of [
        [-0.055, 0.985, 0.035],
        [0, 1.005, 0.04],
        [0.055, 0.985, 0.032],
    ]) {
        add(new THREE.SphereGeometry(r, 14, 10), puff, x, y, 0.09);
    }

    const badge = canvasTexture(THREE, 256, 128, (ctx) => {
        ctx.fillStyle = "#321914";
        ctx.fillRect(0, 0, 256, 128);
        ctx.strokeStyle = "#e9b94e";
        ctx.lineWidth = 10;
        ctx.strokeRect(7, 7, 242, 114);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "96px sans-serif";
        ctx.fillText("🚽💨", 128, 67);
    });
    const badgeMaterial = new THREE.MeshStandardMaterial({ map: badge, roughness: 0.5 });
    add(new THREE.BoxGeometry(0.42, 0.2, 0.035), dark, 0, 0.68, 0.08);
    const face = add(new THREE.PlaneGeometry(0.39, 0.17), badgeMaterial, 0, 0.68, 0.101);
    face.castShadow = false;

    // Keep the whole ornament just proud of its wall plane.
    group.position.z = 0.07;
    return group;
}
