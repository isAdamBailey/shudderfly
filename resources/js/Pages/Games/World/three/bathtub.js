import { FOOTPRINTS } from "./footprints.js";

// An oversized white enamel clawfoot bath against the opposite tiled wall,
// with ornate gold trim, a raised rear ledge, shower and toiletries.
const { w: WIDTH, d: DEPTH } = FOOTPRINTS.bathtub;
const WHITE = "#f8fafc";

export function bathtubModel(THREE) {
    const group = new THREE.Group();
    const bubbles = [];
    const add = (geometry, color, x, y, z, more = {}) => {
        const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({ color, roughness: 0.32, ...more })
        );
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    };
    const chrome = { metalness: 0.86, roughness: 0.2 };

    // Build an open shell from an apron, base and raised sides so the large
    // blue basin is visible from above and clearly has room for the Butt.
    add(new THREE.BoxGeometry(WIDTH - 0.08, 0.14, DEPTH - 0.08), WHITE, 0, 0.1, DEPTH / 2);
    // Leave a broad entry in the front apron so the Butt can step into the
    // basin. The matching floor blocker leaves this same opening clear.
    const entryWidth = WIDTH * 0.68;
    const apronSide = (WIDTH - entryWidth) / 2;
    for (const side of [-1, 1]) {
        add(
            new THREE.BoxGeometry(apronSide, 0.31, 0.07),
            WHITE,
            side * (entryWidth / 2 + apronSide / 2),
            0.25,
            DEPTH - 0.035
        );
    }
    add(new THREE.BoxGeometry(0.07, 0.31, DEPTH - 0.08), WHITE, -WIDTH / 2 + 0.035, 0.25, DEPTH / 2);
    add(new THREE.BoxGeometry(0.07, 0.31, DEPTH - 0.08), WHITE, WIDTH / 2 - 0.035, 0.25, DEPTH / 2);
    add(new THREE.BoxGeometry(WIDTH - 0.08, 0.31, 0.07), WHITE, 0, 0.25, 0.035);
    add(
        new THREE.BoxGeometry(WIDTH - 0.18, 0.018, DEPTH - 0.2),
        "#93c5fd",
        0, 0.18, DEPTH / 2,
        { roughness: 0.16, metalness: 0.08 }
    );
    add(new THREE.BoxGeometry(WIDTH - 0.06, 0.11, 0.1), "#e2e8f0", 0, 0.42, 0.05);

    // Gold lines and embossed medallions dress the tub's front apron.
    const gold = "#fbbf24";
    for (const side of [-1, 1]) {
        const trimWidth = (WIDTH - entryWidth) / 2 - 0.05;
        const trimX = side * (entryWidth / 2 + trimWidth / 2);
        add(new THREE.BoxGeometry(trimWidth, 0.025, 0.012), gold, trimX, 0.12, DEPTH + 0.006, { metalness: 0.7 });
        add(new THREE.BoxGeometry(trimWidth, 0.018, 0.012), gold, trimX, 0.3, DEPTH + 0.006, { metalness: 0.7 });
    }
    for (const x of [-WIDTH * 0.32, WIDTH * 0.32]) {
        add(new THREE.TorusGeometry(0.055, 0.009, 8, 28), gold, x, 0.21, DEPTH + 0.014, { metalness: 0.72 });
        add(new THREE.SphereGeometry(0.018, 16, 12), gold, x, 0.21, DEPTH + 0.02, { metalness: 0.72 });
    }

    // Overflow and drain make the blue basin read as a real bath.
    add(
        new THREE.CircleGeometry(0.025, 20),
        "#94a3b8",
        0,
        0.385,
        DEPTH - 0.08,
        chrome
    );
    const drain = add(
        new THREE.CircleGeometry(0.035, 24),
        "#94a3b8",
        0,
        0.39,
        DEPTH / 2 + 0.13,
        chrome
    );
    drain.rotation.x = -Math.PI / 2;

    // Short taps and a spout sit on the rear ledge. The spout points over
    // the basin instead of reading as another upright pipe.
    const spout = add(
        new THREE.CylinderGeometry(0.018, 0.02, 0.14, 16),
        "#cbd5e1", 0, 0.49, 0.14, chrome
    );
    spout.rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.028, 0.028, 0.045, 18), "#cbd5e1", -0.075, 0.47, 0.11, chrome);
    add(new THREE.CylinderGeometry(0.028, 0.028, 0.045, 18), "#cbd5e1", 0.075, 0.47, 0.11, chrome);
    add(new THREE.SphereGeometry(0.022, 16, 12), "#ef4444", -0.075, 0.47, 0.14);
    add(new THREE.SphereGeometry(0.022, 16, 12), "#3b82f6", 0.075, 0.47, 0.14);

    // Shampoo, conditioner and soap: bottles stand on the ledge, never on
    // the bathroom floor.
    const bottles = [
        { x: -0.36, color: "#f59e0b", h: 0.15 },
        { x: -0.23, color: "#4f46e5", h: 0.13 },
        { x: 0.35, color: "#c2410c", h: 0.14, pump: true },
    ];
    for (const bottle of bottles) {
        add(
            new THREE.CylinderGeometry(0.035, 0.04, bottle.h, 20),
            bottle.color,
            bottle.x,
            0.44 + bottle.h / 2,
            0.06
        );
        add(
            new THREE.CylinderGeometry(0.012, 0.015, 0.035, 12),
            "#f8fafc",
            bottle.x,
            0.44 + bottle.h + 0.018,
            0.06
        );
        if (bottle.pump) {
            const stemY = 0.44 + bottle.h + 0.045;
            add(new THREE.CylinderGeometry(0.009, 0.009, 0.04, 10), "#f8fafc", bottle.x, stemY, 0.06);
            const nozzle = add(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 10), "#f8fafc", bottle.x + 0.02, stemY + 0.018, 0.06);
            nozzle.rotation.z = Math.PI / 2;
        }
    }

    // One clear shower riser climbs the wall and bends over the tub. Its
    // broad, downward-facing head is distinct from the much shorter taps.
    add(new THREE.CylinderGeometry(0.014, 0.014, 0.84, 16), "#cbd5e1", WIDTH * 0.42, 0.57, 0.04, chrome);
    const arm = add(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 16), "#cbd5e1", WIDTH * 0.33, 0.97, 0.04, chrome);
    arm.rotation.z = Math.PI / 2;
    const shower = add(new THREE.CylinderGeometry(0.075, 0.09, 0.05, 24), "#cbd5e1", WIDTH * 0.23, 0.94, 0.14, chrome);
    // A few visible spray nozzles make the underside read as a shower head.
    for (const x of [-0.035, 0, 0.035]) {
        add(new THREE.SphereGeometry(0.008, 8, 6), "#64748b", WIDTH * 0.23 + x, 0.911, 0.14);
    }

    // Four feet lift the bath off the tiles and leave a small shadow gap.
    for (const x of [-WIDTH * 0.38, WIDTH * 0.38]) {
        for (const z of [0.12, DEPTH - 0.12]) {
            add(new THREE.SphereGeometry(0.07, 18, 12), "#fbbf24", x, 0.07, z, { metalness: 0.65 });
            add(new THREE.CylinderGeometry(0.03, 0.065, 0.16, 16), "#d4a72c", x, 0.13, z, { metalness: 0.62 });
        }
    }

    // A few soap bubbles bob gently above the water. Their staggered timing
    // keeps the motion light, and pauses at the waterline under reduced motion.
    const bubbleMaterial = new THREE.MeshBasicMaterial({
        color: "#e0f2fe",
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
    });
    const glintMaterial = new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
    });
    for (const [x, phase, radius] of [
        [-0.38, 0.1, 0.065],
        [-0.22, 0.62, 0.048],
        [0.02, 0.34, 0.075],
        [0.23, 0.82, 0.055],
        [0.4, 0.48, 0.044],
    ]) {
        const bubble = new THREE.Group();
        const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), bubbleMaterial);
        shell.castShadow = false;
        shell.receiveShadow = false;
        bubble.add(shell);
        const glint = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.18, 10, 8), glintMaterial);
        glint.position.set(-radius * 0.28, radius * 0.35, radius * 0.72);
        bubble.add(glint);
        bubble.position.set(x, 0.32, DEPTH * (0.35 + phase * 0.3));
        group.add(bubble);
        bubbles.push({ bubble, x, phase, baseY: 0.32 });
    }

    group.userData.swing = (time, reduced = false) => {
        for (const { bubble, x, phase, baseY } of bubbles) {
            const rise = reduced ? 0 : (Math.sin(time * 1.1 + phase * Math.PI * 2) + 1) * 0.18;
            bubble.position.set(x, baseY + rise, DEPTH * (0.35 + phase * 0.3));
            const scale = 1 + (reduced ? 0 : 0.1 * Math.sin(time * 1.6 + phase * 4));
            bubble.scale.setScalar(scale);
        }
        return !reduced;
    };
    return group;
}
