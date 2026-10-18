import {
    boardY,
    HARP,
    neckY,
    stringEnds,
    stringX,
} from "../scenes/harpLayout.js";
import { box, mergeParts, paint } from "../scenes/streetGeometry.js";

// The Cockroach's harp: a gilt column up its left side, a carved neck
// curving over, a soundboard slanting up from its foot, and a string from
// the soundboard to the neck for every note, the C strings red as a real
// harp's are. A plucked string rings: it blurs wide as it shakes, and
// glows, dying away together. Under reduced motion it only glows.
//
// Built in world units in its own space (scenes/harpLayout.js): facing +z,
// its middle on x = 0, standing on y = 0. The room poses it. Its frame is
// one mesh coloured in its vertices.

const WOOD = "#6b3a1e";
const DARK = "#3b1f0f";
const GILT = "#b8902f";
const GUT = "#eadfc4";
const RED = "#b91c1c";
const GLOW = "#ffd27a";

// How long a plucked string rings, s, how brightly it glows, and how wide
// it blurs as it shakes (times its width) and how fast it flickers
// (radians a second).
const RING = 1.4;
const GLOW_ON = 1.2;
const BLUR = { amount: 2.2, rate: 70 };
// A string's radius. The C strings (every fifth, from the second: the
// strings run A C D E G) are red.
const STRING_RADIUS = 0.9;
const isC = (n) => n % 5 === 1;

/** A box `length` long from point `a` to point `b` (local x, y), `thick`
 * across and `deep` deep, centred on the harp's plane. */
function beam(THREE, color, [ax, ay], [bx, by], thick, deep) {
    const length = Math.hypot(bx - ax, by - ay);
    const geometry = new THREE.BoxGeometry(length, thick, deep)
        .rotateZ(Math.atan2(by - ay, bx - ax))
        .translate((ax + bx) / 2, (ay + by) / 2, HARP.z);
    return paint(THREE, geometry, color);
}

/** The base, column, soundboard and neck: one geometry. */
function frame(THREE) {
    const { column, board, neck, depth, z } = HARP;
    const parts = [
        // The foot it stands on, under the column and the soundboard's end.
        box(THREE, DARK, [76, 22, depth], [column.x + 16, 11, z]),
        // The column, with a crown on top.
        paint(
            THREE,
            new THREE.CylinderGeometry(
                column.radius,
                column.radius * 1.2,
                column.top - 22,
                12
            ).translate(column.x, 22 + (column.top - 22) / 2, z),
            GILT
        ),
        paint(
            THREE,
            new THREE.SphereGeometry(column.radius * 1.6, 12, 8).translate(
                column.x,
                column.top + 4,
                z
            ),
            GILT
        ),
        // The soundboard, and a gilt rib down its face where the strings
        // come out.
        beam(THREE, WOOD, board.from, board.to, board.thick, depth),
        beam(
            THREE,
            GILT,
            [board.from[0] + 4, boardY(board.from[0] + 4) + board.thick / 2],
            [board.to[0] - 4, boardY(board.to[0] - 4) + board.thick / 2],
            3,
            8
        ),
    ];
    // The neck, in short straight lengths along its curve, and a scroll at
    // its end.
    const pieces = 10;
    for (let i = 0; i < pieces; i += 1) {
        const x0 = neck.from + ((neck.to - neck.from) * i) / pieces;
        const x1 = neck.from + ((neck.to - neck.from) * (i + 1)) / pieces;
        parts.push(
            beam(THREE, WOOD, [x0, neckY(x0)], [x1, neckY(x1)], neck.thick, 22)
        );
    }
    parts.push(
        paint(
            THREE,
            new THREE.SphereGeometry(neck.thick * 0.7, 10, 8).translate(
                neck.to,
                neckY(neck.to),
                z
            ),
            GILT
        )
    );
    return mergeParts(THREE, parts);
}

/**
 * The harp, as { group, pluck(n, delay), tick(dt, reduced) }: `pluck`
 * rings string `n` (0 the deepest) `delay` s from now; `tick` animates and
 * says whether anything moved. Its meshes are freed with the room
 * (disposeTree).
 */
export function harp(THREE) {
    const group = new THREE.Group();

    const wood = new THREE.Mesh(
        frame(THREE),
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })
    );
    wood.castShadow = true;
    wood.receiveShadow = true;
    group.add(wood);

    // The strings: one unit shape, each scaled to its length, with its
    // own material to glow while it rings.
    const shape = new THREE.CylinderGeometry(1, 1, 1, 6);
    const strings = [];
    for (let n = 0; n < HARP.strings.count; n += 1) {
        const { bottom, top } = stringEnds(n);
        const mesh = new THREE.Mesh(
            shape,
            new THREE.MeshStandardMaterial({
                color: isC(n) ? RED : GUT,
                roughness: 0.5,
                emissive: new THREE.Color(GLOW),
                emissiveIntensity: 0,
            })
        );
        mesh.scale.set(STRING_RADIUS, top - bottom, STRING_RADIUS);
        mesh.position.set(stringX(n), (bottom + top) / 2, HARP.z);
        group.add(mesh);
        strings.push({ mesh, t: null });
    }

    return {
        group,

        /** Rings string `n`, `delay` s from now. */
        pluck(n, delay = 0) {
            const string = strings[n];
            if (string) string.t = -delay;
        },

        /** Advances by `dt` s; whether anything moved. */
        tick(dt, reduced = false) {
            let changed = false;
            for (const string of strings) {
                if (string.t === null) continue;
                string.t += dt;
                changed = true;
                if (string.t < 0) continue;
                const v = Math.max(0, 1 - string.t / RING);
                if (v === 0) string.t = null;
                string.mesh.material.emissiveIntensity = GLOW_ON * v;
                const blur = reduced
                    ? 0
                    : BLUR.amount *
                      v *
                      Math.abs(Math.sin(string.t * BLUR.rate));
                const width = STRING_RADIUS * (1 + blur);
                string.mesh.scale.x = width;
                string.mesh.scale.z = width;
            }
            return changed;
        },
    };
}
