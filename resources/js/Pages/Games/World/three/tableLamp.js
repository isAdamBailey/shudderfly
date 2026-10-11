// An old table lamp for the Butt's House entertainment center: a turned
// brass foot and stem, a pleated fabric shade with a finial on top, and a
// bulb inside. It is a lamp of the room's (a toy that switches its light),
// so the room hangs the light at its bulb (userData.bulb) and lights its
// shade and bulb (userData.setOn) while it's on.
//
// Built one unit tall, standing on y = 0, its middle on x = 0 and z = 0,
// for the cast kit's modelMesh() to size and pose like a prop.

const BRASS = "#c9a227";
const SHADE = "#f3e2c0";
// What the shade glows lit from inside, at the room's bulb brightness.
const SHADE_LIT = "#b9803f";
// The shade: its top and bottom radius, and where it hangs.
const SHADE_SIZE = { top: 0.17, bottom: 0.33, from: 0.5, to: 0.88 };
// How many pleats round the shade.
const PLEATS = 28;
// Where the bulb is, as a share of the lamp's height.
const BULB = 0.6;
// How brightly the shade glows while the lamp is on.
const GLOW_ON = 2;

/** The foot and stem's profile, from the floor up, spun round y. */
const STEM = [
    [0, 0],
    [0.2, 0],
    [0.21, 0.02],
    [0.17, 0.05],
    [0.08, 0.08],
    [0.045, 0.11],
    [0.03, 0.16],
    [0.03, 0.3],
    [0.06, 0.34],
    [0.03, 0.38],
    [0.025, 0.52],
    [0, 0.52],
];

/**
 * The lamp, as a Group (see the top of this file).
 */
export function tableLampModel(THREE) {
    const model = new THREE.Group();
    // Only the stem casts a shadow (`casts`); the shade is lit from
    // inside, and the small brass parts would cost a shadow draw each.
    const add = (geometry, material, y = 0, casts = false) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = y;
        mesh.castShadow = casts;
        mesh.receiveShadow = true;
        model.add(mesh);
        return mesh;
    };
    const brass = new THREE.MeshStandardMaterial({
        color: BRASS,
        metalness: 0.85,
        roughness: 0.3,
    });

    add(
        new THREE.LatheGeometry(
            STEM.map(([x, y]) => new THREE.Vector2(x, y)),
            32
        ),
        brass,
        0,
        true
    );

    // The shade and bulb glow together, so
    // the shade lit from inside reads as the light's source.
    const glow = new THREE.MeshStandardMaterial({
        color: SHADE,
        emissive: new THREE.Color(SHADE_LIT),
        emissiveIntensity: 0,
        roughness: 0.9,
        side: THREE.DoubleSide,
    });
    // Pleated: the shade's rim pushed in and out round it.
    const { top, bottom, from, to } = SHADE_SIZE;
    const shade = new THREE.CylinderGeometry(
        top,
        bottom,
        to - from,
        PLEATS * 2,
        1,
        true
    );
    const p = shade.attributes.position;
    for (let i = 0; i < p.count; i += 1) {
        const a = Math.atan2(p.getZ(i), p.getX(i));
        const k = 1 + 0.035 * Math.cos(a * PLEATS);
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * k);
    }
    shade.computeVertexNormals();
    add(shade, glow, (from + to) / 2);
    // A brass band round its top and bottom edges.
    for (const [r, y] of [
        [top, to],
        [bottom, from],
    ]) {
        add(
            new THREE.TorusGeometry(r, 0.008, 6, 48).rotateX(Math.PI / 2),
            brass,
            y
        );
    }
    add(new THREE.SphereGeometry(0.05, 16, 12), glow, BULB);
    // A harp up to the finial on top.
    add(
        new THREE.CylinderGeometry(0.008, 0.008, to - 0.52, 8),
        brass,
        (to + 0.52) / 2
    );
    add(new THREE.SphereGeometry(0.03, 16, 12), brass, to + 0.03);

    model.userData.setOn = (on) => {
        glow.emissiveIntensity = on ? GLOW_ON : 0;
    };
    model.userData.bulb = BULB;
    return model;
}
