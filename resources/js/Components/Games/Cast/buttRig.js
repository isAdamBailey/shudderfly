/*
 * The Butt as a rig (issue #143): a body and two legs. No Three.js and no Vue.
 *
 * Space: origin on the ground between the feet, x to the right, y up.
 * Lengths are fractions of the character's height. The feet rest at 0 and
 * the top of the cheeks at 1. Angles are degrees. A leg's rot is at its
 * hip: 0 hangs straight down, positive swings toward +x.
 *
 * Hips are offsets from the body origin (midway between the cheeks), so
 * the legs follow the body. A pose is
 * { body: { x, y, rot }, leftLeg: { rot }, rightLeg: { rot } }.
 */

import { CAST_MOVE_DATA } from "./castMoveData.js";

export const BUTT_RIG = {
    body: {
        cheekRadius: 0.36,
        cheeks: [
            { x: -0.16, y: 0.06 },
            { x: 0.16, y: 0.06 },
        ],
    },
    leg: { length: 0.36, width: 0.1 },
    hips: {
        left: { x: -0.16, y: -0.22 },
        right: { x: 0.16, y: -0.22 },
    },
};

// How far a walk swings each leg. The cycle is CAST_MOVE_DATA.walk, so a
// later drawer can sample this on the same clock as the move.
export const BUTT_WALK_SWING = 28;

const REST_Y = -BUTT_RIG.hips.left.y + BUTT_RIG.leg.length;

export const BUTT_REST = { x: 0, y: REST_Y, rot: 0 };

function restPose() {
    return {
        body: { ...BUTT_REST },
        leftLeg: { rot: 0 },
        rightLeg: { rot: 0 },
    };
}

/** Pose `seconds` into `move`. Only `walk` cycles; `still` holds the rest pose. */
export function sampleButtPose(move, seconds = 0, { still = false } = {}) {
    if (still || move !== "walk") return restPose();

    const raw = seconds / CAST_MOVE_DATA.walk.duration;
    const p = ((raw % 1) + 1) % 1;
    const swing = Math.sin(p * Math.PI * 2) * BUTT_WALK_SWING;

    return {
        body: { ...BUTT_REST },
        leftLeg: { rot: swing },
        rightLeg: { rot: -swing },
    };
}
