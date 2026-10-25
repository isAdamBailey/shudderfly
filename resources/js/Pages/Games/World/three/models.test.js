import { readFileSync } from "node:fs";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FOOTPRINTS } from "./footprints.js";
import { MODELS } from "./models.js";

let spy;
beforeEach(() => {
    spy = vi
        .spyOn(HTMLCanvasElement.prototype, "getContext")
        .mockReturnValue(null);
});
afterEach(() => spy.mockRestore());

describe("modelled props", () => {
    it("are the ones GamesWorld::MODELS names", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Support/GamesWorld.php`,
            "utf8"
        );
        const names = php
            .match(/const MODELS = \[([^\]]*)\]/)[1]
            .match(/'([^']+)'/g)
            .map((name) => name.slice(1, -1));
        expect(Object.keys(MODELS).sort()).toEqual(names.sort());
    });

    it("gives GamesWorld::MODEL_FOOTPRINTS each footprint's width and depth", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Support/GamesWorld.php`,
            "utf8"
        );
        const footprints = Object.fromEntries(
            [
                ...php
                    .match(/const MODEL_FOOTPRINTS = \[(.*?)\];/s)[1]
                    .matchAll(
                        /'([^']+)' => \['w' => ([\d.]+), 'd' => ([\d.]+)\]/g
                    ),
            ].map(([, name, w, d]) => [name, { w: Number(w), d: Number(d) }])
        );
        expect(footprints).toEqual(
            Object.fromEntries(
                Object.entries(FOOTPRINTS).map(([name, { w, d }]) => [
                    name,
                    { w, d },
                ])
            )
        );
    });

    it.each(Object.keys(MODELS))(
        "builds %s one unit tall, standing on the floor",
        (name) => {
            const box = new THREE.Box3().setFromObject(MODELS[name](THREE));
            expect(box.min.y).toBeCloseTo(0, 2);
            expect(box.max.y).toBeGreaterThan(0.9);
            expect(box.max.y).toBeLessThan(1.05);
        }
    );

    it.each(Object.keys(FOOTPRINTS))(
        "builds %s to its footprint, so its hit box and what lands on it match it",
        (name) => {
            const f = FOOTPRINTS[name];
            const box = new THREE.Box3().setFromObject(MODELS[name](THREE));
            expect(box.max.x - box.min.x).toBeCloseTo(f.w, 2);
            expect(box.min.z).toBeCloseTo(0, 2);
            // Handles and knobs may stand proud of its body.
            expect(box.max.z).toBeGreaterThanOrEqual(f.d);
            expect(box.max.z).toBeLessThan(f.d + 0.1);
            expect(f.top).toBeLessThanOrEqual(box.max.y + 0.001);
        }
    );

    it("hangs the table lamp's light in its shade, and can light it", () => {
        const lamp = MODELS["table-lamp"](THREE);
        expect(typeof lamp.userData.setOn).toBe("function");
        expect(lamp.userData.bulb).toBeGreaterThan(0);
        expect(lamp.userData.bulb).toBeLessThan(1);
    });

    it("shines the spotlight from its lens, and can light it", () => {
        const spot = MODELS.spotlight(THREE);
        expect(typeof spot.userData.setOn).toBe("function");
        expect(spot.userData.bulb).toBeGreaterThan(0);
        expect(spot.userData.bulb).toBeLessThan(0.5);
        // Tipped back toward the stage, so the beam starts at the lens.
        expect(spot.userData.lens).toBeLessThan(0);
        spot.updateMatrixWorld(true);
        const glass = spot
            .getObjectsByProperty("isMesh", true)
            .find((mesh) => mesh.geometry.type === "CircleGeometry");
        const at = new THREE.Vector3();
        glass.getWorldPosition(at);
        expect(at.y).toBeCloseTo(spot.userData.bulb, 3);
        expect(at.z).toBeCloseTo(spot.userData.lens, 3);
    });

    it("swings the grandfather clock's pendulum to an end on each beat, still under reduced motion", () => {
        const clock = MODELS["grandfather-clock"](THREE);
        const pendulum = () =>
            clock.children.find((child) => child.isGroup).rotation.z;
        const { swing, beat: BEAT } = clock.userData;
        expect(BEAT).toBeGreaterThan(0);

        expect(swing(0, false)).toBe(true);
        const end = pendulum();
        expect(end).toBeGreaterThan(0);
        expect(swing(BEAT, false)).toBe(true);
        expect(pendulum()).toBeCloseTo(-end);
        expect(swing(BEAT / 2, false)).toBe(true);
        expect(pendulum()).toBeCloseTo(0);

        swing(0, false);
        expect(swing(BEAT / 3, true)).toBe(true);
        expect(pendulum()).toBe(0);
        expect(swing(BEAT, true)).toBe(false);
    });

    it("dongs the grandfather clock every ten seconds, on a tick, and plays its tune every fourth", () => {
        const { beat, chime, tune } =
            MODELS["grandfather-clock"](THREE).userData;

        expect(chime).toBe(10);
        expect(chime % beat).toBe(0);
        expect(tune).toBe(4);
    });
});
