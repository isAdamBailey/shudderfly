import { reactive } from "vue";

/** How many pulls of the lever a round gives. */
export const SPINS = 10;

/** What the reels show: cast members. Three of WINNER in a row wins. */
export const SYMBOLS = ["guster", "butt", "toilet", "pizza", "cockroach"];
export const WINNER = "guster";

/** How often a pull is made a win outright, on top of the reels' own luck
 * (1 in 125): it's a game for kids, so wins come round every few pulls. */
export const JACKPOT_CHANCE = 0.2;

/** Seconds after a pull that each reel stops, left to right; under reduced
 * motion they stop sooner. */
export const REEL_STOPS = [0.7, 1.1, 1.5];
export const CALM_STOPS = [0.2, 0.4, 0.6];

/** Seconds a spinning reel shows each symbol as it rolls by. */
export const ROLL_EVERY = 0.08;

/** Seconds the last pull's reels stay up before the round is over; longer
 * after a win, so "You win!" is said before the score is. */
export const LINGER = 1.6;
export const LINGER_WON = 3.5;

/**
 * Toot Slots, headless: a pull of the lever spins three reels, which stop
 * one by one; three Gusters in a row is a win. The round is SPINS pulls.
 * Driven by `step(dt)`, which returns what happened in it ({ type: "stop",
 * reel } as each reel stops, then "win" or "lose", and "finish" once the
 * round is over) for the drawer to sound; tested without a DOM.
 *
 * Options: `random` (0..1, Math.random by default) picks what comes up;
 * `calm` stops the reels sooner and keeps them from rolling (reduced motion).
 */
export function useTootSlots({ random = Math.random, calm = false } = {}) {
    const pick = () => SYMBOLS[Math.floor(random() * SYMBOLS.length)];
    const stops = calm ? CALM_STOPS : REEL_STOPS;

    const state = reactive({
        reels: [WINNER, WINNER, WINNER].map((symbol) => ({
            symbol,
            spinning: false,
        })),
        spinsLeft: SPINS,
        score: 0,
        spinning: false,
        // Seconds since the last pull.
        elapsed: 0,
        // Whether the last pull won: null before the first one stops.
        won: null,
        finished: false,
    });
    // What the reels land on, chosen as the lever is pulled.
    let landing = [];
    let rolled = 0;
    let lingering = null;

    /** Whether the lever can be pulled: not mid-spin, nor with none left. */
    const canPull = () => !state.spinning && state.spinsLeft > 0;

    /** Pulls the lever, if it can be. */
    function pull() {
        if (!canPull()) return false;
        landing =
            random() < JACKPOT_CHANCE
                ? [WINNER, WINNER, WINNER]
                : state.reels.map(pick);
        state.spinsLeft--;
        state.spinning = true;
        state.elapsed = 0;
        state.won = null;
        rolled = 0;
        state.reels.forEach((reel) => (reel.spinning = true));
        return true;
    }

    function step(dt) {
        if (state.finished) return [];
        const events = [];

        if (lingering !== null) {
            lingering -= dt;
            if (lingering <= 0) {
                state.finished = true;
                events.push({ type: "finish" });
            }
            return events;
        }
        if (!state.spinning) return events;

        state.elapsed += dt;
        // Spinning reels roll through the symbols, unless kept still.
        rolled += dt;
        const roll = !calm && rolled >= ROLL_EVERY;
        if (roll) rolled = 0;

        state.reels.forEach((reel, i) => {
            if (!reel.spinning) return;
            if (state.elapsed >= stops[i]) {
                reel.spinning = false;
                reel.symbol = landing[i];
                events.push({ type: "stop", reel: i });
            } else if (roll) {
                const at = SYMBOLS.indexOf(reel.symbol);
                reel.symbol = SYMBOLS[(at + 1) % SYMBOLS.length];
            }
        });

        if (state.reels.every((reel) => !reel.spinning)) {
            state.spinning = false;
            state.won = state.reels.every((reel) => reel.symbol === WINNER);
            if (state.won) state.score++;
            events.push({ type: state.won ? "win" : "lose" });
            if (state.spinsLeft === 0) {
                lingering = state.won ? LINGER_WON : LINGER;
            }
        }
        return events;
    }

    return { state, step, pull, canPull };
}
