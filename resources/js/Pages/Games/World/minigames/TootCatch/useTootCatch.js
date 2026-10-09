import { reactive } from "vue";
import { TOOT_FOODS } from "@/constants/characters.js";
import { approach } from "@/utils/math";

// The field is 0..1 across and 0..1 down (the top is 0), whatever its size
// on screen, so the game plays the same on a phone and a laptop.

/** How long a round lasts, in seconds. */
export const ROUND_SECONDS = 30;

/** Where the Butt stands, down the field. */
export const BUTT_Y = 0.86;

/** How near (across) a food must pass the Butt to be caught. */
export const CATCH_REACH = 0.1;

/** How fast the Butt slides, in fields a second: after a finger, and on the
 * arrow keys. */
export const BUTT_SPEED = 1.6;

/** A food's fall, in fields a second, at the start of a round and at its
 * end: the round speeds up. */
export const FALL = { from: 0.3, to: 0.55 };

/** Seconds between foods, at the start of a round and at its end. */
export const DROP_EVERY = { from: 1.1, to: 0.55 };

/** Under reduced motion everything falls this much slower. */
export const CALM = 0.7;

// Foods drop clear of the edges, so every one can be caught.
const EDGE = 0.08;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const lerp = (range, at) => range.from + (range.to - range.from) * at;

/**
 * Toot Catch, headless: Toot Foods fall, the Butt slides along the bottom
 * to catch them, and the round ends after ROUND_SECONDS. Driven by
 * `step(dt)`, which returns what happened in it ({ type: "catch" | "miss",
 * food }) for the drawer to toot and puff at; tested without a DOM.
 *
 * Options: `random` (0..1, Math.random by default) picks the foods and where
 * they drop; `calm` slows the fall (reduced motion).
 */
export function useTootCatch({ random = Math.random, calm = false } = {}) {
    const state = reactive({
        butt: { x: 0.5, target: 0.5 },
        foods: [],
        score: 0,
        timeLeft: ROUND_SECONDS,
        finished: false,
    });
    // Held arrow keys: -1, 0 or 1.
    let held = 0;
    let untilDrop = 0.6;
    let nextId = 0;
    const pace = calm ? CALM : 1;

    /** Slides the Butt toward `x` (0..1 across), e.g. under a finger. */
    function slideTo(x) {
        held = 0;
        state.butt.target = clamp01(x);
    }

    /** An arrow key held (-1 left, 1 right) or let go (0). */
    function hold(direction) {
        held = direction;
        if (!direction) state.butt.target = state.butt.x;
    }

    function drop() {
        const food = TOOT_FOODS[Math.floor(random() * TOOT_FOODS.length)];
        state.foods.push({
            id: ++nextId,
            type: food.type,
            x: EDGE + random() * (1 - 2 * EDGE),
            y: 0,
        });
    }

    function step(dt) {
        if (state.finished) return [];
        const events = [];
        // How far through the round, 0..1: it speeds up as it goes.
        const through = 1 - state.timeLeft / ROUND_SECONDS;

        if (held) state.butt.target = clamp01(state.butt.x + held);
        state.butt.x = approach(state.butt.x, state.butt.target, BUTT_SPEED * dt);

        const fall = lerp(FALL, through) * pace * dt;
        state.foods = state.foods.filter((food) => {
            const before = food.y;
            food.y += fall;
            // Caught as it passes the Butt, not only if a frame lands on it.
            if (
                before < BUTT_Y &&
                food.y >= BUTT_Y &&
                Math.abs(food.x - state.butt.x) <= CATCH_REACH
            ) {
                state.score++;
                events.push({ type: "catch", food });
                return false;
            }
            if (food.y > 1) {
                events.push({ type: "miss", food });
                return false;
            }
            return true;
        });

        state.timeLeft = Math.max(0, state.timeLeft - dt);
        if (state.timeLeft === 0) {
            // The last foods vanish rather than fall into an empty round.
            state.foods = [];
            state.finished = true;
            return events;
        }

        untilDrop -= dt;
        if (untilDrop <= 0) {
            drop();
            untilDrop = lerp(DROP_EVERY, through) / pace;
        }
        return events;
    }

    return { state, step, slideTo, hold };
}
