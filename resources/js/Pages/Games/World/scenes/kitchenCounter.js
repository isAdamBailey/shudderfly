import { BRASS } from "./entertainmentCenter.js";
import { box, mergeParts } from "./streetGeometry.js";

/**
 * A run of kitchen counter against a room's back wall (the Butt's House
 * kitchen, where the fruit bowl and the sprout pot stand on it), with wall
 * cabinets over it. A room's `counters` lists them: `{ x, w, h, d, upper }`,
 * its middle `x` along the wall, `h` to its worktop, `d` deep, and `upper`
 * `{ y, h, d }` its wall cabinets, their bottom `y` up the wall. Cupboard
 * doors in pairs with brass knobs over a dark kick plate, a stone worktop.
 * The fridge and the oven beside it are models (three/fridge.js,
 * three/oven.js), the kitchen's games. Geometry from an injected `THREE`,
 * as in entertainmentCenter.js.
 */

const TOP = 6; // how thick the worktop is
const OVERHANG = 4; // how far the worktop reaches past the cupboards
const KICK = 12; // how tall the kick plate under the cupboards is
const RECESS = 5; // how far the kick plate is set back
const GAP = 4; // between neighbouring doors
const DOOR_W = 70; // about how wide a cupboard door is

const CABINET = "#e7dcc6";
const DOOR = "#f3ead8";
const PANEL = "#e2d4b8";
const KICK_COLOR = "#3f3a33";
const WORKTOP = "#9ca3af";

/** `count` doors across a front `w` wide, middle `x`: each one's middle x
 * and width. */
function doors(x, w, count) {
    const each = (w - GAP * (count + 1)) / count;
    return Array.from({ length: count }, (_, i) => ({
        x: x - w / 2 + GAP + each / 2 + i * (each + GAP),
        w: each,
    }));
}

/** A row of cupboard doors on a carcass front at z `front`, from `y0` to
 * `y1`, each with a raised panel and a knob near `knobAt` (0 bottom, 1
 * top), on the side of its neighbour. */
function doorFronts(THREE, x, w, y0, y1, front, knobAt) {
    const parts = [];
    const h = y1 - y0 - GAP * 2;
    const y = (y0 + y1) / 2;
    const row = doors(x, w, Math.max(1, Math.round(w / DOOR_W)));
    for (const [i, door] of row.entries()) {
        // Pairs open from the middle: the knob is on the side of the pair's other door.
        const side = i % 2 === 0 ? 1 : -1;
        const knobX =
            row.length === 1 ? door.x : door.x + side * (door.w / 2 - 9);
        parts.push(
            box(THREE, DOOR, [door.w, h, 3], [door.x, y, front + 1.5]),
            box(THREE, PANEL, [door.w - 16, h - 16, 2], [door.x, y, front + 4]),
            box(
                THREE,
                BRASS,
                [5, 5, 5],
                [knobX, y0 + GAP + h * knobAt, front + 6]
            )
        );
    }
    return parts;
}

/** The counter `unit` as one geometry in world space, with its colours in
 * its vertices. */
export function kitchenCounterGeometry(THREE, { x, w, h, d, upper }) {
    const bodyH = h - TOP - KICK;
    const bodyY = KICK + bodyH / 2;
    const parts = [
        box(
            THREE,
            KICK_COLOR,
            [w, KICK, d - RECESS],
            [x, KICK / 2, (d - RECESS) / 2]
        ),
        box(THREE, CABINET, [w, bodyH, d], [x, bodyY, d / 2]),
        box(
            THREE,
            WORKTOP,
            [w, TOP, d + OVERHANG],
            [x, h - TOP / 2, (d + OVERHANG) / 2]
        ),
        ...doorFronts(THREE, x, w, KICK, KICK + bodyH, d, 0.85),
    ];
    if (upper) {
        const top = upper.y + upper.h;
        parts.push(
            box(
                THREE,
                CABINET,
                [w, upper.h, upper.d],
                [x, upper.y + upper.h / 2, upper.d / 2]
            ),
            // A crown along its top.
            box(
                THREE,
                CABINET,
                [w + 6, 6, upper.d + 4],
                [x, top - 3, (upper.d + 4) / 2]
            ),
            ...doorFronts(THREE, x, w, upper.y, top - 6, upper.d, 0.12)
        );
    }
    return mergeParts(THREE, parts);
}
