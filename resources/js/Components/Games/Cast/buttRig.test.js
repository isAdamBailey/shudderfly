import { describe, expect, it } from "vitest";
import { CAST } from "@/constants/characters.js";
import { CAST_MOVE_DATA } from "./castMoveData.js";
import {
    BUTT_REST,
    BUTT_RIG,
    BUTT_WALK_SWING,
    sampleButtPose,
} from "./buttRig.js";

const footY = (hip) => BUTT_REST.y + hip.y - BUTT_RIG.leg.length;

describe("the butt rig", () => {
    it("is a body of two cheeks standing on two legs", () => {
        expect(BUTT_RIG.body.cheeks).toHaveLength(2);
        expect(BUTT_RIG.body.cheekRadius).toBeGreaterThan(0);
        expect(BUTT_RIG.leg.length).toBeGreaterThan(0);
        expect(BUTT_RIG.leg.width).toBeGreaterThan(0);
        expect(BUTT_RIG.leg.width).toBeLessThan(BUTT_RIG.body.cheekRadius);

        const [leftCheek, rightCheek] = BUTT_RIG.body.cheeks;
        const apart = Math.hypot(
            rightCheek.x - leftCheek.x,
            rightCheek.y - leftCheek.y
        );
        expect(apart).toBeGreaterThan(0);
        expect(apart).toBeLessThan(BUTT_RIG.body.cheekRadius * 2);

        expect(footY(BUTT_RIG.hips.left)).toBeCloseTo(0);
        expect(footY(BUTT_RIG.hips.right)).toBeCloseTo(0);
        expect(BUTT_RIG.hips.left.x).toBe(-BUTT_RIG.hips.right.x);
        expect(BUTT_RIG.hips.left.y).toBe(BUTT_RIG.hips.right.y);

        const top = Math.max(
            ...BUTT_RIG.body.cheeks.map(
                (cheek) => BUTT_REST.y + cheek.y + BUTT_RIG.body.cheekRadius
            )
        );
        expect(top).toBeCloseTo(1);
    });

    it("holds idle still, at any time", () => {
        const atRest = sampleButtPose("idle", 0);
        expect(atRest.leftLeg.rot).toBe(0);
        expect(atRest.rightLeg.rot).toBe(0);
        expect(atRest.body).toEqual(BUTT_REST);
        expect(sampleButtPose("idle", 10)).toEqual(atRest);
        expect(sampleButtPose("idle", -3)).toEqual(atRest);
    });

    it("walks by swinging the legs in opposition", () => {
        const walk = CAST_MOVE_DATA.walk;
        const planted = sampleButtPose("walk", 0);
        expect(planted.leftLeg.rot).toBeCloseTo(0);
        expect(planted.rightLeg.rot).toBeCloseTo(0);

        const stride = sampleButtPose("walk", walk.duration / 4);
        expect(stride.leftLeg.rot).toBeCloseTo(BUTT_WALK_SWING);
        expect(stride.rightLeg.rot).toBeCloseTo(-BUTT_WALK_SWING);
        expect(stride.body).toEqual(BUTT_REST);

        const back = sampleButtPose("walk", (walk.duration * 3) / 4);
        expect(back.leftLeg.rot).toBeCloseTo(-stride.leftLeg.rot);
        expect(back.rightLeg.rot).toBeCloseTo(-stride.rightLeg.rot);

        expect(sampleButtPose("walk", walk.duration)).toEqual(planted);
        expect(
            sampleButtPose("walk", -walk.duration / 4).leftLeg.rot
        ).toBeCloseTo(-BUTT_WALK_SWING);
    });

    it("holds the other butt moves at the idle pose", () => {
        const idle = sampleButtPose("idle", 0.3);
        for (const move of CAST.butt.moves.filter((name) => name !== "walk")) {
            expect(sampleButtPose(move, 0.3), move).toEqual(idle);
        }
    });

    it("stays in the rest pose under reduced motion", () => {
        const walk = CAST_MOVE_DATA.walk;
        expect(
            sampleButtPose("walk", walk.duration / 4, { still: true })
        ).toEqual(sampleButtPose("idle", 0));
    });
});
