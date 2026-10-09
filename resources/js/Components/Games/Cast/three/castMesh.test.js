import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { CAST, CAST_MOVES } from "@/constants/characters.js";
import { CAST_MOVE_DATA } from "../castMoveData.js";
import { BUTT_VIEW } from "../buttDraw.js";
import { createCastKit } from "./castMesh.js";

// jsdom has no 2D canvas; the kit only needs something to wrap in a texture.
const createCanvas = () => ({ width: 1, height: 1, getContext: () => null });
const kit = () => createCastKit(THREE, { createCanvas });

function glyphOf(puppet) {
    return puppet.group.getObjectByProperty("castShadow", true);
}

/** The body's pose, as its world matrix. */
function bodyPose(puppet) {
    puppet.group.updateMatrixWorld(true);
    return [...puppet.body.matrixWorld.elements];
}

describe("castMesh", () => {
    it("draws every cast member lit and casting a shadow", () => {
        const k = kit();
        for (const [id, member] of Object.entries(CAST)) {
            const puppet = k.castMesh(id);
            if (id === "butt") {
                const figure = puppet.group.getObjectByName("butt");
                const solid = [];
                figure.traverse((node) => {
                    if (node.isMesh) solid.push(node);
                });
                expect(solid.length).toBeGreaterThanOrEqual(5);
                expect(
                    solid.every(
                        (mesh) =>
                            mesh.material instanceof THREE.MeshStandardMaterial
                    )
                ).toBe(true);
                expect(
                    solid.some((mesh) => mesh.geometry.type === "SphereGeometry")
                ).toBe(true);
                expect(
                    solid.some(
                        (mesh) => mesh.geometry.type === "CylinderGeometry"
                    )
                ).toBe(true);
                expect(figure.rotation.y).toBeCloseTo(
                    (BUTT_VIEW.yaw * Math.PI) / 180
                );
                expect(figure.rotation.x).not.toBe(0);
                expect(puppet.domOverlay).toBe(false);
            } else if (member.emoji) {
                const glyph = glyphOf(puppet);
                expect(glyph.material).toBeInstanceOf(
                    THREE.MeshStandardMaterial
                );
                expect(glyph.material.alphaTest).toBeGreaterThan(0);
                expect(puppet.domOverlay).toBe(false);
            } else {
                // The Face is drawn by PersonFace in the DOM overlay.
                expect(glyphOf(puppet)).toBeUndefined();
                expect(puppet.domOverlay).toBe(true);
            }
        }
    });

    it("stands the butt on its feet at the size it was given", () => {
        const puppet = kit().castMesh("butt", { size: 80 });
        puppet.group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(
            puppet.group.getObjectByName("butt")
        );
        expect(box.min.y).toBeCloseTo(0, 0);
        expect(box.max.y).toBeGreaterThan(60);
    });

    it("shares one material per glyph", () => {
        const k = kit();
        expect(glyphOf(k.castMesh("butt")).material).toBe(
            glyphOf(k.castMesh("butt")).material
        );
        expect(glyphOf(k.emojiMesh("🏥")).material).not.toBe(
            glyphOf(k.castMesh("butt")).material
        );
    });

    it("refuses a character that isn't in the cast", () => {
        expect(() => kit().castMesh("teddy")).toThrow(/teddy/);
    });

    it("can do every CAST_MOVE, from the shared move data", () => {
        const k = kit();
        for (const move of CAST_MOVES) {
            const id = Object.keys(CAST).find((c) =>
                CAST[c].moves.includes(move)
            );
            expect(id, `nobody does ${move}`).toBeDefined();

            const puppet = k.castMesh(id);
            const still = bodyPose(puppet);
            const data = CAST_MOVE_DATA[move];
            if (data.loop) puppet.setMove(move);
            else puppet.play(move);

            const poses = [0.1, 0.25, 0.2].map((share) => {
                puppet.tick(data.duration * share);
                return bodyPose(puppet);
            });
            expect(
                poses.some((pose) => pose.join() !== still.join()),
                `${id} ${move}`
            ).toBe(true);
        }
    });

    it("returns to the ongoing move after a one-shot", () => {
        const puppet = kit().castMesh("butt");
        const still = bodyPose(puppet);

        puppet.play("toot");
        puppet.tick(0.1);
        expect(bodyPose(puppet)).not.toEqual(still);

        puppet.tick(1);
        puppet.tick(0);
        expect(bodyPose(puppet)).toEqual(still);
    });

    it("ignores a move the character doesn't have", () => {
        const puppet = kit().castMesh("toilet");
        const still = bodyPose(puppet);

        puppet.setMove("hop");
        puppet.play("toot");
        puppet.tick(0.2);

        expect(bodyPose(puppet)).toEqual(still);
    });

    it("lifts the body and shrinks its contact shadow, which stays down", () => {
        const puppet = kit().castMesh("apple", { size: 50 });
        const blob = puppet.group.children[0];
        const groundWidth = blob.scale.x;

        puppet.set({ lift: 120 });
        puppet.tick(0);

        expect(blob.position.y).toBeLessThan(1);
        expect(blob.scale.x).toBeCloseTo(groundWidth / 2);
        expect(
            new THREE.Vector3().setFromMatrixPosition(
                (puppet.group.updateMatrixWorld(true),
                glyphOf(puppet).matrixWorld)
            ).y
        ).toBeGreaterThan(120);
    });

    it("mirrors when facing left", () => {
        const puppet = kit().castMesh("butt");
        puppet.set({ facing: "left" });
        puppet.tick(0);
        expect(puppet.group.getObjectByName("butt").scale.x).toBeLessThan(0);
    });

    it("squashes on landing from a throw, but not from a walking bob", () => {
        const puppet = kit().castMesh("apple");
        const squash = puppet.body.parent.parent;

        puppet.set({ lift: 6 });
        puppet.set({ lift: 0 });
        puppet.tick(0.05);
        expect(squash.scale.y).toBe(1);

        puppet.set({ lift: 80 });
        puppet.set({ lift: 0 });
        puppet.tick(0.07);
        expect(squash.scale.y).toBeLessThan(1);
    });

    it("holds a still pose under reduced motion, and stops redrawing", () => {
        const puppet = kit().castMesh("apple");
        puppet.setReducedMotion(true);
        puppet.setMove("excited");
        puppet.play("toot");

        expect(puppet.tick(0.1)).toBe(true);
        expect(puppet.body.scale.x).toBeCloseTo(1.15);
        expect(puppet.tick(0.1)).toBe(false);
    });

    it("reports nothing to draw when nothing moved", () => {
        const puppet = kit().castMesh("butt");
        puppet.setMove(null);
        puppet.tick(0);
        expect(puppet.tick(0.1)).toBe(false);

        puppet.set({ lift: 3 });
        expect(puppet.tick(0.1)).toBe(true);
    });

    it("paints a prop from its own texture", () => {
        const k = kit();
        const texture = new THREE.Texture();
        const puppet = k.paintedMesh(texture, { size: 72, metalness: 0.5 });
        let mesh = null;
        puppet.group.traverse((node) => {
            if (node.material?.map === texture) mesh = node;
        });

        expect(mesh.material.metalness).toBe(0.5);
        expect(mesh.material.alphaTest).toBeGreaterThan(0);
        const spy = vi.spyOn(texture, "dispose");
        k.dispose();
        expect(spy).toHaveBeenCalled();
    });

    it("frees its materials and textures on dispose", () => {
        const k = kit();
        const material = glyphOf(k.castMesh("poop")).material;
        const spy = vi.spyOn(material, "dispose");
        const textureSpy = vi.spyOn(material.map, "dispose");

        k.dispose();

        expect(spy).toHaveBeenCalled();
        expect(textureSpy).toHaveBeenCalled();
    });

    it("sounds a character's moves, even under reduced motion", () => {
        const onSound = vi.fn();
        const k = createCastKit(THREE, { createCanvas, onSound });
        const roach = k.castMesh("cockroach");

        roach.play("hiss");
        roach.setReducedMotion(true);
        roach.play("hiss");
        // A move the cockroach doesn't have isn't played, so isn't heard,
        // and a move with no sound is silent.
        roach.play("flush");
        k.castMesh("toilet").play("flush");

        expect(onSound.mock.calls).toEqual([["hiss"], ["hiss"]]);
    });
});
