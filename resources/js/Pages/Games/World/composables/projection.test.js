import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { applyCamera } from "../three/useWorldRenderer.js";
import {
    groundZAtRow,
    screenToGround,
    spanAt,
    worldToScreen,
} from "./projection.js";

const camera = {
    x: 900,
    y: 546,
    z: 1540,
    focal: 1540,
    eyeRow: 0,
    w: 1000,
    h: 700,
};

const POINTS = [
    { x: 900, y: 0, z: 0 },
    { x: 400, y: 120, z: -300 },
    { x: 1400, y: 40, z: 200 },
    { x: -250, y: 300, z: -4000 },
];

describe("projection", () => {
    it("draws the Butt's plane at 1px per world unit", () => {
        const p = worldToScreen(camera, { x: 950, y: 0, z: 0 });
        expect(p.scale).toBe(1);
        expect(p.x).toBe(550);
        expect(p.y).toBe(546);
    });

    it("round-trips the ground", () => {
        for (const sx of [0, 250, 999]) {
            for (const sy of [430, 546, 699]) {
                const ground = screenToGround(camera, sx, sy);
                const back = worldToScreen(camera, { ...ground, y: 0 });
                expect(back.x).toBeCloseTo(sx, 6);
                expect(back.y).toBeCloseTo(sy, 6);
            }
        }
    });

    it("misses the ground at or above the horizon", () => {
        expect(screenToGround(camera, 500, 0)).toBeNull();
        expect(screenToGround(camera, 500, -20)).toBeNull();
    });

    it("finds the depth the ground is drawn at for a row", () => {
        const z = groundZAtRow(camera, 600);
        expect(worldToScreen(camera, { x: 0, y: 0, z }).y).toBeCloseTo(600, 6);
    });

    it("keeps the Butt's plane still under a lens shift that follows the camera", () => {
        const shifted = { ...camera, x: camera.x + 12, lensX: 12 };
        const near = worldToScreen(shifted, { x: 700, z: 0 });
        const far = worldToScreen(shifted, { x: 700, z: -3 * camera.focal });

        expect(near.x).toBeCloseTo(worldToScreen(camera, { x: 700 }).x, 6);
        expect(far.x).toBeGreaterThan(
            worldToScreen(camera, { x: 700, z: -3 * camera.focal }).x
        );
    });

    it("agrees with the Three.js camera the renderer sets up", () => {
        for (const cam of [
            camera,
            { ...camera, eyeRow: 420, lensX: -30 },
            { ...camera, eyeRow: -20, lensX: 15 },
        ]) {
            const three = new PerspectiveCamera(50, 1, 1, 100000);
            applyCamera(three, cam);
            three.updateMatrixWorld();

            for (const point of POINTS) {
                const ndc = new Vector3(point.x, point.y, point.z).project(
                    three
                );
                const ours = worldToScreen(cam, point);
                expect(((ndc.x + 1) / 2) * cam.w).toBeCloseTo(ours.x, 4);
                expect(((1 - ndc.y) / 2) * cam.h).toBeCloseTo(ours.y, 4);
            }
        }
    });
});

describe("spanAt", () => {
    it("reaches the stage's edges at that depth, lens shift and all", () => {
        for (const cam of [camera, { ...camera, lensX: 120 }]) {
            for (const z of [0, -300, 400]) {
                const { x0, x1 } = spanAt(cam, z);
                expect(worldToScreen(cam, { x: x0, z }).x).toBeCloseTo(0);
                expect(worldToScreen(cam, { x: x1, z }).x).toBeCloseTo(cam.w);
            }
        }
    });
});
