import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import GusterGlyph from "./GusterGlyph.vue";
import { GUSTER_SVG } from "./gusterDraw.js";

describe("GusterGlyph", () => {
    it("draws every shape, one em tall, decorative", () => {
        const svg = mount(GusterGlyph).get("svg");
        expect(svg.findAll("ellipse")).toHaveLength(GUSTER_SVG.ellipses.length);
        expect(svg.classes()).toContain("guster-inline");
        expect(svg.attributes("aria-hidden")).toBe("true");
        expect(svg.attributes("style")).toContain("em");
    });

    it("gives each copy its own gloss", () => {
        const id = (wrapper) => wrapper.get("radialGradient").attributes("id");
        const a = mount(GusterGlyph);
        const b = mount(GusterGlyph);
        expect(id(a)).not.toBe(id(b));
        expect(a.find(`ellipse[fill="url(#${id(a)})"]`).exists()).toBe(true);
    });

    it("sits centred on a point inside another SVG at a size", () => {
        const svg = mount(GusterGlyph, {
            props: { x: 100, y: 50, size: 40 },
        }).get("svg");
        const width = 40 * GUSTER_SVG.aspect;
        expect(Number(svg.attributes("height"))).toBe(40);
        expect(Number(svg.attributes("width"))).toBeCloseTo(width);
        expect(Number(svg.attributes("x"))).toBeCloseTo(100 - width / 2);
        expect(Number(svg.attributes("y"))).toBe(30);
        expect(svg.classes()).not.toContain("guster-inline");
    });
});
