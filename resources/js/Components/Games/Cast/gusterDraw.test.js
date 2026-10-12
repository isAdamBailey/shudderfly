import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GUSTER_COLORS } from "@/constants/characters.js";
import {
    GUSTER_FRAME,
    GUSTER_GLOSS,
    GUSTER_SHAPES,
    GUSTER_SVG,
    GUSTER_VIEW,
    gusterFront,
    gusterParts,
    gusterSvgMarkup,
} from "./gusterDraw.js";

const of = (type) => GUSTER_SHAPES.filter((shape) => shape.type === type);

describe("Guster drawing", () => {
    it("is a lumpy body with two eyes, two pupils, two brows and a grimace", () => {
        const { body, face } = gusterParts();
        expect(body.length).toBeGreaterThanOrEqual(8);
        const count = (type) => face.filter((part) => part.type === type);
        expect(count("eye")).toHaveLength(2);
        expect(count("pupil")).toHaveLength(2);
        expect(count("brow")).toHaveLength(2);
        expect(count("mouth")).toHaveLength(1);
        expect(count("tooth").length).toBeGreaterThanOrEqual(4);
        expect(count("lip")).toHaveLength(1);
        expect(count("crease")).toHaveLength(2);
    });

    it("cuts his teeth straight on top with his lip", () => {
        const { face } = gusterParts();
        const teeth = face.filter((part) => part.type === "tooth");
        const [lip] = face.filter((part) => part.type === "lip");
        const top = Math.max(...teeth.map((t) => t.y + t.ry));
        // The lip's lower edge sits below the teeth's tops, covering them.
        expect(lip.y - lip.ry).toBeLessThan(top);
        expect(lip.y).toBeGreaterThan(top - lip.ry);
        const left = Math.min(...teeth.map((t) => t.x - t.rx));
        const right = Math.max(...teeth.map((t) => t.x + t.rx));
        expect(lip.x - lip.rx).toBeLessThan(left);
        expect(lip.x + lip.rx).toBeGreaterThan(right);
    });

    it("tapers his top into one thin stem", () => {
        const { body } = gusterParts();
        const top = [...body].sort((a, b) => b.y - a.y).slice(0, 3);
        // Each higher part is narrower, and the stem is far narrower than he.
        expect(top[0].rx).toBeLessThan(top[1].rx);
        expect(top[1].rx).toBeLessThan(top[2].rx);
        expect(top[1].rx * 2).toBeLessThan(GUSTER_FRAME.width * 0.1);
    });

    it("has uneven, worried eyes: his right the larger, brows up inside", () => {
        const [right, left] = gusterParts().face.filter(
            (part) => part.type === "eye"
        );
        expect(right.x).toBeLessThan(left.x);
        expect(right.rx * right.ry).toBeGreaterThan(left.rx * left.ry);

        const [rightBrow, leftBrow] = gusterParts().face.filter(
            (part) => part.type === "brow"
        );
        // Each brow rises toward the middle of his face.
        expect(rightBrow.rot).toBeGreaterThan(0);
        expect(leftBrow.rot).toBeLessThan(0);
        expect(rightBrow.y).toBeGreaterThan(right.y);
    });

    it("sits his face on the front of his body", () => {
        for (const part of gusterParts().face) {
            const front = gusterFront(part.x, part.y);
            // It shows in front of his body, and its back is sunk into it.
            expect(part.z + part.rz, part.type).toBeGreaterThan(front);
            expect(part.z - part.rz, part.type).toBeLessThan(front);
        }
    });

    it("sinks the ends of his wide mouth parts into his curve", () => {
        // The shade gap, the bar of teeth and his lip.
        const wide = gusterParts().face.filter(
            (part) =>
                ["mouth", "tooth", "lip"].includes(part.type) && part.rx > 0.1
        );
        expect(wide).toHaveLength(3);
        for (const part of wide) {
            for (const end of [-1, 1]) {
                const x = part.x + end * part.rx * 0.9;
                expect(part.z - part.rz, part.type).toBeLessThan(
                    gusterFront(x, part.y)
                );
            }
        }
    });

    it("takes his colours from GUSTER_COLORS", () => {
        const palette = Object.values(GUSTER_COLORS);
        for (const shape of GUSTER_SHAPES) {
            expect(palette, shape.type).toContain(shape.color);
        }
        for (const [, color] of GUSTER_GLOSS.stops) {
            expect(palette).toContain(color);
        }
    });

    it("stands on y = 0, his tip leaning to his left", () => {
        const blobs = of("blob");
        const lowest = Math.min(...blobs.map((shape) => shape.y - shape.ry));
        expect(lowest).toBeCloseTo(0);
        const tip = blobs.reduce((top, shape) =>
            shape.y + shape.ry > top.y + top.ry ? shape : top
        );
        expect(tip.x).toBeGreaterThan(
            (GUSTER_FRAME.minX + GUSTER_FRAME.maxX) / 2
        );
        // About as wide as he is tall.
        expect(GUSTER_FRAME.width / GUSTER_FRAME.height).toBeGreaterThan(0.8);
        expect(GUSTER_FRAME.width / GUSTER_FRAME.height).toBeLessThan(1.2);
    });

    it("draws his rim, then his body far to near, then his face", () => {
        const types = GUSTER_SHAPES.map((shape) => shape.type);
        expect(types.lastIndexOf("rim")).toBeLessThan(types.indexOf("blob"));
        expect(types.lastIndexOf("blob")).toBeLessThan(types.indexOf("eye"));
        expect(types.indexOf("eye")).toBeLessThan(types.indexOf("pupil"));
        expect(types.indexOf("pupil")).toBeLessThan(types.indexOf("brow"));

        const depths = of("blob").map((shape) => shape.z);
        expect(depths).toEqual([...depths].sort((a, b) => a - b));
        expect(of("blob").every((shape) => shape.glossy)).toBe(true);
        expect(of("brow").every((shape) => shape.glossy)).toBe(true);
        expect(of("lip").every((shape) => shape.glossy)).toBe(true);
        expect(of("eye").some((shape) => shape.glossy)).toBe(false);
    });

    it("outlines all of him but his smooth bottom", () => {
        const { body } = gusterParts();
        const bare = body.filter((part) => !part.rim);
        expect(bare.length).toBeGreaterThan(0);
        // Only the parts his bottom is made of go without a rim.
        for (const part of bare) expect(part.y - part.ry).toBeLessThan(0.05);
        expect(of("rim")).toHaveLength(body.length - bare.length);
        expect(of("rim").every((shape) => !shape.glossy)).toBe(true);
    });

    it("is seen nearly from the front", () => {
        expect(Math.abs(GUSTER_VIEW.yaw)).toBeLessThan(30);
    });

    it("turns the gloss back for each rotated glossy part", () => {
        const turned = GUSTER_SVG.ellipses.filter((e) => e.gloss);
        expect(turned.length).toBeGreaterThan(0);
        for (const e of turned) {
            expect(e.transform).toMatch(/^rotate\(/);
            const gloss = GUSTER_SVG.glosses.find((g) => g.suffix === e.gloss);
            const [, angle, at] = e.transform.match(/^rotate\((\S+) (.*)\)$/);
            expect(gloss.transform).toBe(`rotate(${-Number(angle)} ${at})`);
        }
        // Unturned glossy parts share the one plain gloss.
        expect(
            GUSTER_SVG.ellipses.some((e) => e.gloss === "" && !e.transform)
        ).toBe(true);
        expect(gusterSvgMarkup("g")).not.toContain("--");
    });

    it("gives both his drawers one ellipse per shape, in paint order", () => {
        expect(GUSTER_SVG.ellipses.map((e) => e.type)).toEqual(
            GUSTER_SHAPES.map((shape) => shape.type)
        );
        const markup = gusterSvgMarkup("g");
        expect(markup.match(/<ellipse /g)).toHaveLength(GUSTER_SHAPES.length);
        expect(markup).toContain(`viewBox="${GUSTER_SVG.viewBox}"`);
    });

    it("is pasted into the maintenance page as he is drawn here", () => {
        const page = readFileSync(
            resolve(process.cwd(), "resources/views/maintenance.blade.php"),
            "utf8"
        );
        expect(page).toContain(gusterSvgMarkup("maintenance-guster"));
        expect(page).not.toContain("💩");
    });
});
