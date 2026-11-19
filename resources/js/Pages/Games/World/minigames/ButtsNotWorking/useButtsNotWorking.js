import { reactive } from "vue";

/** How long a round lasts, in seconds. */
export const ROUND_SECONDS = 45;

/** The tools in the toolbox, in the order they're laid out. */
export const TOOLS = ["hammer", "saw", "wrench", "screwdriver", "plunger"];

/** How many right tools it takes to get one poop out. */
export const FIXES_PER_POOP = 6;

/** Seconds the tools rest after each tap: a right tool at work, a wrong one
 * bouncing off, and the poop flying out once it's fixed. */
export const WORK_SECONDS = 0.45;
export const OOPS_SECONDS = 0.9;
export const FREED_SECONDS = 2.8;

/**
 * Butts Not Working, headless: the Butt's poop is stuck, and it asks for a
 * tool from the toolbox (`need`, never the same tool twice running, so a
 * watcher on it hears each ask). The right one is a fix; FIXES_PER_POOP
 * fixes and the poop pops out (a point), and the next one gets stuck. A
 * wrong tool pushes it back in a fix and costs a moment. While the tools
 * rest after a right one, `need` is still the tool at work. The round ends
 * after ROUND_SECONDS.
 *
 * `use(tool)` is a tap on a tool, and says at once what it did ("fix",
 * "freed", "oops", or null while the tools rest), so the drawer can sound
 * it in the tap. `step(dt)` runs the clock, and returns true once the
 * round is over; tested without a DOM.
 *
 * Options: `random` (0..1, Math.random by default) picks the tools asked for.
 */
export function useButtsNotWorking({ random = Math.random } = {}) {
    const state = reactive({
        // The tool the Butt is asking for.
        need: null,
        // Right tools on this poop so far.
        fixes: 0,
        score: 0,
        // "fixing" (tap a tool), "working", "oops" or "freed".
        phase: "fixing",
        timeLeft: ROUND_SECONDS,
        finished: false,
    });
    let resting = 0;

    function ask() {
        const choices = TOOLS.filter((tool) => tool !== state.need);
        state.need = choices[Math.floor(random() * choices.length)];
    }
    ask();

    function rest(phase, seconds) {
        state.phase = phase;
        resting = seconds;
    }

    /** Taps `tool`: what it did, or null if the tools are resting. */
    function use(tool) {
        if (state.finished || state.phase !== "fixing") return null;
        if (tool !== state.need) {
            state.fixes = Math.max(0, state.fixes - 1);
            rest("oops", OOPS_SECONDS);
            return "oops";
        }
        state.fixes++;
        if (state.fixes < FIXES_PER_POOP) {
            rest("working", WORK_SECONDS);
            return "fix";
        }
        state.score++;
        rest("freed", FREED_SECONDS);
        return "freed";
    }

    function step(dt) {
        if (state.finished) return true;

        state.timeLeft = Math.max(0, state.timeLeft - dt);
        if (state.timeLeft === 0) {
            state.finished = true;
            return true;
        }

        if (state.phase !== "fixing") {
            resting -= dt;
            if (resting > 0) return false;
            if (state.phase === "freed") state.fixes = 0;
            // A wrong tool leaves the ask as it was; a fix asks anew.
            if (state.phase !== "oops") ask();
            state.phase = "fixing";
        }
        return false;
    }

    return { state, step, use };
}
