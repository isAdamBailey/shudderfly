import { describe, expect, it } from "vitest";
import {
    CAST_MOVE_DATA,
    castMovesCss,
    installCastMoves,
    LANDING,
    sampleMove,
    stillPose,
} from "./castMoveData.js";

describe("the cast's move data", () => {
    it("loops an ongoing move and holds a one-shot's last frame", () => {
        const idle = CAST_MOVE_DATA.idle;
        expect(sampleMove(idle, idle.duration / 2).ty).toBeCloseTo(-6);
        expect(sampleMove(idle, idle.duration * 1.5).ty).toBeCloseTo(-6);

        const toot = CAST_MOVE_DATA.toot;
        expect(sampleMove(toot, toot.duration * 0.3).sx).toBeCloseTo(1.18);
        expect(sampleMove(toot, toot.duration * 5)).toMatchObject({
            sx: 1,
            sy: 1,
        });
    });

    it("eases between frames the way CSS does", () => {
        // ease-in-out is slow at the start: well short of linear at 1/4.
        const hop = CAST_MOVE_DATA.hop;
        const quarter = sampleMove(hop, hop.duration / 8).ty;
        expect(quarter).toBeLessThan(0);
        expect(quarter).toBeGreaterThan(-5 * 0.5);

        // linear spins evenly.
        const thrown = CAST_MOVE_DATA.thrown;
        expect(sampleMove(thrown, thrown.duration / 4).rot).toBeCloseTo(90);
    });

    it("beats the shadow in step with a move that leaves the ground", () => {
        const bounce = CAST_MOVE_DATA.bounce;
        expect(sampleMove(bounce, bounce.duration / 2).shadow).toBeCloseTo(
            0.65
        );
        expect(sampleMove(CAST_MOVE_DATA.wiggle, 0.1).shadow).toBe(1);
    });

    it("stills every move under reduced motion, keeping a state change", () => {
        expect(stillPose(CAST_MOVE_DATA.idle)).toMatchObject({ ty: 0, sx: 1 });
        expect(stillPose(CAST_MOVE_DATA.excited)).toMatchObject({
            sx: 1.15,
            sy: 1.15,
        });
    });

    it("writes one class per move, plus the landing squash", () => {
        const css = castMovesCss();
        for (const name of Object.keys(CAST_MOVE_DATA)) {
            expect(css).toContain(`.cast-move-${name} .cast-body {`);
            expect(css).toContain(`@keyframes cast-${name} {`);
        }
        expect(css).toContain(".cast-landing .cast-squash");
        expect(css).toContain(`cast-land ${LANDING.duration}s`);
        expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    });

    it("offsets only looping moves by --cast-delay", () => {
        const css = castMovesCss();
        expect(css).toMatch(
            /\.cast-move-idle \.cast-body \{[^}]*var\(--cast-delay/
        );
        expect(css).not.toMatch(
            /\.cast-move-toot \.cast-body \{[^}]*var\(--cast-delay/
        );
    });

    it("installs its stylesheet once", () => {
        installCastMoves();
        installCastMoves();
        expect(document.querySelectorAll("style#cast-moves")).toHaveLength(1);
    });
});
