import { describe, expect, it } from "vitest";
import {
    CALM_STOPS,
    JACKPOT_CHANCE,
    LINGER,
    LINGER_WON,
    REEL_STOPS,
    SPINS,
    SYMBOLS,
    useTootSlots,
    WINNER,
} from "./useTootSlots.js";

/** A `random` that gives `values` in turn, then the last one forever. */
function sequence(...values) {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
}

/** Steps `seconds` in frames, gathering what happened. */
function run(game, seconds) {
    const events = [];
    for (let t = 0; t < seconds; t += 1 / 60) events.push(...game.step(1 / 60));
    return events;
}

// Just past the jackpot chance: the reels are left to their own luck.
const NO_JACKPOT = JACKPOT_CHANCE + 0.01;
// Picks the symbol at `index`.
const symbol = (index) => (index + 0.5) / SYMBOLS.length;

describe("useTootSlots", () => {
    it("spins on a pull, stopping the reels one by one, left to right", () => {
        const game = useTootSlots({ random: sequence(NO_JACKPOT, symbol(1)) });

        expect(game.pull()).toBe(true);
        expect(game.state.spinsLeft).toBe(SPINS - 1);
        expect(game.state.reels.every((reel) => reel.spinning)).toBe(true);

        const stops = run(game, REEL_STOPS[2] + 0.1).filter(
            (event) => event.type === "stop"
        );
        expect(stops.map((event) => event.reel)).toEqual([0, 1, 2]);
        expect(game.state.spinning).toBe(false);
    });

    it("wins with three Gusters in a row", () => {
        const game = useTootSlots({ random: sequence(0) });

        game.pull();
        const events = run(game, REEL_STOPS[2] + 0.1);

        expect(game.state.reels.map((reel) => reel.symbol)).toEqual([
            WINNER,
            WINNER,
            WINNER,
        ]);
        expect(events.at(-1)).toEqual({ type: "win" });
        expect(game.state.won).toBe(true);
        expect(game.state.score).toBe(1);
    });

    it("doesn't win on three of anything else", () => {
        const other = SYMBOLS.findIndex((name) => name !== WINNER);
        const game = useTootSlots({
            random: sequence(NO_JACKPOT, symbol(other)),
        });

        game.pull();
        const events = run(game, REEL_STOPS[2] + 0.1);

        expect(events.at(-1)).toEqual({ type: "lose" });
        expect(game.state.won).toBe(false);
        expect(game.state.score).toBe(0);
    });

    it("can't be pulled mid-spin", () => {
        const game = useTootSlots({ random: sequence(NO_JACKPOT, symbol(1)) });

        game.pull();
        expect(game.pull()).toBe(false);
        expect(game.state.spinsLeft).toBe(SPINS - 1);
    });

    it("is over a moment after the last spin, and won't pull again", () => {
        const game = useTootSlots({ random: sequence(0) });

        for (let i = 0; i < SPINS; i++) {
            game.pull();
            run(game, REEL_STOPS[2] + 0.1);
        }
        expect(game.pull()).toBe(false);
        expect(game.state.finished).toBe(false);

        // The last pull won, so it lingers the longer.
        expect(run(game, LINGER + 0.1)).toEqual([]);
        const events = run(game, LINGER_WON - LINGER);
        expect(events).toContainEqual({ type: "finish" });
        expect(game.state.finished).toBe(true);
        expect(game.state.score).toBe(SPINS);
    });

    it("stops sooner and doesn't roll under reduced motion", () => {
        const game = useTootSlots({
            random: sequence(NO_JACKPOT, symbol(1)),
            calm: true,
        });

        game.pull();
        game.step(CALM_STOPS[0] / 2);
        expect(game.state.reels.map((reel) => reel.symbol)).toEqual([
            WINNER,
            WINNER,
            WINNER,
        ]);

        run(game, CALM_STOPS[2] + 0.1);
        expect(game.state.spinning).toBe(false);
    });
});
