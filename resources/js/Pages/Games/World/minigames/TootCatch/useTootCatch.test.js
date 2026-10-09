import { describe, expect, it } from "vitest";
import { TOOT_FOODS } from "@/constants/characters.js";
import {
    BUTT_SPEED,
    BUTT_Y,
    CALM,
    CATCH_REACH,
    ROUND_SECONDS,
    useTootCatch,
} from "./useTootCatch.js";

/** Steps `game` for `seconds` in 1/60 s frames, collecting what happened. */
function run(game, seconds) {
    const events = [];
    for (let t = 0; t < seconds; t += 1 / 60) {
        events.push(...game.step(1 / 60));
    }
    return events;
}

/** A game whose foods all drop in the middle, as `food` (an index into
 * TOOT_FOODS). */
function middleGame(food = 0, options = {}) {
    const picks = [food / TOOT_FOODS.length, 0.5];
    let n = 0;
    return useTootCatch({ random: () => picks[n++ % 2], ...options });
}

describe("useTootCatch", () => {
    it("drops Toot Foods from the top", () => {
        const game = middleGame(2);
        run(game, 1);

        expect(game.state.foods).toHaveLength(1);
        expect(game.state.foods[0].type).toBe(TOOT_FOODS[2].type);
        expect(game.state.foods[0].x).toBeCloseTo(0.5);
        expect(game.state.foods[0].y).toBeLessThan(BUTT_Y);
    });

    it("catches a food that falls onto the Butt, and says which", () => {
        const game = middleGame(3);
        const events = run(game, 5);

        const caught = events.filter((e) => e.type === "catch");
        expect(caught.length).toBeGreaterThan(0);
        expect(caught[0].food.type).toBe(TOOT_FOODS[3].type);
        expect(game.state.score).toBe(caught.length);
        expect(events.some((e) => e.type === "miss")).toBe(false);
    });

    it("misses a food that falls past the Butt", () => {
        const game = middleGame();
        game.slideTo(0.5 + CATCH_REACH * 3);
        const events = run(game, 5);

        expect(events.some((e) => e.type === "miss")).toBe(true);
        expect(game.state.score).toBe(0);
    });

    it("slides the Butt after a finger at its own pace", () => {
        const game = middleGame();
        game.slideTo(1);
        run(game, 0.1);

        expect(game.state.butt.x).toBeCloseTo(0.5 + BUTT_SPEED * 0.1, 1);
        run(game, 1);
        expect(game.state.butt.x).toBe(1);

        game.slideTo(-5);
        run(game, 2);
        expect(game.state.butt.x).toBe(0);
    });

    it("walks on the arrow keys and stops when they are let go", () => {
        const game = middleGame();
        game.hold(-1);
        run(game, 0.2);
        const x = game.state.butt.x;
        expect(x).toBeLessThan(0.5);

        game.hold(0);
        run(game, 0.2);
        expect(game.state.butt.x).toBe(x);
    });

    it("ends after a round, clearing the field", () => {
        const game = middleGame();
        run(game, ROUND_SECONDS - 0.5);
        expect(game.state.finished).toBe(false);

        run(game, 1);
        expect(game.state.finished).toBe(true);
        expect(game.state.timeLeft).toBe(0);
        expect(game.state.foods).toEqual([]);
        expect(game.step(1)).toEqual([]);
    });

    it("falls slower when calm (reduced motion)", () => {
        const brisk = middleGame();
        const calm = middleGame(0, { calm: true });
        run(brisk, 1);
        run(calm, 1);

        expect(calm.state.foods[0].y).toBeCloseTo(
            brisk.state.foods[0].y * CALM
        );
    });
});
