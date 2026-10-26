import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { PATH_POINTS } from "./intestinePath.js";
import { useGameState } from "./useGameState.js";

function play() {
    let game;
    mount({
        setup() {
            game = useGameState();
            return () => null;
        },
    });
    game.startGame();
    return game;
}

// Steers along the middle of the tube, a sample at a time.
function followTube(game) {
    for (const p of PATH_POINTS.slice(1)) {
        game.movePoop(p.x - game.state.poopX, p.y - game.state.poopY);
        if (game.state.phase === "win") break;
    }
}

describe("the intestine run", () => {
    it("starts at the top of the tube", () => {
        const { state, progress } = play();

        expect(state.poopX).toBe(PATH_POINTS[0].x);
        expect(state.poopY).toBe(PATH_POINTS[0].y);
        expect(progress.value).toBe(0);
    });

    it("holds the poop against a wall and counts the bump", () => {
        const { state, movePoop, POOP_RADIUS } = play();

        movePoop(80, 0);

        const centre = PATH_POINTS[state.pathIndex];
        expect(
            Math.hypot(state.poopX - centre.x, state.poopY - centre.y)
        ).toBeCloseTo(centre.hw - POOP_RADIUS);
        expect(state.collisions).toBe(1);
    });

    it("counts pressing along a wall as one bump", () => {
        vi.useFakeTimers();
        const { state, movePoop } = play();

        for (let i = 0; i < 10; i++) {
            movePoop(20, 0);
            vi.advanceTimersByTime(500);
        }
        expect(state.collisions).toBe(1);

        movePoop(-30, 0);
        movePoop(60, 0);
        expect(state.collisions).toBe(2);
        vi.useRealTimers();
    });

    it("cannot be pushed through a wall into the next coil", () => {
        const game = play();
        // Into the first run across, then shove hard straight down at the
        // run below it.
        for (const p of PATH_POINTS.slice(1, 60)) {
            game.movePoop(p.x - game.state.poopX, p.y - game.state.poopY);
        }
        const before = game.state.pathIndex;

        for (let i = 0; i < 20; i++) game.movePoop(0, 40);

        expect(Math.abs(game.state.pathIndex - before)).toBeLessThan(20);
    });

    it("comes out the end with full marks when it never touches a wall", () => {
        const game = play();

        followTube(game);

        expect(game.state.phase).toBe("win");
        expect(game.state.collisions).toBe(0);
        expect(game.state.score).toBe(1000);
        expect(game.progress.value).toBeGreaterThan(0.99);
    });
});
