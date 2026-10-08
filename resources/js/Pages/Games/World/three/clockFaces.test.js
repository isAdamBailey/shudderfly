import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLOCK_FACES, paintClock } from "./clockFaces.js";

function recorder() {
    const calls = [];
    const fills = [];
    const gradient = { addColorStop() {} };
    const ctx = {
        canvas: { width: 128, height: 128 },
        calls,
        fills,
        createLinearGradient: () => gradient,
    };
    for (const name of [
        "clearRect",
        "beginPath",
        "arc",
        "fill",
        "stroke",
        "moveTo",
        "lineTo",
        "closePath",
        "quadraticCurveTo",
        "ellipse",
        "rect",
        "fillRect",
        "strokeRect",
        "roundRect",
        "save",
        "restore",
        "clip",
    ]) {
        ctx[name] = () => calls.push(name);
    }
    let fill = null;
    Object.defineProperty(ctx, "fillStyle", {
        set(value) {
            fill = value;
            fills.push(typeof value === "string" ? value : "gradient");
        },
        get() {
            return fill;
        },
    });
    return ctx;
}

describe("clock faces", () => {
    it("matches the faces the server's clocks may wear", () => {
        const php = readFileSync(
            `${process.cwd()}/app/Support/GamesWorld.php`,
            "utf8"
        );
        const names = php
            .match(/const CLOCKS = \[([^\]]*)\]/)[1]
            .match(/'([a-z]+)'/g)
            .map((name) => name.slice(1, -1));

        expect(names).toEqual(CLOCK_FACES);
    });

    it("paints each face as its own shape", () => {
        const painted = CLOCK_FACES.map((face) => {
            const ctx = recorder();
            paintClock(ctx, face);
            expect(ctx.calls).toContain("clearRect");
            expect(ctx.calls).toContain("arc");
            return ctx.fills.join(" ");
        });

        expect(new Set(painted).size).toBe(CLOCK_FACES.length);
        expect(() => paintClock(recorder(), "sundial")).toThrow(
            /Unknown clock/
        );
    });
});
