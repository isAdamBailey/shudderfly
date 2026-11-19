import { describe, expect, it } from "vitest";
import {
    FIXES_PER_POOP,
    FREED_SECONDS,
    OOPS_SECONDS,
    ROUND_SECONDS,
    TOOLS,
    WORK_SECONDS,
    useButtsNotWorking,
} from "./useButtsNotWorking.js";

const play = () => useButtsNotWorking({ random: () => 0 });

describe("useButtsNotWorking", () => {
    it("asks for a tool from the toolbox at once", () => {
        const game = play();
        expect(TOOLS).toContain(game.state.need);
        expect(game.state.phase).toBe("fixing");
    });

    it("frees the poop after enough right tools, then asks anew", () => {
        const game = play();
        for (let fix = 1; fix < FIXES_PER_POOP; fix++) {
            const asked = game.state.need;
            expect(game.use(asked)).toBe("fix");
            expect(game.state.fixes).toBe(fix);
            // The tools rest while the last one works, still the one asked.
            expect(game.use(asked)).toBeNull();
            expect(game.state.need).toBe(asked);
            expect(game.step(WORK_SECONDS + 0.01)).toBe(false);
            expect(game.state.need).not.toBe(asked);
        }
        expect(game.use(game.state.need)).toBe("freed");
        expect(game.state.score).toBe(1);

        game.step(FREED_SECONDS + 0.01);
        expect(game.state.phase).toBe("fixing");
        expect(game.state.fixes).toBe(0);
    });

    it("a wrong tool costs a moment and keeps the ask", () => {
        const game = play();
        const asked = game.state.need;
        const wrong = TOOLS.find((tool) => tool !== asked);

        expect(game.use(wrong)).toBe("oops");
        expect(game.state.fixes).toBe(0);
        expect(game.use(asked)).toBeNull();

        game.step(OOPS_SECONDS + 0.01);
        expect(game.state.need).toBe(asked);
        expect(game.use(asked)).toBe("fix");
    });

    it("a wrong tool pushes the poop back in a fix", () => {
        const game = play();
        game.use(game.state.need);
        game.step(WORK_SECONDS + 0.01);
        game.use(game.state.need);
        game.step(WORK_SECONDS + 0.01);
        expect(game.state.fixes).toBe(2);

        game.use(TOOLS.find((tool) => tool !== game.state.need));
        expect(game.state.fixes).toBe(1);
    });

    it("never asks for the same tool twice running", () => {
        const game = useButtsNotWorking();
        for (let i = 0; i < 30; i++) {
            const asked = game.state.need;
            // Only as long as the tools rest, so the round lasts the loop.
            const did = game.use(asked);
            game.step((did === "freed" ? FREED_SECONDS : WORK_SECONDS) + 0.01);
            expect(game.state.need).not.toBe(asked);
        }
    });

    it("ends after the round, and takes no more taps", () => {
        const game = play();
        expect(game.step(ROUND_SECONDS)).toBe(true);
        expect(game.state.finished).toBe(true);
        expect(game.use(game.state.need)).toBeNull();
        expect(game.step(1)).toBe(true);
    });
});
