import { BUTT_COLORS, GUSTER_COLORS } from "@/constants/characters.js";
import { jitter } from "@/utils/math";
import { own } from "@/utils/object";

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
export function paint(THREE, geometry, color) {
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

// Front doors, `wood` and `knob`: `plain` for every building that names
// none, the rest by the name a road door's `door` gives (GamesWorld::DOORS,
// which a test keeps in step).
export const DOORS = {
    plain: { wood: "#7c2d12", knob: "#facc15" },
    guster: { wood: GUSTER_COLORS.mid, knob: GUSTER_COLORS.highlight },
};

/** A front door's look by name, the plain one for any it doesn't know. */
function doorLook(door) {
    return own(DOORS, door) ?? DOORS.plain;
}

/**
 * A building `width` wide and `height` to its eaves, with a gabled roof
 * `roof` high and a grid of windows on its front. The middle of the front is
 * left clear: the upper part for its sign, the bottom for a front door,
 * drawn only with `door` (a building you can go into), a name from DOORS.
 * Returns { body, windows, bulbs } part lists, so the windows and the
 * string of lights under the eaves (the look's `bulbs`, none without) can
 * glow on their own materials; a shaped front may add `labels`, painted
 * pictures with their own UVs (beanCan()).
 */
export function building(
    THREE,
    {
        width,
        height,
        depth,
        roof: roofHeight,
        look,
        palette,
        door = null,
        facade = null,
    }
) {
    const shaped = own(FACADES, facade ?? "");
    if (shaped)
        return shaped.build(THREE, {
            width,
            height,
            depth,
            roof: roofHeight,
            look,
            door,
        });
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

    if (door) {
        const doorColors = doorLook(door);
        const w = width * 0.22;
        const h = height * 0.4;
        body.push(
            box(THREE, doorColors.wood, [w, h, 3], [0, h / 2, 1.5]),
            box(
                THREE,
                doorColors.knob,
                [w * 0.14, w * 0.14, 3],
                [w * 0.28, h * 0.48, 3.5]
            )
        );
    }

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
    return { body, windows, bulbs: eaveBulbs(THREE, look, width, height) };
}

// --- Facades ---------------------------------------------------------------

/** How far a facade's carved trim stands proud: by its width, but no more
 * than a tall front's, so a front kept short for the sky keeps its trim. */
function facadeLip(width, height) {
    return Math.min(width, height * 1.5) * 0.012;
}

/** A flat `shape` (in x/y) pushed `depth` back from z, at (x, y). */
function extruded(THREE, color, shape, depth, [x, y, z]) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        curveSegments: 10,
    }).translate(x, y, z - depth);
    return paint(THREE, geometry, color);
}

/** A pointed (equilateral) arch `w` wide and `h` tall to its point, its
 * feet on `y`. Never shorter than its arch. */
function lancet(THREE, w, h, y = 0) {
    const rise = (w * Math.sqrt(3)) / 2;
    const spring = y + Math.max(0, h - rise);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, y);
    shape.lineTo(w / 2, y);
    shape.lineTo(w / 2, spring);
    shape.absarc(-w / 2, spring, w, 0, Math.PI / 3, false);
    shape.absarc(w / 2, spring, w, (2 * Math.PI) / 3, Math.PI, false);
    shape.closePath();
    return shape;
}

/** A triangle `w` wide and `h` tall, its base on y = 0. */
function gable(THREE, w, h) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, 0);
    shape.lineTo(w / 2, 0);
    shape.lineTo(0, h);
    shape.closePath();
    return shape;
}

/** A square spire `w` across and `h` tall, standing on (x, y, z). */
function spire(THREE, color, w, h, [x, y, z]) {
    const geometry = new THREE.ConeGeometry((w / 2) * Math.SQRT2, h, 4, 1)
        .rotateY(Math.PI / 4)
        .translate(x, y + h / 2, z);
    return paint(THREE, geometry, color);
}

// A gothic facade's proportions, as shares of its front's `width` (w) or of
// its `height` to the nave's eaves (h). The towers rise past the eaves and
// their spires past that: roadLayout.js FACADE_SIZES gives the whole height.
export const GOTHIC = {
    nave: 0.5, // w, the middle between the towers
    gable: 0.42, // h, the nave's steep front gable
    tower: 1.32, // h, each tower's top
    spire: 0.42, // h, above the tower
    door: 0.46, // h, the great doorway to its point
};

// How far a gothic front's towers stand proud of its nave.
const GOTHIC_TOWER_FRONT = 6;

/** Where a gothic front's rose window is: its centre `y` and `radius`, for
 * the sign that fills it (RoadScene.js placeLandmarkPuppet). */
function gothicRose({ width, height }) {
    const radius = Math.min(width * GOTHIC.nave * 0.3, height * 0.17);
    return { y: height - radius * 1.25, radius };
}

/**
 * A huge old gothic building, the Library's: a tall nave with a steep front
 * gable between two buttressed towers, each with a slate spire and pinnacles
 * at its corners, pointed-arch windows, a rose window high in the middle
 * (where the sign goes), and a deep arched doorway up a flight of steps.
 * Built in the same space and parts as building().
 */
function gothic(THREE, { width, height, depth, look, door }) {
    const stone = look.stone;
    const W = width;
    const H = height;
    const nave = W * GOTHIC.nave;
    const towerW = (W - nave) / 2;
    const towerH = H * GOTHIC.tower;
    const towerX = nave / 2 + towerW / 2;
    const towerD = Math.min(depth, towerW * 1.1);
    const lip = facadeLip(W, H);
    const body = [];
    const windows = [];

    // The nave, its gable wall, and the steep slate roof behind it.
    const gableH = H * GOTHIC.gable;
    body.push(
        box(THREE, stone.wall, [nave, H, depth], [0, H / 2, -depth / 2]),
        extruded(
            THREE,
            stone.roof,
            gable(THREE, nave + lip * 4, gableH + lip * 3),
            depth,
            [0, H - lip, -1]
        ),
        extruded(
            THREE,
            stone.wall,
            gable(THREE, nave - lip * 2, gableH - lip),
            3,
            [0, H, 2]
        ),
        // A band of carved stone under the gable, and a cross-shaped
        // finial on its point.
        box(THREE, stone.trim, [nave + lip * 2, lip * 1.6, 6], [0, H, 1]),
        spire(THREE, stone.trim, lip * 2.2, gableH * 0.3, [
            0,
            H + gableH - lip,
            0,
        ]),
        box(
            THREE,
            stone.finial,
            [lip * 0.7, lip * 3, lip * 0.7],
            [0, H + gableH * 1.3, 0]
        ),
        box(
            THREE,
            stone.finial,
            [lip * 2.2, lip * 0.7, lip * 0.7],
            [0, H + gableH * 1.3 + lip * 0.4, 0]
        )
    );

    // The rose window: a wheel of glass in a stone ring, with spokes.
    const rose = gothicRose({ width, height });
    windows.push(
        paint(
            THREE,
            new THREE.CircleGeometry(rose.radius, 24).translate(0, rose.y, 2.5),
            look.glass
        )
    );
    body.push(
        paint(
            THREE,
            new THREE.RingGeometry(
                rose.radius,
                rose.radius * 1.18,
                24
            ).translate(0, rose.y, 3.2),
            stone.trim
        )
    );
    for (let i = 0; i < 6; i += 1) {
        body.push(
            paint(
                THREE,
                new THREE.BoxGeometry(rose.radius * 2, lip * 0.45, 1)
                    .rotateZ((i * Math.PI) / 6)
                    .translate(0, rose.y, 2.9),
                stone.trim
            )
        );
    }

    // A row of little arches between the door and the rose.
    const galleryY = H * GOTHIC.door + H * 0.06;
    const galleryH = Math.max(
        lip * 2,
        rose.y - rose.radius * 1.2 - galleryY - lip
    );
    const arches = 5;
    const archW = (nave * 0.62) / arches;
    for (let i = 0; i < arches; i += 1) {
        const x = (i - (arches - 1) / 2) * archW;
        windows.push(
            extruded(
                THREE,
                look.glass,
                lancet(THREE, archW * 0.6, galleryH),
                2,
                [x, galleryY, 2.5]
            )
        );
    }
    body.push(
        box(
            THREE,
            stone.trim,
            [nave * 0.7, lip, 5],
            [0, galleryY - lip / 2, 1.5]
        )
    );

    // The great doorway: arch inside arch, stepping in to the door.
    const doorH = H * GOTHIC.door;
    const doorW = W * 0.13;
    const rings = [stone.trim, stone.wall, stone.trim, stone.dark];
    rings.forEach((color, i) => {
        const grow = (rings.length - 1 - i) * lip * 1.3;
        body.push(
            extruded(
                THREE,
                color,
                lancet(THREE, doorW + grow * 2, doorH + grow),
                3,
                [0, 0, 2 + (rings.length - i) * 0.8]
            )
        );
    });
    if (door) {
        const doorColors = doorLook(door);
        const leaf = doorW * 0.82;
        body.push(
            extruded(
                THREE,
                doorColors.wood,
                lancet(THREE, leaf, doorH * 0.9),
                2,
                [0, 0, 7]
            ),
            // Two leaves, their iron straps, and a ring each.
            box(
                THREE,
                stone.dark,
                [lip * 0.4, doorH * 0.7, 1],
                [0, doorH * 0.35, 7.5]
            ),
            box(
                THREE,
                stone.dark,
                [leaf, lip * 0.5, 1],
                [0, doorH * 0.22, 7.5]
            ),
            box(THREE, stone.dark, [leaf, lip * 0.5, 1], [0, doorH * 0.5, 7.5]),
            box(
                THREE,
                doorColors.knob,
                [lip * 0.8, lip * 0.8, 1.5],
                [-leaf * 0.12, doorH * 0.36, 8]
            ),
            box(
                THREE,
                doorColors.knob,
                [lip * 0.8, lip * 0.8, 1.5],
                [leaf * 0.12, doorH * 0.36, 8]
            )
        );
    }

    // Wide stone steps up to it.
    for (let i = 0; i < 3; i += 1) {
        const stepW = nave * (0.62 - i * 0.08);
        const stepD = 18 - i * 5;
        body.push(
            box(
                THREE,
                stone.trim,
                [stepW, 3, stepD],
                [0, 1.5 + i * 3, stepD / 2 + 2]
            )
        );
    }

    // The towers, a little proud of the nave.
    for (const side of [-1, 1]) {
        const x = side * towerX;
        const front = GOTHIC_TOWER_FRONT;
        body.push(
            box(
                THREE,
                stone.wall,
                [towerW, towerH, towerD],
                [x, towerH / 2, front - towerD / 2]
            ),
            // String courses, and a parapet round the top.
            box(
                THREE,
                stone.trim,
                [towerW + lip, lip, towerD + lip],
                [x, H * 0.62, front - towerD / 2]
            ),
            box(
                THREE,
                stone.trim,
                [towerW + lip, lip, towerD + lip],
                [x, H, front - towerD / 2]
            ),
            box(
                THREE,
                stone.trim,
                [towerW + lip * 2.5, lip * 1.8, towerD + lip * 2.5],
                [x, towerH, front - towerD / 2]
            ),
            spire(THREE, stone.spire, towerW * 0.78, H * GOTHIC.spire, [
                x,
                towerH + lip * 0.9,
                front - towerD / 2,
            ]),
            box(
                THREE,
                stone.finial,
                [lip * 0.6, lip * 3, lip * 0.6],
                [x, towerH + H * GOTHIC.spire + lip * 2, front - towerD / 2]
            )
        );
        // Pinnacles at the tower's four corners.
        for (const cx of [-1, 1]) {
            for (const cz of [0, 1]) {
                body.push(
                    spire(THREE, stone.spire, lip * 2.4, H * 0.16, [
                        x + cx * (towerW / 2),
                        towerH + lip * 0.9,
                        front - cz * towerD,
                    ])
                );
            }
        }
        // A tall window low down, and the dark belfry openings up top.
        windows.push(
            extruded(
                THREE,
                look.glass,
                lancet(THREE, towerW * 0.34, H * 0.4),
                2,
                [x, H * 0.14, front + 2]
            )
        );
        body.push(
            extruded(
                THREE,
                stone.trim,
                lancet(THREE, towerW * 0.34 + lip * 1.6, H * 0.4 + lip),
                1.5,
                [x, H * 0.14 - lip * 0.6, front + 1]
            ),
            box(
                THREE,
                stone.trim,
                [towerW * 0.5, lip, 4],
                [x, H * 0.14 - lip * 0.6, front + 2]
            )
        );
        for (const bx of [-1, 1]) {
            body.push(
                extruded(
                    THREE,
                    stone.dark,
                    lancet(THREE, towerW * 0.2, (towerH - H) * 0.62),
                    2,
                    [x + bx * towerW * 0.17, H + (towerH - H) * 0.18, front + 2]
                )
            );
        }
        windows.push(
            extruded(
                THREE,
                look.glass,
                lancet(THREE, towerW * 0.2, H * 0.22),
                2,
                [x, H * 0.7, front + 2]
            )
        );

        // Buttresses at the tower's outer corner and where it meets the
        // nave, stepping back as they rise, each topped by a pinnacle.
        for (const edge of [towerW / 2, -towerW / 2]) {
            const bx = x + side * edge - side * Math.sign(edge) * lip;
            const bw = lip * 2.2;
            body.push(
                box(
                    THREE,
                    stone.wall,
                    [bw, H * 0.6, lip * 3.5],
                    [bx, H * 0.3, front + lip * 1.75]
                ),
                box(
                    THREE,
                    stone.trim,
                    [bw + 1, lip * 0.8, lip * 3.8],
                    [bx, H * 0.6, front + lip * 1.75]
                ),
                box(
                    THREE,
                    stone.wall,
                    [bw * 0.8, H * 0.38, lip * 2],
                    [bx, H * 0.79, front + lip]
                ),
                spire(THREE, stone.spire, bw * 0.8, H * 0.12, [
                    bx,
                    H * 0.98,
                    front + lip,
                ])
            );
        }
    }

    return {
        body,
        windows,
        // Across the nave against its wall, and across the towers against
        // theirs, clear of the buttresses at the towers' edges.
        bulbs: eaveBulbs(THREE, look, W, H, {
            skip: (x) =>
                [nave / 2, W / 2].some(
                    (edge) => Math.abs(Math.abs(x) - edge) < lip * 2.5
                ),
            out: (x) => (Math.abs(x) > nave / 2 ? GOTHIC_TOWER_FRONT : 0),
        }),
    };
}

// A haunted facade's proportions, as shares of its front's `width` (w) or
// of its `height` to the wings' eaves (h). The clock tower is built as the
// hall's grandfather clock is (three/grandfatherClock.js): plinth, trunk
// and hood, each up to its top, then an open belfry with a bell in it, a
// crown and a spire.
export const HAUNTED = {
    tower: 0.3, // w
    plinth: 0.56, // h
    trunk: 0.9, // h
    hood: 1.26, // h
    belfry: 1.58, // h
    spire: 0.42, // h, above the belfry
    door: 0.3, // h
    roof: 0.6, // h, the wings' steep roofs
};

// Where a haunted front's round window is, over its door, for the sign.
function hauntedWindow({ width, height }) {
    const tower = width * HAUNTED.tower;
    return { y: height * 0.455, radius: Math.min(tower * 0.2, height * 0.07) };
}

// How far the clock tower stands proud of the wings.
const HAUNTED_FRONT = 8;

/**
 * A big, scary old house, the Cockroach's: two crooked wings of weathered
 * boards under steep roofs, their windows boarded up or hung with a broken
 * shutter, an iron railing in front, and between them a clock tower like
 * the grandfather clock in the hall, its hands stopped at five to midnight.
 * Its door is at the tower's foot under a sagging porch, the round window
 * over it the sign's. Built in the same space and parts as building().
 */
function haunted(THREE, { width, height, depth, look, door }) {
    const c = look.haunt;
    const W = width;
    const H = height;
    const towerW = W * HAUNTED.tower;
    const wingW = (W - towerW) / 2;
    const lip = facadeLip(W, H);
    const front = HAUNTED_FRONT;
    const body = [];
    const windows = [];

    // The wings, either side of the tower.
    for (const side of [-1, 1]) {
        const x = side * (towerW / 2 + wingW / 2);
        body.push(
            box(THREE, c.wall, [wingW, H, depth], [x, H / 2, -depth / 2]),
            box(THREE, c.trim, [wingW + 6, 5, depth + 6], [x, H, -depth / 2]),
            box(THREE, c.trim, [wingW + 2, 4, depth + 2], [x, 2, -depth / 2]),
            roof(THREE, c.roof, {
                length: wingW + 12,
                depth: depth + 16,
                height: H * HAUNTED.roof,
                y: H + 2.5,
                z: -depth / 2,
            }).translate(x, 0, 0)
        );
        // Boards down the walls.
        for (let i = 1; i < 6; i += 1) {
            body.push(
                box(
                    THREE,
                    c.dark,
                    [1, H - 6, 1],
                    [x - wingW / 2 + (i * wingW) / 6, H / 2, 0.6]
                )
            );
        }
        // Two windows up and two down: the lower ones boarded over, an
        // upper one with a shutter hanging off its hinge.
        const paneW = wingW * 0.2;
        for (const col of [-0.26, 0.26]) {
            const wx = x + col * wingW;
            for (const [y, h, boarded] of [
                [H * 0.12, H * 0.3, true],
                [H * 0.56, H * 0.28, false],
            ]) {
                body.push(
                    extruded(
                        THREE,
                        c.trim,
                        lancet(THREE, paneW + lip * 1.4, h + lip),
                        1.5,
                        [wx, y - lip * 0.5, 2]
                    )
                );
                windows.push(
                    extruded(THREE, c.glass, lancet(THREE, paneW, h), 1.5, [
                        wx,
                        y,
                        2.6,
                    ])
                );
                if (boarded) {
                    for (const tilt of [0.55, -0.45]) {
                        body.push(
                            paint(
                                THREE,
                                new THREE.BoxGeometry(
                                    paneW * 1.5,
                                    lip * 1.1,
                                    1.5
                                )
                                    .rotateZ(tilt)
                                    .translate(wx, y + h * 0.45, 3.6),
                                c.trim
                            )
                        );
                    }
                } else if (col * side > 0) {
                    body.push(
                        paint(
                            THREE,
                            new THREE.BoxGeometry(paneW * 0.55, h * 0.95, 1.5)
                                .translate(0, -h * 0.47, 0)
                                .rotateZ(side * 0.35)
                                .translate(
                                    wx + side * (paneW / 2 + paneW * 0.3),
                                    y + h,
                                    3.4
                                ),
                            c.dark
                        )
                    );
                }
            }
        }
    }
    // A crooked chimney out of the left wing's ridge.
    body.push(
        paint(
            THREE,
            new THREE.BoxGeometry(wingW * 0.14, H * 0.45, wingW * 0.14)
                .rotateZ(0.12)
                .translate(-(towerW / 2 + wingW * 0.7), H * 1.6, -depth * 0.5),
            c.trim
        )
    );

    // The clock tower, as the grandfather clock's case: plinth, a
    // narrower trunk, the hood, with dark oak mouldings at the joints.
    const tz = (d) => front - d / 2;
    const parts = [
        { from: 0, to: H * HAUNTED.plinth, w: towerW },
        { from: H * HAUNTED.plinth, to: H * HAUNTED.trunk, w: towerW * 0.8 },
        { from: H * HAUNTED.trunk, to: H * HAUNTED.hood, w: towerW + lip },
    ];
    const towerD = Math.min(depth, towerW);
    for (const { from, to, w } of parts) {
        body.push(
            box(
                THREE,
                c.oak,
                [w, to - from, towerD],
                [0, (from + to) / 2, tz(towerD)]
            )
        );
        body.push(
            box(
                THREE,
                c.oakDark,
                [w + lip * 1.2, lip * 1.2, towerD + lip * 1.2],
                [0, from + lip * 0.6, tz(towerD)]
            )
        );
    }
    const hoodTop = H * HAUNTED.hood;
    body.push(
        box(
            THREE,
            c.oakDark,
            [towerW + lip * 2.4, lip * 1.4, towerD + lip * 2],
            [0, hoodTop, tz(towerD)]
        )
    );

    // The trunk's tall window, and the brass bob of its pendulum in it.
    const trunkFrom = H * HAUNTED.plinth;
    const trunkH = H * (HAUNTED.trunk - HAUNTED.plinth);
    windows.push(
        extruded(
            THREE,
            c.glass,
            lancet(THREE, towerW * 0.34, trunkH * 0.72),
            1.5,
            [0, trunkFrom + trunkH * 0.14, front + 1.6]
        )
    );
    body.push(
        extruded(
            THREE,
            c.oakDark,
            lancet(THREE, towerW * 0.34 + lip * 1.4, trunkH * 0.72 + lip),
            1,
            [0, trunkFrom + trunkH * 0.14 - lip * 0.5, front + 1]
        ),
        box(
            THREE,
            c.brass,
            [lip * 0.3, trunkH * 0.42, 1],
            [0, trunkFrom + trunkH * 0.58, front + 2.2]
        ),
        paint(
            THREE,
            new THREE.CircleGeometry(towerW * 0.08, 16).translate(
                0,
                trunkFrom + trunkH * 0.34,
                front + 2.4
            ),
            c.brass
        )
    );

    // The clock: a cream face in a brass ring, its hours marked, its hands
    // at five to midnight.
    const faceY = (H * HAUNTED.trunk + hoodTop) / 2;
    const faceR = Math.min(towerW * 0.38, (hoodTop - H * HAUNTED.trunk) * 0.4);
    const fz = front + lip / 2;
    body.push(
        paint(
            THREE,
            new THREE.CircleGeometry(faceR * 1.16, 32).translate(
                0,
                faceY,
                fz + 1
            ),
            c.brass
        ),
        paint(
            THREE,
            new THREE.CircleGeometry(faceR, 32).translate(0, faceY, fz + 1.4),
            c.face
        )
    );
    for (let hour = 0; hour < 12; hour += 1) {
        const long = hour % 3 === 0;
        body.push(
            paint(
                THREE,
                new THREE.BoxGeometry(
                    faceR * 0.06,
                    faceR * (long ? 0.22 : 0.12),
                    0.6
                )
                    .translate(0, faceR * (long ? 0.8 : 0.85), 0)
                    .rotateZ((-hour * Math.PI) / 6)
                    .translate(0, faceY, fz + 1.8),
                c.oakDark
            )
        );
    }
    // [length, width, angle from 12 o'clock, clockwise]: the hour hand
    // just short of twelve, the minute hand on the eleven.
    for (const [len, w, turn] of [
        [0.55, 0.1, -Math.PI / 72],
        [0.8, 0.06, -Math.PI / 6],
    ]) {
        body.push(
            paint(
                THREE,
                new THREE.BoxGeometry(faceR * w, faceR * len, 0.6)
                    .translate(0, (faceR * len) / 2, 0)
                    .rotateZ(-turn)
                    .translate(0, faceY, fz + 2.2),
                c.dark
            )
        );
    }
    body.push(
        paint(
            THREE,
            new THREE.CircleGeometry(faceR * 0.08, 12).translate(
                0,
                faceY,
                fz + 2.6
            ),
            c.brass
        )
    );

    // The belfry: open arches on three sides, a dark back wall, the bell
    // hung from a beam in the middle, its clapper under it.
    const belfryW = towerW * 0.9;
    const belfryH = H * (HAUNTED.belfry - HAUNTED.hood);
    const belfryTop = H * HAUNTED.belfry;
    const middle = tz(towerD);
    const arched = (w) => {
        const panel = new THREE.Shape();
        panel.moveTo(-w / 2, 0);
        panel.lineTo(w / 2, 0);
        panel.lineTo(w / 2, belfryH);
        panel.lineTo(-w / 2, belfryH);
        panel.closePath();
        panel.holes.push(
            lancet(THREE, w * 0.62, belfryH * 0.8, belfryH * 0.08)
        );
        return panel;
    };
    body.push(
        box(
            THREE,
            c.dark,
            [belfryW * 0.86, belfryH, towerD * 0.2],
            [0, hoodTop + belfryH / 2, front - towerD * 0.8]
        ),
        extruded(THREE, c.oak, arched(belfryW), 2, [0, hoodTop, front])
    );
    for (const side of [-1, 1]) {
        body.push(
            paint(
                THREE,
                new THREE.ExtrudeGeometry(arched(towerD), {
                    depth: 2,
                    bevelEnabled: false,
                    curveSegments: 10,
                })
                    .translate(0, 0, -1)
                    .rotateY((side * Math.PI) / 2)
                    .translate(side * (belfryW / 2 - 1), hoodTop, middle),
                c.oak
            )
        );
    }
    const beamY = hoodTop + belfryH * 0.8;
    const bellH = belfryH * 0.46;
    const bellZ = front - towerD * 0.32;
    // A bell's outline, rim to top, as [radius, height] shares of its
    // height: a lip flaring in to a waisted dome.
    const bellProfile = [
        [0.48, 0],
        [0.5, 0.02],
        [0.44, 0.12],
        [0.34, 0.36],
        [0.3, 0.62],
        [0.27, 0.88],
        [0.2, 0.98],
        [0, 1],
    ].map(([r, y]) => new THREE.Vector2(r * bellH, y * bellH));
    body.push(
        box(
            THREE,
            c.oakDark,
            [belfryW * 0.8, lip, lip],
            [0, beamY + lip / 2, bellZ]
        ),
        paint(
            THREE,
            new THREE.LatheGeometry(bellProfile, 18).translate(
                0,
                beamY - bellH,
                bellZ
            ),
            c.brass
        ),
        paint(
            THREE,
            new THREE.SphereGeometry(bellH * 0.1, 8, 6).translate(
                0,
                beamY - bellH * 1.02,
                bellZ
            ),
            c.dark
        ),
        // Its cornice, and a brass ball at each corner.
        box(
            THREE,
            c.oakDark,
            [towerW + lip * 2, lip * 1.4, towerD + lip * 1.6],
            [0, belfryTop, middle]
        )
    );
    for (const cx of [-1, 1]) {
        for (const cz of [front, front - towerD]) {
            body.push(
                paint(
                    THREE,
                    new THREE.SphereGeometry(lip * 0.9, 8, 6).translate(
                        cx * (towerW / 2 + lip * 0.4),
                        belfryTop + lip * 1.5,
                        cz
                    ),
                    c.brass
                )
            );
        }
    }

    // The crown: a carved pediment on the front, then the spire.
    const crownH = H * 0.12;
    const spireFrom = belfryTop + lip * 0.7;
    body.push(
        extruded(THREE, c.oak, gable(THREE, towerW * 0.7, crownH), lip * 2, [
            0,
            spireFrom,
            front,
        ]),
        spire(THREE, c.roof, towerW * 0.86, H * HAUNTED.spire, [
            0,
            spireFrom,
            middle,
        ]),
        box(
            THREE,
            c.brass,
            [lip * 0.5, lip * 3, lip * 0.5],
            [0, spireFrom + H * HAUNTED.spire + lip * 1.4, middle]
        )
    );

    // The round window over the door, for the sign.
    const round = hauntedWindow({ width, height });
    windows.push(
        paint(
            THREE,
            new THREE.CircleGeometry(round.radius, 24).translate(
                0,
                round.y,
                front + 1.5
            ),
            c.glass
        )
    );
    body.push(
        paint(
            THREE,
            new THREE.RingGeometry(
                round.radius,
                round.radius * 1.2,
                24
            ).translate(0, round.y, front + 1.8),
            c.brass
        )
    );

    // The door at the tower's foot, under a sagging porch.
    const doorW = towerW * 0.36;
    const doorH = H * HAUNTED.door;
    body.push(
        extruded(
            THREE,
            c.oakDark,
            lancet(THREE, doorW + lip * 2, doorH + lip),
            1.5,
            [0, 0, front + 1.5]
        )
    );
    if (door) {
        const doorColors = doorLook(door);
        body.push(
            extruded(THREE, doorColors.wood, lancet(THREE, doorW, doorH), 1.5, [
                0,
                0,
                front + 3,
            ]),
            box(
                THREE,
                doorColors.knob,
                [lip * 0.8, lip * 0.8, 1.5],
                [doorW * 0.28, doorH * 0.42, front + 3.5]
            )
        );
    }
    const porchY = doorH + lip * 2.5;
    const porchD = 18;
    for (const x of [-towerW * 0.42, towerW * 0.42]) {
        body.push(
            box(
                THREE,
                c.dark,
                [lip, porchY, lip],
                [x, porchY / 2, front + porchD]
            )
        );
    }
    body.push(
        paint(
            THREE,
            new THREE.BoxGeometry(towerW * 1.05, lip * 0.8, porchD + 4)
                .rotateX(0.18)
                .rotateZ(0.05)
                .translate(0, porchY + lip, front + porchD / 2 + 1),
            c.roof
        ),
        box(
            THREE,
            c.trim,
            [towerW * 0.7, 3, porchD],
            [0, 1.5, front + porchD / 2]
        )
    );

    // An iron railing along the front, open at the gate.
    const railZ = front + porchD + 10;
    const railH = H * 0.13;
    const spikes = Math.round(W / 9);
    for (let i = 0; i <= spikes; i += 1) {
        const x = -W / 2 + (i * W) / spikes;
        if (Math.abs(x) < towerW * 0.45) continue;
        body.push(
            box(THREE, c.dark, [1.2, railH, 1.2], [x, railH / 2, railZ]),
            spire(THREE, c.dark, 2.2, railH * 0.25, [x, railH, railZ])
        );
    }
    for (const side of [-1, 1]) {
        const len = W / 2 - towerW * 0.45;
        const x = side * (towerW * 0.45 + len / 2);
        body.push(
            box(THREE, c.dark, [len, 1.2, 1.2], [x, railH * 0.85, railZ]),
            box(THREE, c.dark, [len, 1.2, 1.2], [x, railH * 0.2, railZ])
        );
    }

    return {
        body,
        windows,
        // Across the wings only: the clock tower stands in front of the
        // middle.
        bulbs: eaveBulbs(THREE, look, W, H, {
            skip: (x) => Math.abs(x) < towerW / 2 + lip * 2,
        }),
    };
}

// A butt facade's proportions, as shares of its front's `width` (w) or of
// its `height` to the waistband (h). Its roof is the Butt's two cheeks,
// over the waistband as high as the box's `roof` allows.
export const BUTT_HOUSE = {
    legs: 0.42, // h, the legs' tops, where the arch over the door springs
    crotch: 0.3, // w, the gap between the legs
    taper: 0.035, // w, how much narrower each leg is at its hem
    waistband: 0.1, // h
    cuff: 0.07, // h, each leg's rolled-up hem
    pocket: 0.2, // w, each back pocket (a window)
    pocketX: 0.25, // w, out from the middle
    loops: [0.2, 0.42], // w, the belt loops, out from the middle each side
    cheek: 0.28, // w, each cheek's half-width
    cheekX: 0.22, // w, each cheek's middle: close enough that they press together
    sag: 0.12, // radians: how far the cheeks spill down over the waistband
};

/** Where a butt front's leather label is, on its waistband under the
 * crack: its middle `y` and its `w` × `h`, for the sign on it. */
function buttLabel({ width, height }) {
    const w = Math.min(width * 0.15, height * 0.22);
    const h = w * 0.8;
    return { y: height - h / 2 - height * 0.015, w, h };
}

/** A back pocket `w` across: square-shouldered, pointed at the bottom. */
function pocketShape(THREE, w) {
    const h = w * 1.1;
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2, h);
    shape.lineTo(w / 2, h);
    shape.lineTo(w / 2, h * 0.15);
    shape.lineTo(0, 0);
    shape.lineTo(-w / 2, h * 0.15);
    shape.closePath();
    return shape;
}

/** A five-pointed star `r` across its points, centred on (0, 0). */
function starShape(THREE, r) {
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i += 1) {
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        const d = i % 2 === 0 ? r : r * 0.45;
        const [x, y] = [Math.cos(a) * d, Math.sin(a) * d];
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();
    return shape;
}

/**
 * The Butt's own house: the seat of a giant pair of pants, seen from
 * behind, with the Butt's cheeks for a roof and the crack between them: a
 * plumber's crack, spilling a little over the waistband. Two short legs
 * stand either side of the front door, under the arch of the crotch; the
 * back pockets are its windows, belt loops and a leather label (the
 * sign's) on the waistband. The look's `pants` dress it for the season:
 * jeans, Santa's trousers, Halloween stripes, stars and stripes. The
 * cheeks are always the Butt's. Built in the same space and parts as
 * building().
 */
function buttHouse(
    THREE,
    { width, height, depth, roof: roofHeight, look, door }
) {
    const c = look.pants;
    const W = width;
    const H = height;
    const lip = facadeLip(W, H);
    const legTop = H * BUTT_HOUSE.legs;
    const gap = W * BUTT_HOUSE.crotch;
    const archTop = legTop + gap / 2;
    // A leg is this much narrower at its hem than at the hip, its outer
    // side tapering in, so it reads as a trouser leg, not a wall.
    const taper = W * BUTT_HOUSE.taper;
    const bandH = H * BUTT_HOUSE.waistband;
    const body = [];
    const windows = [];

    /** The pants' outline between heights `a` and `b`, grown `grow` all
     * round (so a stripe wraps the cloth without fighting it): one piece
     * above the crotch, one round each leg below it, or one with the
     * crotch's arch cut out of it. */
    const cloth = (a, b, grow = 0) => {
        const radius = gap / 2 - grow;
        const apex = legTop + radius;
        const outer = (y) => W / 2 + grow - taper * Math.max(0, 1 - y / legTop);
        // The outer edge from `a` up to `b`, through the knee where the
        // taper stops, if it's between them.
        const outerUp = [
            a,
            ...(legTop > a && legTop < b ? [legTop] : []),
            b,
        ].map((y) => [outer(y), y]);
        /** The inner edge (right of the crack) from `from` up to `to`:
         * straight up the leg, then round the arch, stepped by angle. */
        const innerEdge = (from, to) => {
            const points =
                from < legTop
                    ? [
                          [radius, from],
                          [radius, Math.min(to, legTop)],
                      ]
                    : [];
            if (to <= legTop) return points;
            const angle = (y) =>
                Math.asin(Math.min(1, Math.max(0, (y - legTop) / radius)));
            const [start, end] = [angle(from), angle(to)];
            const steps = 16;
            for (let i = from < legTop ? 1 : 0; i <= steps; i += 1) {
                const t = start + ((end - start) * i) / steps;
                points.push([
                    radius * Math.cos(t),
                    legTop + radius * Math.sin(t),
                ]);
            }
            return points;
        };
        const shape = (points) =>
            new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
        const mirror = (points) => points.map(([x, y]) => [-x, y]);
        if (a >= apex) {
            return [shape([...outerUp, ...mirror(outerUp).reverse()])];
        }
        const innerUp = innerEdge(a, Math.min(b, apex));
        if (b <= apex) {
            const leg = [...outerUp, ...[...innerUp].reverse()];
            return [shape(leg), shape(mirror(leg))];
        }
        return [
            shape([
                ...outerUp,
                ...mirror(outerUp).reverse(),
                ...mirror(innerUp),
                ...[...innerUp].reverse().slice(1),
            ]),
        ];
    };

    // The pants, legs and all, pushed back the house's depth.
    body.push(extruded(THREE, c.denim, cloth(0, H)[0], depth, [0, 0, 0]));

    // Stripes round them, where the season has any: each band of the
    // cloth, a little proud of it all round.
    if (c.stripes) {
        const bands = 9;
        const band = (H - bandH) / bands;
        for (let i = 1; i < bands; i += 2) {
            for (const stripe of cloth(i * band, (i + 1) * band, 0.3)) {
                body.push(
                    extruded(THREE, c.stripes, stripe, depth + 0.6, [0, 0, 0.3])
                );
            }
        }
    }

    // A rolled-up cuff round each leg's hem.
    const cuffH = H * BUTT_HOUSE.cuff;
    const hemOuter = W / 2 - taper * (1 - cuffH / 2 / legTop);
    for (const side of [-1, 1]) {
        body.push(
            box(
                THREE,
                c.cuff,
                [hemOuter - gap / 2 + lip * 1.4, cuffH, depth + lip * 1.4],
                [(side * (hemOuter + gap / 2)) / 2, cuffH / 2, -depth / 2]
            )
        );
    }

    // Under the crotch: the dark inside of the pants, and the door in it.
    body.push(
        box(THREE, c.dark, [gap, archTop, 2], [0, archTop / 2, -depth * 0.3]),
        box(
            THREE,
            c.cuff,
            [gap * 0.9, 3, depth * 0.3 + 6],
            [0, 1.5, -depth * 0.15 + 3]
        )
    );
    if (door) {
        const doorColors = doorLook(door);
        const doorW = gap * 0.62;
        const doorH = Math.min(archTop * 0.88, H * 0.4);
        body.push(
            extruded(THREE, doorColors.wood, lancet(THREE, doorW, doorH), 1.5, [
                0,
                0,
                -depth * 0.3 + 2.5,
            ]),
            box(
                THREE,
                doorColors.knob,
                [lip, lip, 1.5],
                [doorW * 0.28, doorH * 0.42, -depth * 0.3 + 3]
            )
        );
    }

    // Stitching: the seat seam from the crack to the crotch, and the yoke,
    // dipping from the hips to the middle under the waistband.
    const seamTo = H - bandH;
    body.push(
        box(
            THREE,
            c.stitch,
            [lip * 0.6, seamTo - archTop, 1],
            [0, (archTop + seamTo) / 2, 0.6]
        )
    );
    const dip = H * 0.08;
    const half = Math.hypot(W / 2, dip);
    for (const side of [-1, 1]) {
        body.push(
            paint(
                THREE,
                new THREE.BoxGeometry(half, lip * 0.6, 1)
                    .rotateZ(side * Math.atan2(dip, W / 2))
                    .translate(side * (W / 4), seamTo - dip / 2 - lip, 0.6),
                c.stitch
            )
        );
    }

    // The back pockets, stitched round: the windows.
    // As wide as the front allows, but no taller than the seat between
    // the legs and the yoke leaves them (a pocket is 1.1 times as tall).
    const seat = seamTo - dip - legTop;
    const pocketW = Math.min(W * BUTT_HOUSE.pocket, (seat * 0.85) / 1.1);
    const pocketY = legTop + (seat - pocketW * 1.1) / 2;
    for (const side of [-1, 1]) {
        const x = side * W * BUTT_HOUSE.pocketX;
        body.push(
            extruded(
                THREE,
                c.stitch,
                pocketShape(THREE, pocketW + lip * 1.6),
                1,
                [x, pocketY - lip * 1.1, 1.2]
            ),
            box(
                THREE,
                c.stitch,
                [lip * 0.6, pocketW * 0.9, 1],
                [x, pocketY + pocketW * 0.62, 2.4]
            ),
            box(
                THREE,
                c.stitch,
                [pocketW * 0.96, lip * 0.6, 1],
                [x, pocketY + pocketW * 0.68, 2.4]
            )
        );
        windows.push(
            extruded(THREE, c.glass, pocketShape(THREE, pocketW), 1, [
                x,
                pocketY,
                1.8,
            ])
        );
    }

    // The waistband, its belt loops, and the leather label under the crack.
    body.push(
        box(
            THREE,
            c.waistband,
            [W + lip * 2, bandH, depth + lip * 2],
            [0, H - bandH / 2, -depth / 2]
        )
    );
    const loopW = W * 0.035;
    for (const at of BUTT_HOUSE.loops) {
        for (const side of [-1, 1]) {
            body.push(
                box(
                    THREE,
                    c.denim,
                    [loopW, bandH * 0.9, lip],
                    [side * at * W, H - bandH / 2, lip * 1.5]
                )
            );
        }
    }
    if (c.stars) {
        for (const at of [0.1, 0.31, 0.47]) {
            for (const side of [-1, 1]) {
                body.push(
                    extruded(
                        THREE,
                        c.stars,
                        starShape(THREE, bandH * 0.32),
                        0.6,
                        [side * at * W, H - bandH / 2, lip + 0.8]
                    )
                );
            }
        }
    }
    const label = buttLabel({ width, height });
    body.push(
        box(THREE, c.label, [label.w, label.h, 1], [0, label.y, lip + 0.5])
    );

    // The cheeks: two big domes in the Butt's own colours, bulging over
    // the back and front and spilling just over the waistband (a cut-off
    // sphere, past its equator by `sag`).
    const rx = W * BUTT_HOUSE.cheek;
    const ry = roofHeight * 0.97;
    const rz = depth / 2 + lip * 3;
    const cheekX = W * BUTT_HOUSE.cheekX;
    for (const side of [-1, 1]) {
        body.push(
            paint(
                THREE,
                new THREE.SphereGeometry(
                    1,
                    32,
                    14,
                    0,
                    Math.PI * 2,
                    0,
                    Math.PI / 2 + BUTT_HOUSE.sag
                )
                    .scale(rx, ry, rz)
                    .translate(side * cheekX, H, -depth / 2),
                BUTT_COLORS.near
            )
        );
    }
    // The crack: a thin dark dome down the middle, just filling the curve
    // where the cheeks press together (the cheeks meet in an ellipse
    // `meet` times their own height and depth), so it shows only as the
    // line between them.
    const meet = Math.sqrt(1 - (cheekX / rx) ** 2) * 1.06;
    body.push(
        paint(
            THREE,
            new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2)
                .scale(lip, ry * meet, rz * meet)
                .translate(0, H, -depth / 2),
            BUTT_COLORS.cleft
        )
    );

    return {
        body,
        windows,
        // Along the waistband, clear of its belt loops (eaveBulbs leaves
        // the label clear), and out past the cheeks spilling over it.
        bulbs: eaveBulbs(THREE, look, W, H, {
            skip: (x) =>
                BUTT_HOUSE.loops.some(
                    (at) => Math.abs(Math.abs(x) - at * W) < loopW
                ),
            out: () => lip * 3,
        }),
    };
}

// A bean can's proportions, as shares of its `height` (h) to the top of its
// rim or of its `width` (w), its diameter. Its lid is the box's `roof`.
export const BEAN_CAN = {
    rim: 0.045, // h, the ribbed tin either side of the label
    band: 0.22, // of the label's height: the red band across its top
    door: { w: 0.2, h: 0.34 }, // w, h
    sign: { y: 0.45, size: 0.25 }, // h: Guster's feet, and how big he is
    bowl: { rim: 0.3, heap: 0.41, half: 0.27 }, // h, h, w (half its width)
    window: 0.56, // h, the middle of each gingham window
    windowAt: 24, // degrees round from the front to a window's near edge
    checks: 11, // gingham checks down the label
};

// The can is the same all year: it's the one Guster came out of. Only its
// pixie dust follows the season (the look's `pixieDust`).
export const BEAN_CAN_COLORS = {
    tin: "#c9ced6",
    rib: "#8f97a3",
    lid: "#dfe3e8",
    red: "#c62828",
    cream: "#fff4e0",
    letter: "#ffffff",
    outline: "#5c0d10",
    white: "#f8fafc",
    check: "#8dbbe6",
    cross: "#2f6fb5", // where two checks cross, and the windows
    bowl: "#b5653f",
    bowlRim: "#d68a5c",
    bowlShade: "#7a3b22",
    beans: ["#c8693a", "#d9824a", "#b85a2f", "#e0905a"],
    shine: "#ffe0bd",
    glint: "#fff3b0",
};

// The label is painted this many px round, and as tall as keeps its
// pictures unstretched.
const LABEL_PX = 1024;

/** A bean can's label, `W` across and `H` to its rim's top: where it is
 * (`y0` to `y1`, round a can `r` in radius), the size it's painted at
 * (`cw` × `ch` px, its middle the can's front), its gingham (`cols` checks
 * round, each `check` px), and where a height or an x across the front
 * lands on it (`py(y)`, `ux(x)`). */
function beanLabel(W, H) {
    const r = W / 2;
    const y0 = H * BEAN_CAN.rim;
    const y1 = H * (1 - BEAN_CAN.rim);
    const tall = y1 - y0;
    const cw = LABEL_PX;
    const ch = Math.max(64, Math.round((cw * tall) / (Math.PI * W)));
    // An even count round, so the front's middle falls between two.
    const cols = Math.max(2, Math.round(cw / (ch / BEAN_CAN.checks) / 2) * 2);
    return {
        r,
        y0,
        y1,
        tall,
        cw,
        ch,
        cols,
        check: cw / cols,
        py: (y) => ((y1 - y) / tall) * ch,
        ux: (x) =>
            cw *
            (0.5 + Math.asin(Math.max(-1, Math.min(1, x / r))) / (Math.PI * 2)),
    };
}

/** A bean can's two gingham windows, a 2 × 2 block of checks either side
 * of Guster: each { from, to } in radians round from the front, and
 * { bottom, top } in height. On whole checks, so by day they're part of
 * the pattern. */
function beanWindows(label, H) {
    const step = (Math.PI * 2) / label.cols;
    const k = Math.max(
        1,
        Math.round((BEAN_CAN.windowAt * Math.PI) / 180 / step)
    );
    const row = Math.max(
        1,
        Math.round(label.py(H * BEAN_CAN.window) / label.check) - 1
    );
    const yAt = (px) => label.y1 - (px / label.ch) * label.tall;
    const span = {
        bottom: yAt((row + 2) * label.check),
        top: yAt(row * label.check),
    };
    return [
        { from: -(k + 2) * step, to: -k * step, ...span },
        { from: k * step, to: (k + 2) * step, ...span },
    ];
}

/** A four-pointed glint `r` across its points at (x, y). */
function glint(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
        const a = (i * Math.PI) / 4;
        const d = i % 2 === 0 ? r : r * 0.28;
        ctx[i ? "lineTo" : "moveTo"](x + Math.sin(a) * d, y - Math.cos(a) * d);
    }
    ctx.closePath();
    ctx.fill();
}

/** Paints a bean can's label (`beanLabel()`) onto `ctx`: blue gingham all
 * round, a red band across the top with `words.beans` on the front, and a
 * bowl heaped with beans at the foot of the front, where the door is. */
function paintBeanLabel(ctx, label, H, words) {
    const C = BEAN_CAN_COLORS;
    const { cw, ch, cols, check } = label;

    // Gingham: white, a light blue check where one stripe runs, and a
    // darker one where two cross.
    ctx.fillStyle = C.white;
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = C.check;
    for (let i = 0; i < cols; i += 2) ctx.fillRect(i * check, 0, check, ch);
    for (let j = 0; j * check < ch; j += 2) {
        ctx.fillRect(0, j * check, cw, check);
    }
    ctx.fillStyle = C.cross;
    for (let i = 0; i < cols; i += 2) {
        for (let j = 0; j * check < ch; j += 2) {
            ctx.fillRect(i * check, j * check, check, check);
        }
    }

    // The red band, a cream line under it, and the words on the front.
    const band = ch * BEAN_CAN.band;
    ctx.fillStyle = C.red;
    ctx.fillRect(0, 0, cw, band);
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, band, cw, Math.max(2, band * 0.05));
    const text = (words.beans ?? "").toUpperCase();
    if (text) {
        const room = cw * 0.25; // ±45° round the front
        let size = band * 0.62;
        ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
        size = Math.min(size, (size * room) / ctx.measureText(text).width);
        ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = size * 0.16;
        ctx.strokeStyle = C.outline;
        ctx.strokeText(text, cw / 2, band * 0.54);
        ctx.fillStyle = C.letter;
        ctx.fillText(text, cw / 2, band * 0.54);
    }

    // The bowl of beans: a heap of beans over a terracotta bowl.
    const cx = cw / 2;
    const half = label.ux(label.r * 2 * BEAN_CAN.bowl.half) - cx;
    const rim = label.py(H * BEAN_CAN.bowl.rim);
    const heap = rim - label.py(H * BEAN_CAN.bowl.heap);
    ctx.fillStyle = C.beans[0];
    ctx.beginPath();
    ctx.ellipse(cx, rim, half * 0.96, heap, 0, Math.PI, 0);
    ctx.fill();
    const bean = Math.max(3, check * 0.3);
    for (let i = 0; i < 160; i += 1) {
        const a = Math.PI * (1 + jitter(i + 0.11));
        const d = Math.sqrt(jitter(i + 0.37));
        const x = cx + Math.cos(a) * d * half * 0.92;
        const y = rim + Math.sin(a) * d * heap * 0.92;
        ctx.fillStyle = C.beans[i % C.beans.length];
        ctx.beginPath();
        ctx.ellipse(
            x,
            y,
            bean,
            bean * 0.66,
            jitter(i + 0.59) * Math.PI,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.fillStyle = C.shine;
        ctx.beginPath();
        ctx.arc(x - bean * 0.3, y - bean * 0.25, bean * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }
    const foot = ch - Math.max(2, ch * 0.02);
    ctx.fillStyle = C.bowl;
    ctx.beginPath();
    ctx.moveTo(cx - half, rim);
    ctx.quadraticCurveTo(cx - half, foot, cx - half * 0.55, foot);
    ctx.lineTo(cx + half * 0.55, foot);
    ctx.quadraticCurveTo(cx + half, foot, cx + half, rim);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.bowlShade;
    ctx.fillRect(
        cx - half * 0.55,
        foot - (foot - rim) * 0.12,
        half * 1.1,
        (foot - rim) * 0.12
    );
    // Its rolled rim, beaded like rope.
    const lip = Math.max(4, (foot - rim) * 0.14);
    ctx.fillStyle = C.bowlRim;
    ctx.fillRect(cx - half * 1.03, rim - lip / 2, half * 2.06, lip);
    ctx.fillStyle = C.shine;
    for (let x = cx - half; x < cx + half; x += lip * 0.9) {
        ctx.beginPath();
        ctx.arc(x, rim, lip * 0.22, 0, Math.PI * 2);
        ctx.fill();
    }
    // A little magic on them.
    ctx.fillStyle = C.glint;
    for (let i = 0; i < 6; i += 1) {
        glint(
            ctx,
            cx + (jitter(i + 0.71) - 0.5) * half * 1.6,
            rim - heap * (0.4 + jitter(i + 0.83) * 0.7),
            bean * 1.4
        );
    }
}

/**
 * Guster's house: a giant can of magic beans, standing upright with its lid
 * shut, because that's how he was born. Ribbed tin top and bottom; round
 * the middle a label as the picture has it: blue gingham, a red band with
 * MAGIC BEANS on it (`words.beans`, painted by the road), and a bowl of
 * beans at the foot of the front, his door standing in it. Guster is the
 * sign, in the gingham, between two gingham-square windows. The label
 * comes back as `labels` (a geometry with its UVs, and how to paint it),
 * since it's a picture, not the street's flat colour; the pixie dust round
 * it is the road's (FACADES.beans.dust, pixieDust.js). Built in the same
 * space as building(), the can's front on z = 0.
 */
function beanCan(THREE, { width, height, roof: lidHeight, look, door }) {
    const C = BEAN_CAN_COLORS;
    const W = width;
    const H = height;
    const label = beanLabel(W, H);
    const { r } = label;
    const onAxis = (geometry, y) => geometry.translate(0, y, -r);
    const body = [];

    // Ribbed tin either side of the label, a seam rolled round each end.
    const rimH = H * BEAN_CAN.rim;
    const ring = (radius, tube, y, color) =>
        paint(
            THREE,
            onAxis(
                new THREE.TorusGeometry(radius, tube, 6, 48).rotateX(
                    Math.PI / 2
                ),
                y
            ),
            color
        );
    for (const y of [rimH / 2, H - rimH / 2]) {
        body.push(
            paint(
                THREE,
                onAxis(
                    new THREE.CylinderGeometry(r * 1.01, r * 1.01, rimH, 48),
                    y
                ),
                C.tin
            ),
            ring(r * 1.012, rimH * 0.1, y, C.rib)
        );
    }
    body.push(ring(r * 0.995, rimH * 0.28, rimH * 0.28, C.rib));

    // The lid, shut: its seam rolled round the top, a disc sunk inside
    // it, and rings pressed into the disc.
    // Tucked in, so the roll stands only a little proud of the can.
    const seam = lidHeight / 2;
    body.push(
        ring(r - seam * 0.6, seam, H + seam, C.tin),
        paint(
            THREE,
            onAxis(
                new THREE.CylinderGeometry(r * 0.97, r * 0.97, seam, 48),
                H + seam / 2
            ),
            C.lid
        ),
        ring(r * 0.62, seam * 0.18, H + seam, C.rib),
        ring(r * 0.34, seam * 0.18, H + seam, C.rib)
    );

    // The door, standing in the bowl of beans, deep enough to meet the
    // can as it curves away behind it.
    if (door) {
        const doorColors = doorLook(door);
        const w = W * BEAN_CAN.door.w;
        const h = H * BEAN_CAN.door.h;
        const sunk = r - Math.sqrt(r * r - (w / 2) ** 2) + 1.5;
        body.push(
            box(
                THREE,
                doorColors.wood,
                [w, h, sunk + 1.5],
                [0, h / 2, 1.5 - (sunk + 1.5) / 2]
            ),
            box(
                THREE,
                doorColors.knob,
                [w * 0.14, w * 0.14, 3],
                [w * 0.28, h * 0.48, 2.5]
            )
        );
    }

    // Two gingham checks for windows, curved with the can, a hair proud of
    // the label: the darkest check by day, lit at night.
    const windows = beanWindows(label, H).map(({ from, to, bottom, top }) =>
        paint(
            THREE,
            onAxis(
                new THREE.CylinderGeometry(
                    r + 0.6,
                    r + 0.6,
                    top - bottom,
                    8,
                    1,
                    true,
                    from,
                    to - from
                ),
                (top + bottom) / 2
            ),
            C.cross
        )
    );

    // The label: a cylinder open at both ends, its seam at the back.
    const labelGeometry = onAxis(
        new THREE.CylinderGeometry(
            r,
            r,
            label.tall,
            64,
            1,
            true,
            -Math.PI,
            Math.PI * 2
        ),
        (label.y0 + label.y1) / 2
    );

    return {
        body,
        windows,
        labels: [
            {
                geometry: labelGeometry,
                width: label.cw,
                height: label.ch,
                draw: (ctx, words = {}) => paintBeanLabel(ctx, label, H, words),
            },
        ],
        // Round the top rim, following the can as it curves away.
        bulbs: eaveBulbs(THREE, look, W, H, {
            out: (x) => r * 0.012 - (r - Math.sqrt(Math.max(0, r * r - x * x))),
        }),
    };
}

/** Building shapes other than the plain house, by the name a road door's
 * `facade` gives (GamesWorld::FACADES, which a test keeps in step): `build`
 * draws it as building() does, `sign` says where its landmark's sign goes
 * ({ y: its foot, size, z: out from the front }) for a building box, and
 * `dust`, where a front has any, the pixie dust swirling round it
 * (pixieDust.js: the can's `radius` and how `high` it rises). */
export const FACADES = {
    beans: {
        build: beanCan,
        sign(box) {
            return {
                y: box.height * BEAN_CAN.sign.y,
                size: box.height * BEAN_CAN.sign.size,
                z: 2,
            };
        },
        dust(box) {
            return { radius: box.width / 2, high: box.height + box.roof };
        },
    },
    butt: {
        build: buttHouse,
        sign(box) {
            const label = buttLabel(box);
            const size = label.h * 0.9;
            return {
                y: label.y - size / 2,
                size,
                z: facadeLip(box.width, box.height) + 1.5,
            };
        },
    },
    gothic: {
        build: gothic,
        sign(box) {
            const rose = gothicRose(box);
            const size = rose.radius * 1.5;
            return { y: rose.y - size / 2, size, z: 4 };
        },
    },
    haunted: {
        build: haunted,
        sign(box) {
            const round = hauntedWindow(box);
            const size = round.radius * 1.5;
            return { y: round.y - size / 2, size, z: HAUNTED_FRONT + 3 };
        },
    },
};

// Bulbs under the eaves: about this many units apart, and this big a share
// of the building's height (with a floor, so a far house's still show).
// None within `gap` of the middle (a share of the building's smaller side),
// where a landmark's sign hangs (RoadScene.js placeLandmarkPuppet).
const BULB = { spacing: 18, size: 0.035, min: 3, gap: 0.26 };

/** Two strings of bulbs hung just under the eaves trim across a building's
 * front, either side of its sign, through the look's bulb colours in turn.
 * A shaped front can leave out bulbs that would be lost in it (`skip(x)`)
 * and hang some further out (`out(x)`, from its wall at z = 0). */
function eaveBulbs(
    THREE,
    look,
    width,
    height,
    { skip = () => false, out = () => 0 } = {}
) {
    if (!look.bulbs?.length) return [];
    const size = Math.max(BULB.min, height * BULB.size);
    const count = Math.max(2, Math.round(width / BULB.spacing));
    const gap = Math.min(width, height) * BULB.gap;
    const xs = Array.from(
        { length: count },
        (_, i) => -width / 2 + ((i + 0.5) * width) / count
    ).filter((x) => Math.abs(x) > gap && !skip(x));
    return xs.map((x, i) =>
        paint(
            THREE,
            new THREE.OctahedronGeometry(size / 2, 0).translate(
                x,
                height - 3 - size / 2,
                out(x) + 4 + size / 2
            ),
            look.bulbs[i % look.bulbs.length]
        )
    );
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
