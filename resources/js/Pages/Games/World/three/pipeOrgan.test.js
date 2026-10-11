import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { KEY_COUNT, ORGAN } from "../scenes/organLayout.js";
import { pipeOrgan } from "./pipeOrgan.js";

/** The organ's white keys and pipes' metal, as it builds them. */
function parts(organ) {
    const keys = [];
    const pipes = [];
    organ.group.traverse((node) => {
        if (node.isMesh && node.geometry.type === "BoxGeometry") {
            if (node.material.color.getHexString() === "efe4cc")
                keys.push(node);
        }
        if (node.isGroup && node !== organ.group) pipes.push(node);
    });
    return { keys, pipes };
}

const puffsShown = (organ) => {
    let n = 0;
    organ.group.traverse(
        (node) =>
            node.isMesh && node.material.transparent && node.visible && n++
    );
    return n;
};

describe("the pipe organ", () => {
    it("has a white key and a pipe for every note, under its case top", () => {
        const organ = pipeOrgan(THREE);
        const { keys, pipes } = parts(organ);
        expect(keys).toHaveLength(KEY_COUNT);
        expect(pipes).toHaveLength(KEY_COUNT);

        // Its woodwork: the case stands on the floor, against the wall.
        const box = new THREE.Box3().setFromObject(organ.group.children[0]);
        expect(box.min.y).toBeCloseTo(0, 0);
        expect(box.max.y).toBeLessThanOrEqual(ORGAN.height + 45);
        expect(box.min.z).toBeGreaterThanOrEqual(-1);
    });

    it("sends a pressed key down and back, and its pipe glows, shivers and puffs", () => {
        const organ = pipeOrgan(THREE);
        const { keys, pipes } = parts(organ);
        const rest = keys[9].position.y;
        expect(organ.tick(0.016)).toBe(false);

        organ.press(9);
        expect(organ.tick(0.05)).toBe(true);
        expect(keys[9].position.y).toBeLessThan(rest);
        expect(keys[8].position.y).toBe(rest);
        const metal = pipes[9].children[1].material;
        expect(metal.emissiveIntensity).toBeGreaterThan(0);
        expect(pipes[9].scale.x).not.toBe(1);
        expect(puffsShown(organ)).toBeGreaterThan(0);

        for (let i = 0; i < 100; i += 1) organ.tick(0.05);
        expect(keys[9].position.y).toBe(rest);
        expect(metal.emissiveIntensity).toBe(0);
        expect(puffsShown(organ)).toBe(0);
        expect(organ.tick(0.016)).toBe(false);
    });

    it("only glows under reduced motion", () => {
        const organ = pipeOrgan(THREE);
        const { pipes } = parts(organ);
        organ.tick(0.016, true);

        organ.press(20);
        organ.tick(0.05, true);
        expect(
            pipes[20].children[1].material.emissiveIntensity
        ).toBeGreaterThan(0);
        expect(pipes[20].scale.x).toBe(1);
        expect(puffsShown(organ)).toBe(0);
    });
});
