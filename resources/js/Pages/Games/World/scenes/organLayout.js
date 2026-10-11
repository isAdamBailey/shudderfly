import { clamp } from "../composables/useGamesWorld.js";
import { itemPose } from "./roomLayout.js";

/**
 * The Cockroach's pipe organ, as pure numbers: how big it is, where its keys
 * are, and which key a press lands on. three/pipeOrgan.js draws it from
 * these; Room3D.vue lays a button over each zone of its keyboard from them.
 *
 * The organ is built facing +z with its back on z = 0 and its middle on
 * x = 0, as a card on the back wall would be, then posed on its wall like
 * any interactable (roomLayout.js itemPose()). Along its keyboard, x runs
 * from the deep notes (-x, the player's left) to the squeaky ones (+x).
 */

export const ORGAN = {
    // Along its wall, and how tall the pipe case stands.
    length: 300,
    height: 410,
    // The keydesk: how far it reaches out of the wall, and its top.
    desk: { depth: 70, top: 78 },
    // The keyboard: across x, its keys' top, and from their back to the
    // front edge (past the desk, so a press reads from the open front).
    keys: { from: -132, to: 132, y: 84, back: 42, front: 82 },
    // Each zone of the keyboard is an octave of white keys, A to G: A
    // minor, so every note it plays is a key you can see go down.
    zones: 4,
    whiteKeys: 7,
    // The ledge the pipes stand on, and how far out their two rows are.
    ledge: 138,
    rows: [10, 24],
    // The tallest (deepest) pipe and the shortest.
    pipes: { tallest: 250, shortest: 64 },
};

/** How many white keys (and pipes) the organ has. */
export const KEY_COUNT = ORGAN.zones * ORGAN.whiteKeys;

/** How wide each white key is (local x). */
export const KEY_WIDTH = (ORGAN.keys.to - ORGAN.keys.from) / KEY_COUNT;

/** Key `n`'s middle along the keyboard (local x). Pipe `n` stands over it. */
export function keyX(n) {
    return ORGAN.keys.from + (n + 0.5) * KEY_WIDTH;
}

/** Organ `item`'s local point [x, y, z] in the room. */
export function organPoint(item, [x, y, z]) {
    const pose = itemPose(item);
    const cos = Math.cos(pose.turn);
    const sin = Math.sin(pose.turn);
    return {
        x: pose.x + x * cos + z * sin,
        y: pose.y + y,
        z: pose.z - x * sin + z * cos,
    };
}

// What a zone's button covers: its keys from the front of the desk below
// them to a little above their tops.
const ZONE_Y = { from: ORGAN.desk.top - 24, to: ORGAN.keys.y + 8 };

/** The eight corners of zone `zone`'s keys in the room: what its button
 * covers once projected. */
export function zoneCorners(item, zone) {
    const x0 = keyX(zone * ORGAN.whiteKeys) - KEY_WIDTH / 2;
    const x1 = x0 + ORGAN.whiteKeys * KEY_WIDTH;
    const corners = [];
    for (const x of [x0, x1]) {
        for (const y of [ZONE_Y.from, ZONE_Y.to]) {
            for (const z of [ORGAN.keys.back, ORGAN.keys.front]) {
                corners.push(organPoint(item, [x, y, z]));
            }
        }
    }
    return corners;
}

/** Which of zone `zone`'s white keys (0 to whiteKeys - 1) is at room
 * point `at` ({ x, z }, on the keys' plane, y = keys.y): the press read
 * along the keyboard in the organ's own space, so a key's whole depth is
 * that key, however slanted the keyboard is seen. */
export function keyAt(item, zone, at) {
    const pose = itemPose(item);
    const dx = at.x - pose.x;
    const dz = at.z - pose.z;
    const along = dx * Math.cos(pose.turn) - dz * Math.sin(pose.turn);
    const from = keyX(zone * ORGAN.whiteKeys) - KEY_WIDTH / 2;
    const key = Math.floor((along - from) / KEY_WIDTH);
    return clamp(key, 0, ORGAN.whiteKeys - 1);
}

// How far out of its wall the organ reaches (to its pedalboard's front),
// and past its ends (the towers and cornice).
const REACH = ORGAN.desk.depth + 54;
const ENDS = ORGAN.length / 2 + 10;

/** The floor organ `item` stands on, in the room: { x0, x1, z0, z1 }.
 * The Butt keeps off it (useRoom.js), so it never covers the keys. */
export function organFootprint(item) {
    const a = organPoint(item, [-ENDS, 0, 0]);
    const b = organPoint(item, [ENDS, 0, REACH]);
    return {
        x0: Math.min(a.x, b.x),
        x1: Math.max(a.x, b.x),
        z0: Math.min(a.z, b.z),
        z1: Math.max(a.z, b.z),
    };
}

/** The convex hull of screen points `points` ({ x, y }), round it in order
 * (Andrew's monotone chain): the outline of a zone's projected keys. */
export function convexHull(points) {
    const sorted = [...points].sort((p, q) => p.x - q.x || p.y - q.y);
    if (sorted.length < 3) return sorted;
    const cross = (o, a, b) =>
        (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const half = (list) => {
        const out = [];
        for (const p of list) {
            while (
                out.length >= 2 &&
                cross(out[out.length - 2], out[out.length - 1], p) <= 0
            ) {
                out.pop();
            }
            out.push(p);
        }
        out.pop();
        return out;
    };
    return [...half(sorted), ...half([...sorted].reverse())];
}
