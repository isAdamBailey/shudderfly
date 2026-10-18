import { itemPoint } from "./roomLayout.js";

/**
 * The Cockroach's harp, as pure numbers: its frame, where its strings run
 * and which strings a strum crosses. three/harp.js draws it from these;
 * Room3D.vue lays a button over its strings from them.
 *
 * The harp is built facing +z with its back toward z = 0 and its middle on
 * x = 0, standing on y = 0, and posed like any interactable (roomLayout.js
 * itemPose()). Its column is at the left, its soundboard slants up from
 * its foot to the right, and its neck curves over from the column's top:
 * each string runs straight up from the soundboard to the neck, the
 * longest (deepest) at the left.
 */

export const HARP = {
    // How far it reaches out of the wall, and its plane, where the strings
    // run and its frame is centred.
    depth: 34,
    z: 17,
    // The column, up the left side to the neck.
    column: { x: -104, radius: 8, top: 318 },
    // The soundboard, a slant from its foot to its top end, and how thick.
    board: { from: [-86, 28], to: [104, 196], thick: 22 },
    // The neck: from the column's top, falling `fall` across to its end at
    // `to`, with an S-shaped `curl`; how thick it is.
    neck: { from: -104, to: 114, y: 312, fall: 74, curl: 18, thick: 16 },
    // The strings: how many, and from where to where across x.
    strings: { count: 12, from: -70, to: 90 },
};

/** How far apart the strings are (local x). */
export const STRING_GAP =
    (HARP.strings.to - HARP.strings.from) / (HARP.strings.count - 1);

/** String `n`'s place across the harp (local x), 0 the deepest. */
export function stringX(n) {
    return HARP.strings.from + n * STRING_GAP;
}

/** The soundboard's middle at local `x`. */
export function boardY(x) {
    const [[x0, y0], [x1, y1]] = [HARP.board.from, HARP.board.to];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

/** The neck's middle at local `x`. */
export function neckY(x) {
    const { from, to, y, fall, curl } = HARP.neck;
    const t = (x - from) / (to - from);
    return y - fall * t + curl * Math.sin(2 * Math.PI * t);
}

/** Where string `n` runs, { bottom, top } (local y): off the soundboard's
 * face, to the neck's underside. */
export function stringEnds(n) {
    const x = stringX(n);
    return {
        bottom: boardY(x) + HARP.board.thick / 2,
        top: neckY(x) - HARP.neck.thick / 2,
    };
}

/** The corners of the harp's strings in the room, half a gap out at each
 * end so the outer strings can be caught: what its button covers once
 * projected. */
export function stringCorners(item) {
    const last = HARP.strings.count - 1;
    const pad = STRING_GAP / 2;
    return [
        [stringX(0) - pad, stringEnds(0).bottom],
        [stringX(0) - pad, stringEnds(0).top],
        [stringX(last) + pad, stringEnds(last).bottom],
        [stringX(last) + pad, stringEnds(last).top],
    ].map(([x, y]) => itemPoint(item, [x, y, HARP.z]));
}

/** Which gap between the strings screen x `px` is in, given each string's
 * screen x in order (`xs`): 0 before the first, `xs.length` past the
 * last. A seen-from-behind harp's strings run the other way; this counts
 * either way along. */
export function gapAt(xs, px) {
    const rising = xs[xs.length - 1] >= xs[0];
    let gap = 0;
    for (const x of xs) if (rising ? x < px : x > px) gap += 1;
    return gap;
}

/** The strings a strum crosses moving from gap `from` to gap `to`, in the
 * order it crosses them. */
export function crossed(from, to) {
    const strings = [];
    for (let n = from; n < to; n += 1) strings.push(n);
    for (let n = from - 1; n >= to; n -= 1) strings.push(n);
    return strings;
}

/** The string nearest screen x `px`, given each string's screen x. */
export function nearestString(xs, px) {
    let best = 0;
    for (let n = 1; n < xs.length; n += 1) {
        if (Math.abs(xs[n] - px) < Math.abs(xs[best] - px)) best = n;
    }
    return best;
}
