import { describe, expect, it } from "vitest";
import { sampleButtPose } from "./buttRig.js";
import { CAST_MOVE_DATA } from "./castMoveData.js";
import {
    BUTT_VIEW,
    BUTT_FRAME,
    buttDrop,
    buttParts,
    buttShapes,
} from "./buttDraw.js";

describe("butt drawing", () => {
    it("is two cheeks, two legs and two feet", () => {
        const parts = buttParts();
        expect(parts.cheeks).toHaveLength(2);
        expect(parts.legs).toHaveLength(2);
        expect(parts.feet).toHaveLength(2);
        parts.feet.forEach((foot, index) => {
            expect(foot.sx * 2).toBeGreaterThan(parts.legs[index].width);
            expect(foot.sy).toBeLessThan(foot.sx);
            expect(foot.y - foot.sy).toBeCloseTo(0);
        });
        const drawn = buttShapes().filter((shape) => shape.type === "foot");
        expect(drawn).toHaveLength(2);
        drawn.forEach((foot) => expect(foot.rx).toBeGreaterThan(foot.ry));
        expect(parts.cleft.width).toBeGreaterThan(0);
    });

    it("shows a three-quarter view, one cheek nearer and larger", () => {
        expect(Math.abs(BUTT_VIEW.yaw)).toBeGreaterThan(30);
        expect(Math.abs(BUTT_VIEW.pitch)).toBeGreaterThan(0);

        const cheeks = buttShapes().filter((shape) => shape.type === "cheek");
        const [near, far] = [...cheeks].sort((a, b) => b.z - a.z);
        expect(near.z).toBeGreaterThan(far.z);
        expect(near.rx).toBeGreaterThan(far.rx * 1.08);
        expect(near.x).not.toBeCloseTo(far.x);
    });

    it("stands the projected figure on the ground", () => {
        const shapes = buttShapes();
        const lowest = Math.min(
            ...shapes.map((shape) =>
                shape.ry
                    ? shape.y - shape.ry
                    : shape.r
                    ? shape.y - shape.r
                    : Math.min(shape.y1, shape.y2) - shape.width / 2
            )
        );
        expect(lowest).toBeCloseTo(0, 1);
        expect(BUTT_FRAME.minY).toBeCloseTo(0, 1);
        expect(buttDrop()).not.toBe(0);
    });

    it("follows the rig, so a walk and a toot change the figure", () => {
        const idle = buttParts();
        const stride = sampleButtPose("walk", CAST_MOVE_DATA.walk.duration / 4);
        const walked = buttParts(stride);
        expect(walked.legs[0].x2).not.toBeCloseTo(idle.legs[0].x2);
        expect(walked.feet[0].x).not.toBeCloseTo(idle.feet[0].x);
        expect(walked.feet[0].y - walked.feet[0].sy).toBeGreaterThan(0);

        const toot = buttParts(
            sampleButtPose("toot", CAST_MOVE_DATA.toot.duration * 0.3)
        );
        expect(toot.cheeks[0].rx).toBeGreaterThan(idle.cheeks[0].rx);
        expect(toot.cheeks[0].ry).toBeLessThan(idle.cheeks[0].ry);

        const drawn = buttShapes(stride);
        const standing = buttShapes();
        const leg = (shapes) => shapes.find((shape) => shape.type === "leg");
        expect(leg(drawn).x2).not.toBeCloseTo(leg(standing).x2);
    });

    it("draws the far side first", () => {
        const shapes = buttShapes();
        const order = shapes.map((shape) => shape.z);
        const sorted = [...order].sort((a, b) => a - b);
        expect(order).toEqual(sorted);
        expect(shapes.at(-1).type).toBe("cleft");
    });
});
