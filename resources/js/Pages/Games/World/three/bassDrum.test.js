import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { BASS_DRUM } from "../scenes/drumLayout.js";
import { bassDrum } from "./bassDrum.js";

/** The ripples on its head, those showing. */
const ripplesShown = (drum) => {
    let n = 0;
    drum.group.traverse(
        (node) =>
            node.isMesh && node.material.transparent && node.visible && n++
    );
    return n;
};

/** What swings: the group the shell hangs in. */
const swingingOf = (drum) => drum.group.children.find((c) => c.isGroup);

describe("the bass drum", () => {
    it("stands on the floor, off its wall", () => {
        const drum = bassDrum(THREE);
        const box = new THREE.Box3().setFromObject(drum.group);
        expect(box.min.y).toBeCloseTo(0, 0);
        expect(box.min.z).toBeGreaterThanOrEqual(-1);
    });

    it("shows its pale head from the front, nothing over it", () => {
        const drum = bassDrum(THREE);
        drum.group.updateMatrixWorld(true);
        const ray = new THREE.Raycaster(
            new THREE.Vector3(0, BASS_DRUM.y, 1000),
            new THREE.Vector3(0, 0, -1)
        );
        const [first] = ray
            .intersectObject(drum.group, true)
            .filter((hit) => hit.object.visible);
        expect(first.object.material.color.getHexString()).toBe("e6d3a3");
    });

    it("swings and ripples when hit, then settles", () => {
        const drum = bassDrum(THREE);
        expect(drum.tick(0.016)).toBe(false);

        drum.hit(0);
        expect(drum.tick(0.1)).toBe(true);
        expect(swingingOf(drum).rotation.x).not.toBe(0);
        expect(ripplesShown(drum)).toBe(1);

        for (let i = 0; i < 100; i += 1) drum.tick(0.05);
        expect(swingingOf(drum).rotation.x).toBe(0);
        expect(ripplesShown(drum)).toBe(0);
        expect(drum.tick(0.016)).toBe(false);
    });

    it("swings less for a hit at the rim", () => {
        const middle = bassDrum(THREE);
        const rim = bassDrum(THREE);
        middle.hit(0);
        rim.hit(1);
        middle.tick(0.1);
        rim.tick(0.1);
        expect(Math.abs(swingingOf(rim).rotation.x)).toBeLessThan(
            Math.abs(swingingOf(middle).rotation.x)
        );
    });

    it("only ripples under reduced motion", () => {
        const drum = bassDrum(THREE);
        drum.hit(0);
        drum.tick(0.1, true);
        expect(swingingOf(drum).rotation.x).toBe(0);
        expect(ripplesShown(drum)).toBe(1);
    });
});
