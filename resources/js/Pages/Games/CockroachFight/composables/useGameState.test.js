import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGameState } from "./useGameState.js";

describe("CockroachFight useGameState", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
    });

    it("moves both cockroaches toward each other on tap", () => {
        const { state, tap } = useGameState();
        state.phase = "playing";

        const leftBefore = state.leftX;
        const rightBefore = state.rightX;

        tap("left");

        expect(state.tapCount).toBe(1);
        expect(state.leftX).toBeGreaterThan(leftBefore);
        expect(state.rightX).toBeLessThan(rightBefore);
    });

    it("enters fighting phase when cockroaches collide", () => {
        const { state, tap, startGame } = useGameState();
        startGame();

        state.leftX = 44;
        state.rightX = 56;

        tap("right");

        expect(state.phase).toBe("fighting");
        expect(state.leftFighting).toBe(true);
        expect(state.rightFighting).toBe(true);
        expect(state.rightX - state.leftX).toBe(8);
    });

    it("transitions to win with score after fight duration", () => {
        const { state, tap, startGame } = useGameState();
        startGame();

        state.leftX = 44;
        state.rightX = 56;
        tap("left");

        vi.advanceTimersByTime(2500);

        expect(state.phase).toBe("win");
        expect(state.score).toBe(560);
    });

    it("awards more stars for fewer taps", () => {
        const { state, stars, startGame } = useGameState();
        startGame();

        state.tapCount = 5;
        expect(stars.value).toBe(3);

        state.tapCount = 10;
        expect(stars.value).toBe(2);

        state.tapCount = 20;
        expect(stars.value).toBe(1);
    });
});
