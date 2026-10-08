/**
 * The road's buildings and props as plain coloured geometry (issue #130).
 * Each piece is a list of parts with their colour baked into the vertices, so
 * a whole row of buildings merges into one mesh, one draw call, under one
 * shared material. `THREE` is passed in, as everywhere outside the renderer,
 * so nothing here pulls three into the page's main chunk.
 *
 * Every builder works in a piece's own space: its front face on z = 0 facing
 * +z (toward the camera), centred on x = 0, standing on y = 0.
 */

/** A box w × h × d with its centre at (x, y, z), in `color`. */
export function box(THREE, color, [w, h, d], [x, y, z]) {
    return paint(
        THREE,
        new THREE.BoxGeometry(w, h, d).translate(x, y, z),
        color
    );
}

/** A gabled roof: a triangular prism `length` along x, `depth` deep, peaking
 * `height` above its eaves at y. A three-sided cylinder, turned on its side. */
function roof(THREE, color, { length, depth, height, y, z }) {
    const prism = new THREE.CylinderGeometry(1, 1, length, 3, 1)
        .rotateZ(Math.PI / 2)
        .rotateX(-Math.PI / 2)
        .translate(0, 0.5, 0)
        .scale(1, height / 1.5, depth / Math.sqrt(3))
        .translate(0, y, z);
    return paint(THREE, prism, color);
}

/** The geometry, non-indexed, with every vertex in `color`. */
function paint(THREE, geometry, color) {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    const c = new THREE.Color(color);
    const count = flat.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    flat.deleteAttribute("uv");
    return flat;
}

/** Parts moved by (x, y, z) and scaled by `s` about their own origin. */
export function place(parts, { x = 0, y = 0, z = 0, s = 1 }) {
    return parts.map((part) => part.scale(s, s, s).translate(x, y, z));
}

/** One geometry from many painted parts, which it frees. Null for none. */
export function mergeParts(THREE, parts) {
    if (parts.length === 0) return null;
    const names = ["position", "normal", "color"];
    const total = parts.reduce((n, p) => n + p.attributes.position.count, 0);
    const merged = new THREE.BufferGeometry();
    for (const name of names) {
        const out = new Float32Array(total * 3);
        let offset = 0;
        for (const part of parts) {
            out.set(part.attributes[name].array, offset);
            offset += part.attributes[name].array.length;
        }
        merged.setAttribute(name, new THREE.BufferAttribute(out, 3));
    }
    merged.computeBoundingSphere();
    for (const part of parts) part.dispose();
    return merged;
}

/**
 * A building `width` wide and `height` to its eaves, with a gabled roof
 * `roof` high and a grid of windows on its front. The middle of the front is
 * left clear: the upper part for its sign, the bottom for a door (Phase 4
 * marks the buildings you can go into). Returns { body, windows } part
 * lists, so the windows can glow on their own material.
 */
export function building(
    THREE,
    { width, height, depth, roof: roofHeight, look, palette }
) {
    const wall = look.walls[palette % look.walls.length];
    const roofColor = look.roofs[palette % look.roofs.length];
    const body = [
        box(THREE, wall, [width, height, depth], [0, height / 2, -depth / 2]),
        // Eaves trim and a doorstep.
        box(
            THREE,
            look.trim,
            [width + 6, 6, depth + 6],
            [0, height, -depth / 2]
        ),
        box(THREE, look.trim, [width * 0.36, 4, 10], [0, 2, 4]),
        roof(THREE, roofColor, {
            length: width + 16,
            depth: depth + 20,
            height: roofHeight,
            y: height + 3,
            z: -depth / 2,
        }),
    ];

    const windows = [];
    const pane = Math.min(width, height) * 0.16;
    const rows = height > width * 0.9 ? [0.3, 0.72] : [0.3];
    const cols = [-0.33, 0.33];
    for (const row of rows) {
        for (const col of cols) {
            windows.push(
                box(
                    THREE,
                    look.glass,
                    [pane, pane * 1.25, 3],
                    [col * width, row * height, 1.5]
                )
            );
        }
    }
    return { body, windows };
}

/** A round-topped tree `size` tall. */
export function tree(THREE, { size, look, palette }) {
    const leaves = look.leaves[palette % look.leaves.length];
    return [
        box(
            THREE,
            look.trunk,
            [size * 0.12, size * 0.4, size * 0.12],
            [0, size * 0.2, 0]
        ),
        paint(
            THREE,
            new THREE.IcosahedronGeometry(size * 0.34, 0).translate(
                0,
                size * 0.62,
                0
            ),
            leaves
        ),
    ];
}

/** A bush `size` across. */
export function bush(THREE, { size, look, palette }) {
    const leaves = look.leaves[palette % look.leaves.length];
    return [
        paint(
            THREE,
            new THREE.IcosahedronGeometry(size * 0.5, 0)
                .scale(1, 0.7, 0.8)
                .translate(0, size * 0.32, 0),
            leaves
        ),
    ];
}

/** A stretch of picket fence `length` long and `height` tall. */
export function fence(THREE, { length, height, look }) {
    const parts = [
        box(THREE, look.trim, [length, height * 0.12, 3], [0, height * 0.7, 0]),
        box(THREE, look.trim, [length, height * 0.12, 3], [0, height * 0.3, 0]),
    ];
    const pickets = Math.max(2, Math.round(length / 16));
    for (let i = 0; i < pickets; i += 1) {
        const x = -length / 2 + ((i + 0.5) * length) / pickets;
        parts.push(
            box(
                THREE,
                look.trim,
                [length / pickets / 2, height, 4],
                [x, height / 2, 1]
            )
        );
    }
    return parts;
}

/** A porta-potty `height` tall: a blue box with a door and a vent. Its
 * crescent-moon sign is an emoji, added by the scene. */
export function potty(THREE, { height }) {
    const w = height * 0.5;
    return [
        box(THREE, "#2563eb", [w, height, w], [0, height / 2, -w / 2]),
        box(
            THREE,
            "#1e40af",
            [w * 1.08, height * 0.06, w * 1.08],
            [0, height, -w / 2]
        ),
        box(
            THREE,
            "#1d4ed8",
            [w * 0.7, height * 0.82, 2],
            [0, height * 0.41, 1]
        ),
    ];
}

/** A billboard `width` wide on two legs, its board's face at z = 0. The
 * Toot Food it shows is a cast member, added by the scene. */
export function billboard(THREE, { width, look }) {
    const boardH = width * 0.55;
    const legH = width * 0.5;
    return {
        parts: [
            box(
                THREE,
                "#57534e",
                [width * 0.05, legH, width * 0.05],
                [-width * 0.3, legH / 2, -6]
            ),
            box(
                THREE,
                "#57534e",
                [width * 0.05, legH, width * 0.05],
                [width * 0.3, legH / 2, -6]
            ),
            box(
                THREE,
                look.trim,
                [width, boardH, 6],
                [0, legH + boardH / 2, -3]
            ),
            box(
                THREE,
                "#f472b6",
                [width, boardH * 0.12, 7],
                [0, legH + boardH * 0.06, -3]
            ),
        ],
        // Where the board's middle is, for the food.
        board: { y: legH, height: boardH },
    };
}

/** A manhole cover `size` across, flat on the road. */
export function manhole(THREE, { size }) {
    return [
        paint(
            THREE,
            new THREE.CylinderGeometry(size / 2, size / 2, 1, 16).translate(
                0,
                0.5,
                0
            ),
            "#44403c"
        ),
    ];
}
