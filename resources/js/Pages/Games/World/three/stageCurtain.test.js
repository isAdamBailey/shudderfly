import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CURTAIN } from "../scenes/stageLayout.js";
import { stageCurtain } from "./stageCurtain.js";

const item = { w: 900, y: 30 };

/** How far across the stage the drapes reach, from their outer ends. */
function reach(built) {
    const box = new THREE.Box3();
    const [left] = built.group.children;
    box.setFromObject(left, true);
    return box.max.x - box.min.x;
}

describe("the stage curtain", () => {
    it("starts open, its drapes gathered back to the ends of the stage", () => {
        const built = stageCurtain(THREE, item, 450);
        expect(reach(built)).toBeCloseTo(CURTAIN.gathered, 0);
        expect(built.tick(0.016, false)).toBe(false);
    });

    it("draws shut across the stage over CURTAIN.draw s, and open again", () => {
        const built = stageCurtain(THREE, item, 450);
        built.setOpen(false);
        expect(built.tick(CURTAIN.draw / 2, false)).toBe(true);
        const half = reach(built);
        expect(half).toBeGreaterThan(CURTAIN.gathered);
        expect(half).toBeLessThan(item.w / 2);
        built.tick(CURTAIN.draw, false);
        expect(reach(built)).toBeCloseTo(item.w / 2, 0);
        const [left] = built.group.children;
        const box = left.geometry.boundingBox;
        expect(box.max.x - box.min.x).toBeCloseTo(item.w / 2, 0);
        expect(built.tick(0.016, false)).toBe(false);

        built.setOpen(true);
        built.tick(0.016, true);
        expect(reach(built)).toBeCloseTo(CURTAIN.gathered, 0);
    });
});
