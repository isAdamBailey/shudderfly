import { FOOTPRINTS } from "./footprints.js";

// The Garage's door opener console (issue #227), the room's star: a big
// beige wall control screwed to the wall, its wire running up to the
// ceiling. The great push bar, a garage drawn on it, presses in when it's
// pressed (`press()`, played out by `swing`, ticked by the room). Under it
// a round light button with a bulb on it and a lock slide switch, and over
// it an indicator lamp showing the opener's light (`setOn`, driven by the
// room's `opener` lamp). One unit tall, FOOTPRINTS["garage-button"] wide
// and deep, standing on y = 0, flat on its wall.

const BEIGE = "#e9dfc6";
const FACE = "#f3ecdb";
const PUSH = "#ddd0b0";
const SHADE = "#b9a98a";
const DARK = "#5b4f3c";
const LAMP = "#fbbf24";
// How far the bar goes in, and how long it stays in, s.
const PUSH_IN = 0.035;
const PUSHED = 0.18;

export function garageButtonModel(THREE) {
    const { w } = FOOTPRINTS["garage-button"];
    const group = new THREE.Group();
    const materials = new Map();
    const material = (color, more = {}) => {
        const key = color + JSON.stringify(more);
        if (!materials.has(key)) {
            materials.set(
                key,
                new THREE.MeshStandardMaterial({
                    color,
                    roughness: 0.55,
                    ...more,
                })
            );
        }
        return materials.get(key);
    };
    const add = (geometry, mat, x, y, z, parent = group) => {
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };
    const box = (sx, sy, sz, color, x, y, z, parent, more) =>
        add(
            new THREE.BoxGeometry(sx, sy, sz),
            material(color, more),
            x,
            y,
            z,
            parent
        );
    const disc = (r, depth, color, x, y, z, parent, more) =>
        add(
            new THREE.CylinderGeometry(r, r, depth, 28).rotateX(Math.PI / 2),
            material(color, more),
            x,
            y,
            z,
            parent
        );

    // The housing, against the wall, and its face plate a step proud,
    // stopping short of the top for the wire's grommet.
    const housing = 0.05;
    box(w, 0.9, housing, BEIGE, 0, 0.45, housing / 2);
    box(w - 0.04, 0.86, 0.02, FACE, 0, 0.45, housing + 0.01);
    const front = housing + 0.02;
    // A screw in each corner, its slot across it.
    for (const x of [-w / 2 + 0.05, w / 2 - 0.05]) {
        for (const y of [0.06, 0.84]) {
            disc(0.018, 0.012, "#a8a29e", x, y, front + 0.006, group, {
                metalness: 0.8,
                roughness: 0.3,
            });
            box(0.03, 0.005, 0.004, DARK, x, y, front + 0.013);
        }
    }
    // The wire, from the top of the housing up the wall in a little
    // conduit, to the top of the model.
    box(0.05, 0.1, 0.04, BEIGE, 0, 0.95, 0.02);
    disc(0.03, 0.02, SHADE, 0, 0.9, housing + 0.005);

    // The indicator lamp, lit with the opener's light.
    const lamp = disc(0.035, 0.03, LAMP, 0, 0.77, front + 0.015, group, {
        emissive: new THREE.Color(LAMP),
        emissiveIntensity: 0,
        roughness: 0.2,
    });
    // Its chrome bezel.
    add(
        new THREE.TorusGeometry(0.04, 0.008, 8, 24),
        material("#d6d3d1", { metalness: 0.8, roughness: 0.25 }),
        0,
        0.77,
        front + 0.012
    );

    // The great push bar in its recess: a rim round it, then the bar on a
    // pivot of its own so it can be pressed in.
    const bar = { w: w - 0.14, h: 0.38, y: 0.49 };
    for (const [sx, sy, x, y] of [
        [bar.w + 0.04, 0.02, 0, bar.y + bar.h / 2 + 0.01],
        [bar.w + 0.04, 0.02, 0, bar.y - bar.h / 2 - 0.01],
        [0.02, bar.h, -bar.w / 2 - 0.01, bar.y],
        [0.02, bar.h, bar.w / 2 + 0.01, bar.y],
    ]) {
        box(sx, sy, 0.03, SHADE, x, y, front + 0.015);
    }
    const push = new THREE.Group();
    push.position.z = front;
    group.add(push);
    const out = 0.07;
    box(bar.w, bar.h, out, PUSH, 0, bar.y, out / 2, push);
    // Its face a shade lighter, ridged top and bottom for a thumb.
    box(bar.w - 0.03, bar.h - 0.03, 0.006, FACE, 0, bar.y, out + 0.003, push);
    for (const dy of [-0.15, -0.13, 0.13, 0.15]) {
        box(
            bar.w - 0.08,
            0.006,
            0.006,
            SHADE,
            0,
            bar.y + dy,
            out + 0.008,
            push
        );
    }
    // The garage drawn on it: a house with a pitched roof, its door
    // striped in sections, and an arrow up and down beside it.
    const icon = out + 0.008;
    const roof = new THREE.Shape();
    roof.moveTo(-0.11, 0);
    roof.lineTo(0, 0.07);
    roof.lineTo(0.11, 0);
    roof.lineTo(-0.11, 0);
    add(
        new THREE.ExtrudeGeometry(roof, { depth: 0.006, bevelEnabled: false }),
        material(DARK),
        -0.03,
        bar.y + 0.05,
        icon - 0.003,
        push
    );
    box(0.18, 0.12, 0.004, DARK, -0.03, bar.y - 0.01, icon, push);
    for (let i = 0; i < 3; i += 1) {
        box(
            0.13,
            0.018,
            0.004,
            FACE,
            -0.03,
            bar.y - 0.05 + i * 0.03,
            icon + 0.002,
            push
        );
    }
    for (const [dy, turn] of [
        [0.035, 0],
        [-0.035, Math.PI],
    ]) {
        const arrow = add(
            new THREE.ConeGeometry(0.022, 0.04, 3).rotateY(Math.PI / 6),
            material(DARK),
            0.13,
            bar.y + dy,
            icon,
            push
        );
        arrow.rotation.z = turn;
    }

    // Under the bar: the light button, a bulb on it, and the lock slide
    // switch in its track.
    const row = 0.18;
    disc(0.05, 0.03, PUSH, -0.12, row, front + 0.015);
    add(
        new THREE.SphereGeometry(0.018, 16, 12),
        material(DARK),
        -0.12,
        row + 0.008,
        front + 0.032
    );
    box(0.016, 0.014, 0.006, DARK, -0.12, row - 0.016, front + 0.032);
    box(0.16, 0.035, 0.01, DARK, 0.1, row, front + 0.005);
    box(0.05, 0.05, 0.03, PUSH, 0.07, row, front + 0.02);

    // Pressed: the bar goes in, and comes out again PUSHED s later, on the
    // room's clock (swing()). Still in under reduced motion: no change.
    let pending = false;
    let since = -Infinity;
    let shown = 0;
    group.userData.press = () => {
        pending = true;
    };
    group.userData.swing = (time, reduced) => {
        if (pending) {
            since = time;
            pending = false;
        }
        const depth = !reduced && time - since < PUSHED ? PUSH_IN : 0;
        if (depth === shown) return false;
        shown = depth;
        push.position.z = front - depth;
        return true;
    };
    group.userData.setOn = (on) => {
        lamp.material.emissiveIntensity = on ? 2 : 0;
    };
    return group;
}
