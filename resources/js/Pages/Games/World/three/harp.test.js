import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { HARP } from "../scenes/harpLayout.js";
import { harp } from "./harp.js";

/** The harp's strings, as it builds them. */
const stringsOf = (built) => built.group.children.slice(1);

describe("the harp", () => {
    it("has a string for every note, standing on the floor", () => {
        const built = harp(THREE);
        expect(stringsOf(built)).toHaveLength(HARP.strings.count);

        const box = new THREE.Box3().setFromObject(built.group.children[0]);
        expect(box.min.y).toBeCloseTo(0, 0);
        expect(box.min.z).toBeGreaterThanOrEqual(-1);
    });

    it("rings a plucked string: it glows and blurs, then settles", () => {
        const built = harp(THREE);
        const strings = stringsOf(built);
        const rest = strings[4].scale.x;
        expect(built.tick(0.016)).toBe(false);

        built.pluck(4);
        expect(built.tick(0.01)).toBe(true);
        expect(strings[4].material.emissiveIntensity).toBeGreaterThan(0);
        expect(strings[4].scale.x).toBeGreaterThan(rest);
        expect(strings[3].material.emissiveIntensity).toBe(0);

        for (let i = 0; i < 100; i += 1) built.tick(0.05);
        expect(strings[4].material.emissiveIntensity).toBe(0);
        expect(strings[4].scale.x).toBe(rest);
        expect(built.tick(0.016)).toBe(false);
    });

    it("waits out a pluck's delay", () => {
        const built = harp(THREE);
        const string = stringsOf(built)[7];
        built.pluck(7, 0.5);
        built.tick(0.1);
        expect(string.material.emissiveIntensity).toBe(0);
        built.tick(0.5);
        expect(string.material.emissiveIntensity).toBeGreaterThan(0);
    });

    it("only glows under reduced motion", () => {
        const built = harp(THREE);
        const string = stringsOf(built)[2];
        const rest = string.scale.x;
        built.pluck(2);
        built.tick(0.01, true);
        expect(string.material.emissiveIntensity).toBeGreaterThan(0);
        expect(string.scale.x).toBe(rest);
    });
});
