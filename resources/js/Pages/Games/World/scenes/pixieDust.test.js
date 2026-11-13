import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WORLD_THEMES, worldTheme } from "../three/themes.js";
import { PIXIE_DUST, pixieDust } from "./pixieDust.js";

let spy;
beforeEach(() => {
    // jsdom has no 2D canvas for the sparkles and the burst.
    spy = vi
        .spyOn(HTMLCanvasElement.prototype, "getContext")
        .mockReturnValue(null);
});
afterEach(() => spy.mockRestore());

const radius = 80;
const high = 220;

const layers = (dust) => dust.group.children.filter((o) => o.isPoints);

function specks(dust) {
    return layers(dust).flatMap((points) => {
        const at = points.geometry.attributes.position;
        return Array.from({ length: at.count }, (_, i) => ({
            x: at.getX(i),
            y: at.getY(i),
            z: at.getZ(i),
        }));
    });
}

const colors = (dust) =>
    layers(dust).flatMap((p) => [...p.geometry.attributes.color.array]);

describe("pixie dust", () => {
    it("is sparkles and soft glows, bigger, over a burst of light", () => {
        const dust = pixieDust(THREE, { radius, high, colors: ["#ff0000"] });
        const [bokeh, sparkles] = layers(dust);

        expect(bokeh.geometry.attributes.position.count).toBe(
            PIXIE_DUST.bokeh.count
        );
        expect(sparkles.geometry.attributes.position.count).toBe(
            PIXIE_DUST.sparkles.count
        );
        expect(bokeh.material.size).toBeGreaterThan(sparkles.material.size);
        const burst = dust.group.getObjectByName("pixie-dust-burst");
        // Behind the can, its axis at z = -radius.
        expect(burst.position.z).toBeLessThan(-radius * 2);
        expect(burst.scale.x).toBeGreaterThan(radius * 2);
    });

    it("swirls round the can, from its foot to over its lid", () => {
        const dust = pixieDust(THREE, { radius, high, colors: ["#ff0000"] });
        for (const time of [0, 1.7, 6.2]) {
            dust.place(time);
            for (const { x, y, z } of specks(dust)) {
                const out = Math.hypot(x, z + radius) / radius;
                expect(out).toBeGreaterThan(PIXIE_DUST.reach[0] - 1e-6);
                expect(out).toBeLessThan(
                    PIXIE_DUST.reach[1] * (1 + PIXIE_DUST.fan) + 1e-6
                );
                expect(y).toBeGreaterThanOrEqual(0);
                expect(y).toBeLessThan(high * PIXIE_DUST.rise);
            }
        }
        const tops = specks(dust).map((s) => s.y);
        expect(Math.max(...tops)).toBeGreaterThan(high);
    });

    it("moves, twinkles and turns as time goes on", () => {
        const dust = pixieDust(THREE, { radius, high, colors: ["#ff0000"] });
        const burst = dust.group.getObjectByName("pixie-dust-burst");
        dust.place(0);
        const [at, glow, turned] = [
            specks(dust),
            colors(dust),
            burst.rotation.z,
        ];
        dust.place(0.4);

        expect(specks(dust)).not.toEqual(at);
        expect(colors(dust)).not.toEqual(glow);
        expect(burst.rotation.z).not.toBe(turned);
    });

    it("mixes all the look's colours through it", () => {
        const palette = ["#ff0000", "#00ff00", "#0000ff"];
        const dust = pixieDust(THREE, { radius, high, colors: palette });
        dust.place(1);
        // Which colour each speck is, by its one channel; each shows fully
        // in its colour, fading by how much of it shows.
        const seen = new Set();
        const c = colors(dust);
        for (let i = 0; i < c.length; i += 4) {
            const rgb = c.slice(i, i + 3);
            expect(rgb.filter((v) => v > 0)).toEqual([1]);
            seen.add(rgb.indexOf(1));
            expect(c[i + 3]).toBeGreaterThanOrEqual(0);
            expect(c[i + 3]).toBeLessThanOrEqual(1);
        }

        expect(seen.size).toBe(3);
    });

    it("is colourful every season", () => {
        for (const theme of ["", ...Object.keys(WORLD_THEMES)]) {
            const hues = worldTheme(theme).pixieDust;
            expect(new Set(hues).size, theme).toBeGreaterThanOrEqual(4);
        }
        expect(worldTheme("").pixieDust.length).toBeGreaterThanOrEqual(8);
    });
});
