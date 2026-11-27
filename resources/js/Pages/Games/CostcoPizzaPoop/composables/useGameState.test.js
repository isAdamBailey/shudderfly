import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PATH_POINTS } from "./intestinePath.js";
import { useGameState } from "./useGameState.js";

function play({ clock = true } = {}) {
    let game;
    mount({
        setup() {
            game = useGameState();
            return () => null;
        },
    });
    game.startGame();
    if (clock) game.startClock();
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
    afterEach(() => vi.useRealTimers());

    it("starts at the top of the tube", () => {
        const { state, progress } = play();

        expect(state.poopX).toBe(PATH_POINTS[0].x);
        expect(state.poopY).toBe(PATH_POINTS[0].y);
        expect(progress.value).toBe(0);
    });

    it("holds the poop against a wall", () => {
        const { state, movePoop, POOP_RADIUS } = play();

        movePoop(80, 0);

        const centre = PATH_POINTS[state.pathIndex];
        expect(
            Math.hypot(state.poopX - centre.x, state.poopY - centre.y)
        ).toBeCloseTo(centre.hw - POOP_RADIUS);
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

    it("comes out the end with full marks when it takes no time, walls or not", () => {
        vi.useFakeTimers();
        const game = play();

        for (let i = 0; i < 5; i++) game.movePoop(80, 0);
        followTube(game);

        expect(game.state.phase).toBe("win");
        expect(game.state.score).toBe(1000);
        expect(game.progress.value).toBeGreaterThan(0.99);
    });

    it("scores less the longer it takes, down to a floor", () => {
        vi.useFakeTimers();
        const quick = play();
        vi.advanceTimersByTime(30000);
        followTube(quick);
        expect(quick.state.score).toBe(700);

        const slow = play();
        vi.advanceTimersByTime(600000);
        followTube(slow);
        expect(slow.state.score).toBe(100);
    });

    it("keeps the clock still until it is started", () => {
        vi.useFakeTimers();
        const game = play({ clock: false });
        vi.advanceTimersByTime(5000);
        expect(game.elapsedSeconds.value).toBe(0);

        game.startClock();
        vi.advanceTimersByTime(3000);
        expect(game.elapsedSeconds.value).toBe(3);
    });
});
