import { jitter } from "@/utils/math";

/**
 * What stands along the WebGL road besides the landmarks, and where (issue
 * #130), as pure data: RoadScene.js builds it, roadLayout.js says how deep
 * each row is and how big things are. Placement is by road x only, and the
 * same every visit (no Math.random), so the street doesn't reshuffle.
 *
 * Rows, back to front:
 * - mid: trees and little houses between the ridge and the far side.
 * - near: the near side's tall things, between the landmarks: a house, a
 *   porta-potty, a Toot Foods billboard. RoadScene fades these when the Butt
 *   is behind them.
 * - hedge: bushes and fence along the front, low enough not to hide it.
 * - manholes: in the road every few landmarks, the cockroach peeking out of
 *   each (their x's).
 */

const NEAR_KINDS = ["house", "potty", "billboard"];
// Along the road, in road px.
const NEAR_CLEARANCE = 380; // from a near-side landmark's building
const HEDGE_STEP = 150;
const HEDGE_GAP = 70; // either side of a near tall thing
const MID_STEP = 120;
const MID_HOUSE_EVERY = 5;
const MANHOLE_EVERY = 3; // gaps between landmarks
const MANHOLE_OFFSET = -170; // from the gap's middle

/** Midpoints between consecutive x's, plus one gap's width past either
 * end. */
function gaps(xs) {
    if (xs.length === 0) return [];
    const sorted = [...xs].sort((a, b) => a - b);
    const step = sorted.length > 1 ? sorted[1] - sorted[0] : 900;
    const inner = sorted.slice(1).map((x, i) => (x + sorted[i]) / 2);
    return [
        sorted[0] - step / 2,
        ...inner,
        sorted[sorted.length - 1] + step / 2,
    ];
}

/**
 * The street's scenery around `landmarks` ({ x, side }) between road x
 * `from` and `to`. Sizes in the result are shares of the matching
 * roadLayout size (`scale`). The landmarks' own buildings are RoadScene's.
 */
export function roadScenery({ landmarks, from, to }) {
    const nearLandmarks = landmarks.filter((lm) => lm.side === "near");

    // The near side's tall things sit between the far side's landmarks, so
    // the two sides alternate, and keep clear of near-side landmarks.
    const between = gaps(
        landmarks.filter((lm) => lm.side === "far").map((lm) => lm.x)
    );
    const near = between
        .filter((x) =>
            nearLandmarks.every((lm) => Math.abs(lm.x - x) > NEAR_CLEARANCE)
        )
        .map((x, i) => ({
            kind: NEAR_KINDS[i % NEAR_KINDS.length],
            x,
            scale: 0.85 + jitter(x) * 0.3,
            palette: i + landmarks.length,
            // Which Toot Food a billboard advertises.
            pick: i,
        }));

    const blocked = [
        ...near.map((item) => item.x),
        ...nearLandmarks.map((lm) => lm.x),
    ];
    const hedge = [];
    for (let x = from; x <= to; x += HEDGE_STEP) {
        if (blocked.some((b) => Math.abs(b - x) < HEDGE_STEP / 2 + HEDGE_GAP)) {
            continue;
        }
        hedge.push({
            kind: jitter(x) < 0.55 ? "bush" : "fence",
            x,
            scale: 0.8 + jitter(x + 1) * 0.4,
        });
    }

    const mid = [];
    for (let i = 0, x = from; x <= to; i += 1) {
        mid.push({
            kind: i % MID_HOUSE_EVERY === 2 ? "house" : "tree",
            x,
            scale: 0.75 + jitter(x) * 0.5,
            palette: i,
        });
        x += MID_STEP * (0.7 + jitter(x + 2) * 0.6);
    }

    const manholes = between
        .filter((_, i) => i % MANHOLE_EVERY === 1)
        .map((x) => x + MANHOLE_OFFSET);

    return { near, hedge, mid, manholes };
}
