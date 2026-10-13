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
});
