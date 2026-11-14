import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { seeThrough } from "./seeThrough.js";

describe("seeThrough", () => {
    it("fades its meshes with their own copies, then gives the shared ones back", () => {
        const shared = new THREE.MeshStandardMaterial();
        const meshes = [
            new THREE.Mesh(undefined, shared),
            new THREE.Mesh(undefined, shared),
        ];
        const other = new THREE.Mesh(undefined, shared);
        const see = seeThrough(meshes);

        expect(see.set(1)).toBe(false);
        expect(see.set(0.5)).toBe(true);
        for (const mesh of meshes) {
            expect(mesh.material).not.toBe(shared);
            expect(mesh.material.transparent).toBe(true);
            expect(mesh.material.opacity).toBe(0.5);
        }
        expect(other.material.opacity).toBe(1);
        expect(see.set(0.5)).toBe(false);

        const copy = meshes[0].material;
        const freed = vi.spyOn(copy, "dispose");
        expect(see.set(1)).toBe(true);
        expect(meshes.map((mesh) => mesh.material)).toEqual([shared, shared]);
        expect(freed).toHaveBeenCalled();
        expect(shared.transparent).toBe(false);
        // Past solid is solid: nothing to give back.
        expect(see.set(1.2)).toBe(false);
    });
});
