// The Library hall's movie podium (GamesWorld::MOVIE_PODIUM): a tall
// old-library lectern in carved mahogany on a fluted column, gilt at every
// edge, a crimson velvet drape with a gold fringe and star hung from its desk,
// a great book open on it beside a clapperboard and a film reel, candle
// lamps on brass arms, and a marquee crest of bulbs over it all. Tapping it
// opens the Movies dialog. Built to its footprint (footprints.js), one unit
// tall, its front toward +z.
export function moviePodiumModel(THREE) {
    const group = new THREE.Group();
    const add = (geometry, material, x, y, z, parent = group) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };
    // Trim, bulbs and the like: too small to cast a shadow worth a pass.
    const detail = (...args) => {
        const mesh = add(...args);
        mesh.castShadow = false;
        return mesh;
    };
    const material = (color, more = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...more });
    const mahogany = material("#4a1f14", { roughness: 0.45 });
    const darkWood = material("#2b120b", { roughness: 0.5 });
    const gold = material("#d9ad48", { metalness: 0.75, roughness: 0.28 });
    const velvet = material("#8e1420", { roughness: 0.9 });
    const paper = material("#f1e6c8", { roughness: 0.8 });
    const black = material("#16171a", { roughness: 0.4 });
    const white = material("#f4f1e8", { roughness: 0.5 });
    const silver = material("#b8bec6", { metalness: 0.6, roughness: 0.35 });
    const flame = material("#ffd27a", {
        emissive: "#ff9a2e",
        emissiveIntensity: 1.1,
        roughness: 0.3,
    });
    const bulb = material("#fff3c4", {
        emissive: "#ffcc55",
        emissiveIntensity: 0.9,
        roughness: 0.3,
    });

    // A stepped plinth, the full footprint, gilt along its edge.
    add(new THREE.BoxGeometry(0.55, 0.05, 0.35), darkWood, 0, 0.025, 0.175);
    detail(new THREE.BoxGeometry(0.55, 0.012, 0.352), gold, 0, 0.056, 0.176);
    add(new THREE.BoxGeometry(0.44, 0.04, 0.28), mahogany, 0, 0.082, 0.175);

    // A fluted column, gilt rings at its foot and head.
    add(
        new THREE.CylinderGeometry(0.11, 0.14, 0.44, 8),
        mahogany,
        0,
        0.322,
        0.175
    );
    const fluteShape = new THREE.BoxGeometry(0.012, 0.4, 0.012);
    for (let i = 0; i < 8; i++) {
        const angle = ((i + 0.5) / 8) * Math.PI * 2;
        const flute = detail(
            fluteShape,
            gold,
            Math.sin(angle) * 0.122,
            0.322,
            0.175 + Math.cos(angle) * 0.122
        );
        flute.rotation.y = angle;
    }
    add(
        new THREE.CylinderGeometry(0.15, 0.15, 0.025, 16),
        gold,
        0,
        0.115,
        0.175
    );
    add(
        new THREE.CylinderGeometry(0.125, 0.125, 0.025, 16),
        gold,
        0,
        0.53,
        0.175
    );

    // A carved capital under the desk.
    add(new THREE.BoxGeometry(0.42, 0.06, 0.26), darkWood, 0, 0.57, 0.17);
    detail(new THREE.BoxGeometry(0.44, 0.012, 0.27), gold, 0, 0.6, 0.17);

    // The sloped desk, rimmed in gold, and the velvet drape hung from it.
    const desk = new THREE.Group();
    desk.position.set(0, 0.64, 0.17);
    desk.rotation.x = 0.28;
    group.add(desk);
    add(new THREE.BoxGeometry(0.48, 0.03, 0.3), mahogany, 0, 0, 0, desk);
    add(new THREE.BoxGeometry(0.48, 0.04, 0.012), gold, 0, 0.02, 0.15, desk);
    // An open great book, its two pages and a film-strip ribbon.
    for (const side of [-1, 1]) {
        const page = add(
            new THREE.BoxGeometry(0.15, 0.012, 0.2),
            paper,
            side * 0.078,
            0.025,
            0,
            desk
        );
        page.rotation.z = side * -0.08;
    }
    detail(
        new THREE.BoxGeometry(0.02, 0.004, 0.24),
        black,
        0.02,
        0.034,
        0.02,
        desk
    );

    const drape = add(
        new THREE.BoxGeometry(0.36, 0.2, 0.012),
        velvet,
        0,
        0.5,
        0.33
    );
    drape.rotation.x = 0.05;
    detail(new THREE.BoxGeometry(0.36, 0.022, 0.016), gold, 0, 0.395, 0.335);
    const star = add(
        new THREE.CylinderGeometry(0.045, 0.045, 0.012, 5),
        gold,
        0,
        0.5,
        0.342
    );
    star.rotation.x = Math.PI / 2;

    // A clapperboard and a film reel standing at the back of the desk.
    add(new THREE.BoxGeometry(0.15, 0.1, 0.02), black, 0.13, 0.76, 0.06);
    const clapper = new THREE.Group();
    clapper.position.set(0.055, 0.815, 0.06);
    clapper.rotation.z = 0.25;
    group.add(clapper);
    const stripeShape = new THREE.BoxGeometry(0.038, 0.025, 0.02);
    for (let i = 0; i < 4; i++) {
        add(
            stripeShape,
            i % 2 ? black : white,
            0.019 + i * 0.038,
            0.012,
            0,
            clapper
        );
    }
    const reel = add(
        new THREE.CylinderGeometry(0.065, 0.065, 0.02, 24),
        silver,
        -0.13,
        0.77,
        0.06
    );
    reel.rotation.x = Math.PI / 2;
    const holeShape = new THREE.CylinderGeometry(0.012, 0.012, 0.024, 10);
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const hole = detail(
            holeShape,
            black,
            -0.13 + Math.cos(angle) * 0.038,
            0.77 + Math.sin(angle) * 0.038,
            0.06
        );
        hole.rotation.x = Math.PI / 2;
    }

    // Candle lamps on brass arms either side of the desk.
    const candle = {
        arm: new THREE.BoxGeometry(0.06, 0.012, 0.012),
        cup: new THREE.CylinderGeometry(0.022, 0.03, 0.02, 12),
        wax: new THREE.CylinderGeometry(0.014, 0.014, 0.08, 10),
        flame: new THREE.SphereGeometry(0.014, 10, 8),
    };
    for (const side of [-1, 1]) {
        detail(candle.arm, gold, side * 0.24, 0.6, 0.17);
        detail(candle.cup, gold, side * 0.24, 0.615, 0.17);
        detail(candle.wax, paper, side * 0.24, 0.665, 0.17);
        detail(candle.flame, flame, side * 0.24, 0.715, 0.17);
    }

    // A marquee crest over it: a gilt arch of lit bulbs on a velvet board.
    add(new THREE.BoxGeometry(0.36, 0.13, 0.02), velvet, 0, 0.91, 0.02);
    const rail = new THREE.BoxGeometry(0.38, 0.015, 0.03);
    detail(rail, gold, 0, 0.84, 0.02);
    detail(rail, gold, 0, 0.98, 0.02);
    const stile = new THREE.BoxGeometry(0.015, 0.155, 0.03);
    for (const side of [-1, 1]) {
        detail(stile, gold, side * 0.183, 0.91, 0.02);
    }
    const bulbShape = new THREE.SphereGeometry(0.011, 8, 6);
    for (let x = -0.15; x <= 0.151; x += 0.05) {
        detail(bulbShape, bulb, x, 0.955, 0.04);
        detail(bulbShape, bulb, x, 0.865, 0.04);
    }
    // Two gilt posts holding it up behind the desk.
    const post = new THREE.BoxGeometry(0.02, 0.24, 0.02);
    for (const side of [-1, 1]) {
        add(post, gold, side * 0.17, 0.72, 0.02);
    }

    return group;
}
